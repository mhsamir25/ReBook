-- 003_domains_enums.sql

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE listing_type AS ENUM ('sale', 'rent');
CREATE TYPE listing_status AS ENUM ('pending_approval', 'available', 'sold', 'rented', 'removed');
CREATE TYPE txn_status AS ENUM ('pending', 'completed', 'cancelled', 'disputed');

CREATE DOMAIN isbn13 AS CHAR(13) CHECK (VALUE ~ '^[0-9]{13}$');
CREATE DOMAIN money_amount AS NUMERIC(10,2) CHECK (VALUE >= 0);
