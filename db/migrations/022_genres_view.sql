-- Create a view for genres
CREATE VIEW api.genres_view AS
SELECT genre_id, name FROM core.genres ORDER BY name;

-- Grant select to the app role
GRANT SELECT ON api.genres_view TO rebook_app;
