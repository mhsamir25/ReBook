-- 014_cart_and_listing_wishlists.sql

-- 1. Drop old wishlists
DROP TABLE IF EXISTS core.wishlists CASCADE;

-- Also drop trigger that relies on isbn wishlist
DROP TRIGGER IF EXISTS trg_notify_wishlist ON core.listings;
DROP FUNCTION IF EXISTS core.fn_notify_wishlist_match() CASCADE;

-- 2. Create new wishlists on listing_id
CREATE TABLE core.wishlists (
    user_id  UUID NOT NULL REFERENCES core.users(user_id),
    listing_id UUID NOT NULL REFERENCES core.listings(listing_id),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, listing_id)
);

-- 3. Create carts table
CREATE TABLE core.carts (
    user_id  UUID NOT NULL REFERENCES core.users(user_id),
    listing_id UUID NOT NULL REFERENCES core.listings(listing_id),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, listing_id)
);

-- 4. Trigger to remove from cart and wishlist if listing is sold
CREATE OR REPLACE FUNCTION core.trg_remove_sold_listings_from_cart()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sold' AND OLD.status <> 'sold' THEN
        DELETE FROM core.carts WHERE listing_id = NEW.listing_id;
        DELETE FROM core.wishlists WHERE listing_id = NEW.listing_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_status_update
AFTER UPDATE OF status ON core.listings
FOR EACH ROW
EXECUTE FUNCTION core.trg_remove_sold_listings_from_cart();

-- 5. API Functions for Cart
CREATE OR REPLACE FUNCTION api.add_to_cart(p_user_id UUID, p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    -- Only add if listing is available
    IF NOT EXISTS (SELECT 1 FROM core.listings WHERE listing_id = p_listing_id AND status = 'available') THEN
        RAISE EXCEPTION 'Listing is not available' USING ERRCODE = 'P0003';
    END IF;

    INSERT INTO core.carts(user_id, listing_id)
    VALUES (p_user_id, p_listing_id)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION api.remove_from_cart(p_user_id UUID, p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    DELETE FROM core.carts WHERE user_id = p_user_id AND listing_id = p_listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.get_cart(p_user_id UUID)
RETURNS TABLE (
    listing_id UUID,
    isbn isbn13,
    title TEXT,
    author TEXT,
    genre TEXT,
    status listing_status,
    price money_amount,
    daily_rent_fee money_amount,
    type listing_type,
    added_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, api, public, pg_temp
AS $$
    SELECT c.listing_id, l.isbn, b.title, b.author, g.name AS genre,
           l.status, l.price, l.daily_rent_fee, l.type, c.added_at
    FROM core.carts c
    JOIN core.listings l ON l.listing_id = c.listing_id
    JOIN core.books b ON b.isbn = l.isbn
    JOIN core.genres g ON g.genre_id = b.genre_id
    WHERE c.user_id = p_user_id
    ORDER BY c.added_at DESC;
$$;

-- 6. Update API Functions for Wishlist
CREATE OR REPLACE FUNCTION api.add_to_wishlist(p_user_id UUID, p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    INSERT INTO core.wishlists(user_id, listing_id)
    VALUES (p_user_id, p_listing_id)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION api.remove_from_wishlist(p_user_id UUID, p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    DELETE FROM core.wishlists WHERE user_id = p_user_id AND listing_id = p_listing_id;
END;
$$;

DROP FUNCTION IF EXISTS api.get_wishlist(UUID);

CREATE OR REPLACE FUNCTION api.get_wishlist(p_user_id UUID)
RETURNS TABLE (
    listing_id UUID,
    isbn isbn13,
    title TEXT,
    author TEXT,
    genre TEXT,
    status listing_status,
    price money_amount,
    daily_rent_fee money_amount,
    type listing_type,
    added_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, api, public, pg_temp
AS $$
    SELECT w.listing_id, l.isbn, b.title, b.author, g.name AS genre,
           l.status, l.price, l.daily_rent_fee, l.type, w.added_at
    FROM core.wishlists w
    JOIN core.listings l ON l.listing_id = w.listing_id
    JOIN core.books b ON b.isbn = l.isbn
    JOIN core.genres g ON g.genre_id = b.genre_id
    WHERE w.user_id = p_user_id
    ORDER BY w.added_at DESC;
$$;
