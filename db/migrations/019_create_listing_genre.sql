-- 019_create_listing_genre.sql
-- Replace create_listing function to accept a genre_id.

SET search_path = public, core;
DROP FUNCTION IF EXISTS api.create_listing(UUID, isbn13, SMALLINT, listing_type, money_amount, money_amount, SMALLINT, TEXT, TEXT, BOOLEAN);

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
    p_is_suspicious BOOLEAN DEFAULT FALSE,
    p_genre_id      SMALLINT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_listing_id UUID;
    v_target_genre_id SMALLINT;
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
        IF p_genre_id IS NOT NULL THEN
            v_target_genre_id := p_genre_id;
        ELSE
            SELECT genre_id INTO v_target_genre_id FROM core.genres WHERE name = 'Unknown';
            IF NOT FOUND THEN
                INSERT INTO core.genres(name) VALUES ('Unknown') RETURNING genre_id INTO v_target_genre_id;
            END IF;
        END IF;

        INSERT INTO core.books(isbn, title, author, genre_id)
        VALUES (p_isbn, p_title, p_author, v_target_genre_id);
    END IF;

    -- Insert the listing with the specific status and is_suspicious flag
    INSERT INTO core.listings(seller_id, isbn, condition_id, type, price, daily_rent_fee, max_lend_days, status, is_suspicious)
    VALUES (p_seller_id, p_isbn, p_condition_id, p_type, p_price, p_daily_rent_fee, p_max_lend_days, 'available', p_is_suspicious)
    RETURNING listing_id INTO v_listing_id;

    RETURN v_listing_id;
END;
$$;
