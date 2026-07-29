-- Views in the api schema for controlled read access

-- Active listings view: joins listings with book, genre, condition, and seller info
CREATE VIEW api.active_listings_cache AS
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
    l.created_at
FROM core.listings l
LEFT JOIN core.books          b  ON b.isbn         = l.isbn
LEFT JOIN core.genres         g  ON g.genre_id     = b.genre_id
LEFT JOIN core.book_conditions bc ON bc.condition_id = l.condition_id
LEFT JOIN core.users          u  ON u.user_id      = l.seller_id
WHERE l.status = 'available';

-- Grant SELECT on the view to the app role
GRANT SELECT ON api.active_listings_cache TO rebook_app;

-- Materialized view for high-read scenarios (can be refreshed concurrently via pg_cron)
CREATE MATERIALIZED VIEW core.active_listings_cache_mv AS
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
    l.created_at
FROM core.listings l
LEFT JOIN core.books          b  ON b.isbn         = l.isbn
LEFT JOIN core.genres         g  ON g.genre_id     = b.genre_id
LEFT JOIN core.book_conditions bc ON bc.condition_id = l.condition_id
LEFT JOIN core.users          u  ON u.user_id      = l.seller_id
WHERE l.status = 'available'
WITH DATA;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_listings_mv_listing_id ON core.active_listings_cache_mv(listing_id);
