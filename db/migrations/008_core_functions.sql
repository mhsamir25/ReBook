-- Core business logic functions: search, purchase, borrow, return.
-- All logic lives here — FastAPI calls these and does nothing else.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SEARCH BOOKS (pg_trgm fuzzy match)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.search_books(p_query TEXT)
RETURNS SETOF api.active_listings_cache
LANGUAGE sql
STABLE
SET search_path = core, api, public, pg_temp   -- public needed for pg_trgm % operator
AS $$
    SELECT *
    FROM api.active_listings_cache
    WHERE title % p_query
       OR author % p_query
    ORDER BY GREATEST(
        similarity(title,  p_query),
        similarity(author, p_query)
    ) DESC;
$$;

COMMENT ON FUNCTION api.search_books IS
    'Fuzzy search over available listings by title or author using pg_trgm similarity. Results ordered by best match.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GET LISTING (single listing detail)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.get_listing(p_listing_id UUID)
RETURNS SETOF api.active_listings_cache
LANGUAGE sql
STABLE
SET search_path = core, api, public, pg_temp
AS $$
    SELECT * FROM api.active_listings_cache WHERE listing_id = p_listing_id;
$$;

COMMENT ON FUNCTION api.get_listing IS
    'Returns a single listing row from the active listings view by listing_id.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CREATE LISTING
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.create_listing(
    p_seller_id     UUID,
    p_isbn          isbn13,
    p_condition_id  SMALLINT,
    p_type          listing_type,
    p_price         money_amount DEFAULT NULL,
    p_daily_rent_fee money_amount DEFAULT NULL,
    p_max_lend_days SMALLINT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_listing_id UUID;
BEGIN
    -- Validate seller exists, has user role, and is verified
    PERFORM 1 FROM core.users
    WHERE user_id = p_seller_id
      AND role = 'user'
      AND is_verified = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only verified sellers can create listings' USING ERRCODE = 'P0010';
    END IF;

    -- Validate book exists
    PERFORM 1 FROM core.books WHERE isbn = p_isbn;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book with ISBN % not found', p_isbn USING ERRCODE = 'P0011';
    END IF;

    INSERT INTO core.listings(seller_id, isbn, condition_id, type, price, daily_rent_fee, max_lend_days)
    VALUES (p_seller_id, p_isbn, p_condition_id, p_type, p_price, p_daily_rent_fee, p_max_lend_days)
    RETURNING listing_id INTO v_listing_id;
    -- status defaults to 'pending_approval' — admin must approve

    RETURN v_listing_id;
END;
$$;

COMMENT ON FUNCTION api.create_listing IS
    'Creates a new listing (sale or rent). Validates seller role and book existence. Status starts as pending_approval.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PURCHASE BOOK — atomic, race-condition-proof via FOR UPDATE row lock
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.purchase_book(
    p_buyer_id   UUID,
    p_listing_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_listing core.listings%ROWTYPE;
    v_txn_id  UUID;
BEGIN
    -- Row-level lock stops two buyers racing on the same listing
    SELECT * INTO v_listing
    FROM core.listings
    WHERE listing_id = p_listing_id
      AND type = 'sale'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found or not for sale' USING ERRCODE = 'P0002';
    END IF;

    IF v_listing.status <> 'available' THEN
        RAISE EXCEPTION 'Listing is no longer available (status: %)', v_listing.status
        USING ERRCODE = 'P0003';
    END IF;

    -- Prevent self-purchase
    IF v_listing.seller_id = p_buyer_id THEN
        RAISE EXCEPTION 'Cannot purchase your own listing' USING ERRCODE = 'P0007';
    END IF;

    IF (SELECT wallet_balance FROM core.users WHERE user_id = p_buyer_id FOR UPDATE) < v_listing.price THEN
        RAISE EXCEPTION 'Insufficient wallet balance' USING ERRCODE = 'P0004';
    END IF;

    -- Atomic wallet transfer
    UPDATE core.users SET wallet_balance = wallet_balance - v_listing.price WHERE user_id = p_buyer_id;
    UPDATE core.users SET wallet_balance = wallet_balance + v_listing.price WHERE user_id = v_listing.seller_id;

    -- Mark listing sold
    UPDATE core.listings SET status = 'sold' WHERE listing_id = p_listing_id;

    -- Record transaction
    INSERT INTO core.sale_transactions(listing_id, buyer_id, seller_id, amount, status)
    VALUES (p_listing_id, p_buyer_id, v_listing.seller_id, v_listing.price, 'completed')
    RETURNING txn_id INTO v_txn_id;

    RETURN v_txn_id;
END;
$$;

COMMENT ON FUNCTION api.purchase_book IS
    'Atomically transfers funds from buyer to seller, marks listing as sold, and records the transaction. FOR UPDATE prevents race conditions on concurrent purchases.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. BORROW BOOK
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.borrow_book(
    p_borrower_id UUID,
    p_listing_id  UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_listing   core.listings%ROWTYPE;
    v_record_id UUID;
BEGIN
    SELECT * INTO v_listing
    FROM core.listings
    WHERE listing_id = p_listing_id
      AND type = 'rent'
    FOR UPDATE;

    IF NOT FOUND OR v_listing.status <> 'available' THEN
        RAISE EXCEPTION 'Listing unavailable for lending' USING ERRCODE = 'P0003';
    END IF;

    -- Prevent self-borrowing
    IF v_listing.seller_id = p_borrower_id THEN
        RAISE EXCEPTION 'Cannot borrow your own listing' USING ERRCODE = 'P0008';
    END IF;

    -- Check borrower has enough for at least 1 day's fee
    IF (SELECT wallet_balance FROM core.users WHERE user_id = p_borrower_id) < v_listing.daily_rent_fee THEN
        RAISE EXCEPTION 'Insufficient wallet balance to begin borrowing' USING ERRCODE = 'P0004';
    END IF;

    -- Insert lending record; EXCLUDE constraint prevents double-booking automatically
    INSERT INTO core.lending_records(listing_id, borrower_id, lender_id, due_at)
    VALUES (
        p_listing_id,
        p_borrower_id,
        v_listing.seller_id,
        now() + (v_listing.max_lend_days || ' days')::INTERVAL
    )
    RETURNING record_id INTO v_record_id;

    UPDATE core.listings SET status = 'rented' WHERE listing_id = p_listing_id;

    RETURN v_record_id;
END;
$$;

COMMENT ON FUNCTION api.borrow_book IS
    'Creates a lending record for a rent-type listing, setting due_at based on max_lend_days. The EXCLUDE constraint on lending_records prevents double-booking without any app-level check.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RETURN BOOK — calculates and charges late fees automatically
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.return_book(p_record_id UUID)
RETURNS money_amount
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_rec       core.lending_records%ROWTYPE;
    v_days_late INT;
    v_fee       NUMERIC(10,2) := 0;
    v_daily_fee NUMERIC(10,2);
BEGIN
    SELECT * INTO v_rec
    FROM core.lending_records
    WHERE record_id = p_record_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lending record not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_rec.returned_at IS NOT NULL THEN
        RAISE EXCEPTION 'Book already returned' USING ERRCODE = 'P0005';
    END IF;

    -- Calculate late fee
    v_days_late := GREATEST(0, EXTRACT(DAY FROM now() - v_rec.due_at)::INT);
    IF v_days_late > 0 THEN
        SELECT daily_rent_fee INTO v_daily_fee
        FROM core.listings
        WHERE listing_id = v_rec.listing_id;

        v_fee := v_days_late * v_daily_fee;

        -- Deduct from borrower, credit to lender
        UPDATE core.users SET wallet_balance = wallet_balance - v_fee WHERE user_id = v_rec.borrower_id;
        UPDATE core.users SET wallet_balance = wallet_balance + v_fee WHERE user_id = v_rec.lender_id;
    END IF;

    -- Mark returned and record fee
    UPDATE core.lending_records
    SET returned_at      = now(),
        late_fee_charged = v_fee
    WHERE record_id = p_record_id;

    -- Make listing available again
    UPDATE core.listings SET status = 'available' WHERE listing_id = v_rec.listing_id;

    RETURN v_fee;
END;
$$;

COMMENT ON FUNCTION api.return_book IS
    'Processes a book return. Automatically calculates and charges late fees (days_overdue * daily_rent_fee) with direct wallet debit/credit. Returns the fee charged (0 if on time).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ADD REVIEW
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.add_review(
    p_reviewer_id UUID,
    p_txn_id      UUID,
    p_rating      SMALLINT,
    p_comment     TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_review_id UUID;
BEGIN
    INSERT INTO core.reviews(reviewer_id, txn_id, rating, comment)
    VALUES (p_reviewer_id, p_txn_id, p_rating, p_comment)
    RETURNING review_id INTO v_review_id;
    -- The constraint trigger trg_validate_review will fire and reject if:
    -- (a) reviewer was not the buyer, or (b) transaction not completed.
    RETURN v_review_id;
END;
$$;

COMMENT ON FUNCTION api.add_review IS
    'Inserts a review. The constraint trigger trg_validate_review enforces that the reviewer is the actual buyer of the completed transaction.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. MANAGE WISHLIST
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.add_to_wishlist(p_user_id UUID, p_isbn isbn13)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    INSERT INTO core.wishlists(user_id, isbn)
    VALUES (p_user_id, p_isbn)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE FUNCTION api.remove_from_wishlist(p_user_id UUID, p_isbn isbn13)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    DELETE FROM core.wishlists WHERE user_id = p_user_id AND isbn = p_isbn;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TOP UP WALLET (for demo/testing purposes — admin action)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION api.topup_wallet(p_user_id UUID, p_amount money_amount)
RETURNS money_amount
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_new_balance NUMERIC(10,2);
BEGIN
    UPDATE core.users
    SET wallet_balance = wallet_balance + p_amount
    WHERE user_id = p_user_id
    RETURNING wallet_balance INTO v_new_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
    END IF;

    RETURN v_new_balance;
END;
$$;

COMMENT ON FUNCTION api.topup_wallet IS
    'Adds funds to a user wallet. Triggers the audit_log trigger automatically. For demo/admin use.';

-- ─────────────────────────────────────────────────────────────────────────────
-- LUHN ALGORITHM VALIDATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION api.is_valid_luhn(card_number TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    cleaned_card TEXT;
    len INT;
    n_check INT := 0;
    b_even BOOLEAN := false;
    c_digit CHAR(1);
    n_digit INT;
BEGIN
    -- Remove non-digits
    cleaned_card := regexp_replace(card_number, '\D', '', 'g');
    len := length(cleaned_card);

    IF len < 13 OR len > 19 THEN
        RETURN false;
    END IF;

    FOR i IN REVERSE len..1 LOOP
        c_digit := substr(cleaned_card, i, 1);
        n_digit := c_digit::INT;

        IF b_even THEN
            n_digit := n_digit * 2;
            IF n_digit > 9 THEN
                n_digit := n_digit - 9;
            END IF;
        END IF;

        n_check := n_check + n_digit;
        b_even := NOT b_even;
    END LOOP;

    RETURN (n_check % 10) = 0;
END;
$$;
