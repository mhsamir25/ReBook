-- 014_suspicious_listings.sql
-- Adds is_suspicious flag to listings, updates defaults, and replaces create_listing.

-- 1. Insert generic genre
INSERT INTO core.genres (name) VALUES ('Unknown') ON CONFLICT DO NOTHING;

-- 2. Alter listings table
ALTER TABLE core.listings ADD COLUMN is_suspicious BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE core.listings ALTER COLUMN status SET DEFAULT 'available';

-- 3. Replace create_listing function
DROP FUNCTION IF EXISTS api.create_listing(UUID, isbn13, SMALLINT, listing_type, money_amount, money_amount, SMALLINT);

CREATE OR REPLACE FUNCTION api.create_listing(
    p_seller_id     UUID,
    p_isbn          isbn13,
    p_condition_id  SMALLINT,
    p_type          listing_type,
    p_price         money_amount DEFAULT NULL,
    p_daily_rent_fee money_amount DEFAULT NULL,
    p_max_lend_days SMALLINT DEFAULT NULL,
    p_title         TEXT DEFAULT 'Unknown Title',
    p_author        TEXT DEFAULT 'Unknown Author',
    p_is_suspicious BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_listing_id UUID;
    v_genre_id SMALLINT;
BEGIN
    -- Validate seller exists, has user role, and is verified
    PERFORM 1 FROM core.users
    WHERE user_id = p_seller_id
      AND role = 'user'
      AND is_verified = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only verified sellers can create listings' USING ERRCODE = 'P0010';
    END IF;

    -- Upsert book if it does not exist
    PERFORM 1 FROM core.books WHERE isbn = p_isbn;
    IF NOT FOUND THEN
        SELECT genre_id INTO v_genre_id FROM core.genres WHERE name = 'Unknown';
        IF NOT FOUND THEN
            INSERT INTO core.genres(name) VALUES ('Unknown') RETURNING genre_id INTO v_genre_id;
        END IF;

        INSERT INTO core.books(isbn, title, author, genre_id)
        VALUES (p_isbn, p_title, p_author, v_genre_id);
    END IF;

    -- Insert the listing with the specific status and is_suspicious flag
    INSERT INTO core.listings(seller_id, isbn, condition_id, type, price, daily_rent_fee, max_lend_days, status, is_suspicious)
    VALUES (p_seller_id, p_isbn, p_condition_id, p_type, p_price, p_daily_rent_fee, p_max_lend_days, 'available', p_is_suspicious)
    RETURNING listing_id INTO v_listing_id;

    RETURN v_listing_id;
END;
$$;

-- 4. Repurpose pending listings to suspicious listings for admin
DROP FUNCTION IF EXISTS api.admin_get_pending_listings(UUID);

CREATE OR REPLACE FUNCTION api.admin_get_suspicious_listings(p_admin_id UUID)
RETURNS TABLE(
    listing_id     UUID,
    seller_email   CITEXT,
    isbn           isbn13,
    title          TEXT,
    type           listing_type,
    price          money_amount,
    daily_rent_fee money_amount,
    is_suspicious  BOOLEAN,
    created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    IF (SELECT u.role FROM core.users u WHERE u.user_id = p_admin_id) <> 'admin' THEN
        RAISE EXCEPTION 'Not authorized — admin role required' USING ERRCODE = 'P0403';
    END IF;

    RETURN QUERY
    SELECT l.listing_id, u.email, l.isbn, b.title, l.type, l.price, l.daily_rent_fee, l.is_suspicious, l.created_at
    FROM core.listings l
    JOIN core.users u ON u.user_id = l.seller_id
    JOIN core.books b ON b.isbn = l.isbn
    WHERE l.is_suspicious = TRUE
    ORDER BY l.created_at ASC;
END;
$$;

-- 5. Drop deprecated approve_listing procedure
DROP PROCEDURE IF EXISTS api.approve_listing(UUID, UUID);
