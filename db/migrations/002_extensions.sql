-- 002_extensions.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- password hashing (crypt/gen_salt), gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email column
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy/smart search on title & author
CREATE EXTENSION IF NOT EXISTS unaccent;   -- accent-insensitive search
CREATE EXTENSION IF NOT EXISTS btree_gist; -- needed for EXCLUDE constraints (overlapping lending periods)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- query auditing/perf inspection, good demo material
-- pg_cron is optional (requires a separate OS package; available in Docker postgres:16 but not Homebrew)
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available on this system — skipping. Install postgresql-cron package to enable scheduled jobs.';
END; $$;
