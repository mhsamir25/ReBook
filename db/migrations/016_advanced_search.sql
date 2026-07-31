-- 016_advanced_search.sql
-- Add advanced search filters to the api.search_books function

SET search_path = core, api, public, pg_temp;

CREATE FUNCTION api.search_books_advanced(
    p_query TEXT DEFAULT NULL,
    p_genre TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_condition TEXT DEFAULT NULL
)
RETURNS SETOF api.active_listings_cache
LANGUAGE sql
STABLE
SET search_path = core, api, public, pg_temp
AS $$
    SELECT *
    FROM api.active_listings_cache
    WHERE (
            NULLIF(p_query, '') IS NULL
            OR title ILIKE '%' || p_query || '%'
            OR author ILIKE '%' || p_query || '%'
            OR isbn = p_query
          )
      AND (NULLIF(p_genre, '') IS NULL OR genre = p_genre)
      AND (NULLIF(p_type, '') IS NULL OR type::text = p_type)
      AND (NULLIF(p_condition, '') IS NULL OR condition = p_condition)
    ORDER BY 
        CASE 
            WHEN p_query IS NOT NULL AND p_query != '' AND isbn = p_query THEN 3
            WHEN p_query IS NOT NULL AND p_query != '' AND title ILIKE p_query THEN 2
            WHEN p_query IS NOT NULL AND p_query != '' AND author ILIKE p_query THEN 2
            ELSE 1
        END DESC;
$$;

COMMENT ON FUNCTION api.search_books_advanced IS
    'Advanced search over available listings by query (title/author/isbn) and filters (genre, type, condition). Results ordered by best match if query is provided.';
