-- 017_fix_listing_status.sql
SET search_path = core, api, public, pg_temp;

-- 1. Create a view for ALL listings (including sold, rented, etc) with status included
CREATE VIEW api.all_listings_view AS
SELECT
    l.listing_id,
    l.isbn,
    b.title,
    b.author,
    g.name           AS genre,
    bc.label         AS condition,
    bc.rank          AS condition_rank,
    l.type,
    l.price,
    l.daily_rent_fee,
    l.max_lend_days,
    u.email          AS seller_email,
    u.user_id        AS seller_id,
    l.created_at,
    l.status
FROM core.listings l
LEFT JOIN core.books          b  ON b.isbn         = l.isbn
LEFT JOIN core.genres         g  ON g.genre_id     = b.genre_id
LEFT JOIN core.book_conditions bc ON bc.condition_id = l.condition_id
LEFT JOIN core.users          u  ON u.user_id      = l.seller_id;

GRANT SELECT ON api.all_listings_view TO rebook_app;

-- 2. Update active_listings_cache to include status (appended at the end)
CREATE OR REPLACE VIEW api.active_listings_cache AS
SELECT
    l.listing_id,
    l.isbn,
    b.title,
    b.author,
    g.name           AS genre,
    bc.label         AS condition,
    bc.rank          AS condition_rank,
    l.type,
    l.price,
    l.daily_rent_fee,
    l.max_lend_days,
    u.email          AS seller_email,
    u.user_id        AS seller_id,
    l.created_at,
    l.status
FROM core.listings l
LEFT JOIN core.books          b  ON b.isbn         = l.isbn
LEFT JOIN core.genres         g  ON g.genre_id     = b.genre_id
LEFT JOIN core.book_conditions bc ON bc.condition_id = l.condition_id
LEFT JOIN core.users          u  ON u.user_id      = l.seller_id
WHERE l.status = 'available';

-- 3. Update get_listing to use all_listings_view and return SETOF api.all_listings_view
DROP FUNCTION IF EXISTS api.get_listing(UUID);
CREATE FUNCTION api.get_listing(p_listing_id UUID)
RETURNS SETOF api.all_listings_view
LANGUAGE sql
STABLE
SET search_path = core, api, public, pg_temp
AS $$
    SELECT * FROM api.all_listings_view WHERE listing_id = p_listing_id;
$$;
