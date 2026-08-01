-- 020_admin_edit_listing_book.sql

CREATE OR REPLACE PROCEDURE api.admin_update_listing_book_info(
    p_admin_id UUID,
    p_listing_id UUID,
    p_isbn isbn13,
    p_title TEXT,
    p_author TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_current_isbn isbn13;
    v_genre_id SMALLINT;
BEGIN
    -- 1. Check admin role
    IF (SELECT role FROM core.users WHERE user_id = p_admin_id) <> 'admin' THEN
        RAISE EXCEPTION 'Not authorized — admin role required' USING ERRCODE = 'P0403';
    END IF;

    -- 2. Get current listing and book info
    SELECT l.isbn, b.genre_id INTO v_current_isbn, v_genre_id
    FROM core.listings l
    JOIN core.books b ON b.isbn = l.isbn
    WHERE l.listing_id = p_listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found' USING ERRCODE = 'P0002';
    END IF;

    -- 3. Upsert the new book details in core.books
    INSERT INTO core.books (isbn, title, author, genre_id)
    VALUES (p_isbn, p_title, p_author, v_genre_id)
    ON CONFLICT (isbn) DO UPDATE
    SET title = EXCLUDED.title,
        author = EXCLUDED.author;

    -- 4. Update the listing to point to the new ISBN
    UPDATE core.listings
    SET isbn = p_isbn
    WHERE listing_id = p_listing_id;
END;
$$;
