-- 001_roles_schemas.sql

-- Superuser-ish owner role, used only for migrations, never by the app
CREATE ROLE rebook_admin LOGIN PASSWORD 'rebook_admin_pass' CREATEDB;

-- The role FastAPI actually connects as. Gets NO direct table grants.
CREATE ROLE rebook_app LOGIN PASSWORD 'rebook_app_pass';

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CONNECT ON DATABASE rebook FROM PUBLIC;

-- Grant connect back to the roles that need it
GRANT CONNECT ON DATABASE rebook TO rebook_admin;
GRANT CONNECT ON DATABASE rebook TO rebook_app;

-- Create schemas
CREATE SCHEMA core;
CREATE SCHEMA api;

-- rebook_app may only EXECUTE functions/procedures in the api schema,
-- and SELECT from views explicitly designed for read access.
GRANT USAGE ON SCHEMA api TO rebook_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA api TO rebook_app;
-- (Note: View grants will be added later when the view is created)
