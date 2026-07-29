-- Performance indexes: pg_trgm GIN for fuzzy search, btree on frequently-joined FK columns

-- Fuzzy/smart search indexes on books (requires pg_trgm extension)
CREATE INDEX idx_books_title_trgm  ON core.books USING gin (title  gin_trgm_ops);
CREATE INDEX idx_books_author_trgm ON core.books USING gin (author gin_trgm_ops);

-- Standard btree indexes on FK columns used heavily in JOINs
CREATE INDEX idx_listings_seller_id     ON core.listings(seller_id);
CREATE INDEX idx_listings_isbn          ON core.listings(isbn);
CREATE INDEX idx_listings_status        ON core.listings(status);

CREATE INDEX idx_sale_txn_buyer_id      ON core.sale_transactions(buyer_id);
CREATE INDEX idx_sale_txn_seller_id     ON core.sale_transactions(seller_id);
CREATE INDEX idx_sale_txn_listing_id    ON core.sale_transactions(listing_id);

CREATE INDEX idx_lending_listing_id     ON core.lending_records(listing_id);
CREATE INDEX idx_lending_borrower_id    ON core.lending_records(borrower_id);
CREATE INDEX idx_lending_lender_id      ON core.lending_records(lender_id);
CREATE INDEX idx_lending_returned_at    ON core.lending_records(returned_at) WHERE returned_at IS NULL;

CREATE INDEX idx_reviews_reviewer_id    ON core.reviews(reviewer_id);
CREATE INDEX idx_reviews_txn_id         ON core.reviews(txn_id);

CREATE INDEX idx_wishlists_isbn         ON core.wishlists(isbn);

CREATE INDEX idx_audit_log_row_id       ON core.audit_log(row_id);
CREATE INDEX idx_audit_log_changed_at   ON core.audit_log(changed_at);
