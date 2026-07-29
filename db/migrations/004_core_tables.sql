-- Tables in dependency order: genres, book_conditions → users, books → listings → sale_transactions, lending_records, reviews, wishlists, audit_log

-- Lookup tables
CREATE TABLE core.genres (
    genre_id SMALLSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE core.book_conditions (
    condition_id SMALLSERIAL PRIMARY KEY,
    label TEXT UNIQUE NOT NULL,       -- 'new','like_new','good','fair','poor'
    rank  SMALLINT NOT NULL           -- for ORDER BY quality
);

-- Users table (depends on user_role enum and money_amount domain)
CREATE TABLE core.users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,          -- populated via pgcrypto crypt(), never plaintext
    role          user_role NOT NULL DEFAULT 'user',
    is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    wallet_balance money_amount NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Books table (depends on isbn13 domain and core.genres)
CREATE TABLE core.books (
    isbn     isbn13 PRIMARY KEY,
    title    TEXT NOT NULL,
    author   TEXT NOT NULL,
    genre_id SMALLINT NOT NULL REFERENCES core.genres(genre_id)
);

-- Listings table (depends on core.users, core.books, core.book_conditions)
CREATE TABLE core.listings (
    listing_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id     UUID NOT NULL REFERENCES core.users(user_id),
    isbn          isbn13 NOT NULL REFERENCES core.books(isbn),
    condition_id  SMALLINT NOT NULL REFERENCES core.book_conditions(condition_id),
    type          listing_type NOT NULL,
    price         money_amount,           -- required if type = 'sale'
    daily_rent_fee money_amount,          -- required if type = 'rent'
    max_lend_days SMALLINT,               -- required if type = 'rent'
    status        listing_status NOT NULL DEFAULT 'pending_approval',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_sale_fields CHECK (
        (type = 'sale' AND price IS NOT NULL AND daily_rent_fee IS NULL AND max_lend_days IS NULL)
        OR
        (type = 'rent' AND daily_rent_fee IS NOT NULL AND max_lend_days IS NOT NULL AND price IS NULL)
    )
);

-- Sale transactions (depends on core.listings, core.users)
CREATE TABLE core.sale_transactions (
    txn_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES core.listings(listing_id),
    buyer_id   UUID NOT NULL REFERENCES core.users(user_id),
    seller_id  UUID NOT NULL REFERENCES core.users(user_id),
    amount     money_amount NOT NULL,
    status     txn_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lending records with EXCLUDE constraint to prevent double-booking (depends on btree_gist extension)
CREATE TABLE core.lending_records (
    record_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id       UUID NOT NULL REFERENCES core.listings(listing_id),
    borrower_id      UUID NOT NULL REFERENCES core.users(user_id),
    lender_id        UUID NOT NULL REFERENCES core.users(user_id),
    borrowed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at           TIMESTAMPTZ NOT NULL,
    returned_at      TIMESTAMPTZ,
    late_fee_charged money_amount NOT NULL DEFAULT 0,

    -- Prevent two overlapping active loans of the SAME listing:
    EXCLUDE USING gist (
        listing_id WITH =,
        tstzrange(borrowed_at, COALESCE(returned_at, 'infinity')) WITH &&
    ) WHERE (returned_at IS NULL)
);

-- Reviews (depends on core.users, core.sale_transactions)
CREATE TABLE core.reviews (
    review_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES core.users(user_id),
    txn_id      UUID NOT NULL REFERENCES core.sale_transactions(txn_id),
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (reviewer_id, txn_id)   -- no duplicate review per transaction
);

-- Wishlists (depends on core.users, core.books)
CREATE TABLE core.wishlists (
    user_id  UUID NOT NULL REFERENCES core.users(user_id),
    isbn     isbn13 NOT NULL REFERENCES core.books(isbn),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, isbn)
);

-- Audit log (append-only, immutable)
CREATE TABLE core.audit_log (
    audit_id   BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    row_id     UUID NOT NULL,
    action     TEXT NOT NULL,
    old_data   JSONB,
    new_data   JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Make audit_log truly immutable/append-only:
REVOKE UPDATE, DELETE ON core.audit_log FROM PUBLIC;
