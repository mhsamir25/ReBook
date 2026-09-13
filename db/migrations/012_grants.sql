GRANT USAGE ON SCHEMA api  TO rebook_app;
GRANT USAGE ON SCHEMA core TO rebook_app;  -- needed to resolve types, not table access
GRANT USAGE ON SCHEMA public TO rebook_app; -- needed for custom domains

GRANT EXECUTE ON ALL FUNCTIONS  IN SCHEMA api TO rebook_app;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA api TO rebook_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA api
    GRANT EXECUTE ON FUNCTIONS TO rebook_app;


GRANT SELECT ON api.active_listings_cache TO rebook_app;

REVOKE ALL ON ALL TABLES IN SCHEMA core FROM rebook_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA core FROM rebook_app;

GRANT ALL ON SCHEMA core TO rebook_admin;
GRANT ALL ON SCHEMA api  TO rebook_admin;
GRANT ALL ON ALL TABLES    IN SCHEMA core TO rebook_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core TO rebook_admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA api  TO rebook_admin;
GRANT ALL ON ALL PROCEDURES IN SCHEMA api TO rebook_admin;
