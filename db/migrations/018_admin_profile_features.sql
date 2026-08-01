-- 018_admin_profile_features.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. REMOVE USER (Hard Delete with Cascade)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE api.remove_user(p_admin_id UUID, p_target_user UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    IF (SELECT role FROM core.users WHERE user_id = p_admin_id) <> 'admin' THEN
        RAISE EXCEPTION 'Not authorized — admin role required' USING ERRCODE = 'P0403';
    END IF;

    -- Delete reviews related to the user's transactions or authored by the user
    DELETE FROM core.reviews
    WHERE reviewer_id = p_target_user 
       OR txn_id IN (SELECT txn_id FROM core.sale_transactions WHERE buyer_id = p_target_user OR seller_id = p_target_user);

    -- Delete lending records involving the user or their listings
    DELETE FROM core.lending_records
    WHERE borrower_id = p_target_user 
       OR lender_id = p_target_user 
       OR listing_id IN (SELECT listing_id FROM core.listings WHERE seller_id = p_target_user);

    -- Delete sale transactions involving the user or their listings
    DELETE FROM core.sale_transactions
    WHERE buyer_id = p_target_user 
       OR seller_id = p_target_user 
       OR listing_id IN (SELECT listing_id FROM core.listings WHERE seller_id = p_target_user);

    -- Delete user's wishlists
    DELETE FROM core.wishlists
    WHERE user_id = p_target_user;

    -- Delete user's listings
    DELETE FROM core.listings
    WHERE seller_id = p_target_user;

    -- Delete the user
    DELETE FROM core.users
    WHERE user_id = p_target_user;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
    END IF;
END;
$$;

COMMENT ON PROCEDURE api.remove_user IS
    'Admin-only: Hard deletes a user and cascades the deletion to their wishlists, reviews, transactions, lending records, and listings.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GET ALL LISTINGS FOR ADMIN
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION api.admin_get_all_listings(p_admin_id UUID)
RETURNS TABLE(
    listing_id   UUID,
    seller_email CITEXT,
    isbn         isbn13,
    title        TEXT,
    type         listing_type,
    status       listing_status,
    price        money_amount,
    daily_rent_fee money_amount,
    created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    IF (SELECT u.role FROM core.users u WHERE u.user_id = p_admin_id) <> 'admin' THEN
        RAISE EXCEPTION 'Not authorized — admin role required' USING ERRCODE = 'P0403';
    END IF;

    RETURN QUERY
    SELECT l.listing_id, u.email, l.isbn, b.title, l.type, l.status, l.price, l.daily_rent_fee, l.created_at
    FROM core.listings l
    JOIN core.users u ON u.user_id = l.seller_id
    JOIN core.books b ON b.isbn = l.isbn
    ORDER BY l.created_at DESC;
END;
$$;

COMMENT ON FUNCTION api.admin_get_all_listings IS
    'Admin-only: returns all listings in the system regardless of status.';
