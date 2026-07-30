-- Role check is enforced inside Postgres — Python never makes this decision.

-- 1. VERIFY USER — marks a user account as verified

CREATE PROCEDURE api.verify_user(p_admin_id UUID, p_target_user UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    IF (SELECT role FROM core.users WHERE user_id = p_admin_id) <> 'admin' THEN
        RAISE EXCEPTION 'Not authorized — admin role required' USING ERRCODE = 'P0403';
    END IF;

    UPDATE core.users SET is_verified = TRUE WHERE user_id = p_target_user;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- 2. APPROVE LISTING — admin approves a pending_approval listing
CREATE PROCEDURE api.approve_listing(p_admin_id UUID, p_listing_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    IF (SELECT role FROM core.users WHERE user_id = p_admin_id) <> 'admin' THEN
        RAISE EXCEPTION 'Not authorized — admin role required' USING ERRCODE = 'P0403';
    END IF;

    UPDATE core.listings
    SET status = 'available'
    WHERE listing_id = p_listing_id
      AND status = 'pending_approval';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found or not in pending_approval status'
        USING ERRCODE = 'P0002';
    END IF;
END;
$$;


-- 3. REMOVE LISTING — admin or seller removes a listing
CREATE PROCEDURE api.remove_listing(p_requester_id UUID, p_listing_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_requester_role user_role;
    v_listing        core.listings%ROWTYPE;
BEGIN
    SELECT role INTO v_requester_role FROM core.users WHERE user_id = p_requester_id;
    SELECT * INTO v_listing FROM core.listings WHERE listing_id = p_listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_requester_role <> 'admin' AND v_listing.seller_id <> p_requester_id THEN
        RAISE EXCEPTION 'Not authorized to remove this listing' USING ERRCODE = 'P0403';
    END IF;

    IF v_listing.status = 'rented' THEN
        RAISE EXCEPTION 'Cannot remove a currently rented listing' USING ERRCODE = 'P0009';
    END IF;

    UPDATE core.listings SET status = 'removed' WHERE listing_id = p_listing_id;
END;
$$;



-- 4. GET ALL USERS — admin view of all user accounts
CREATE FUNCTION api.admin_get_users(p_admin_id UUID)
RETURNS TABLE(
    user_id        UUID,
    email          CITEXT,
    role           user_role,
    is_verified    BOOLEAN,
    wallet_balance money_amount,
    created_at     TIMESTAMPTZ
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
    SELECT u.user_id, u.email, u.role, u.is_verified, u.wallet_balance, u.created_at
    FROM core.users u
    ORDER BY u.created_at DESC;
END;
$$;



-- 5. GET PENDING LISTINGS — admin view of listings awaiting approval
CREATE FUNCTION api.admin_get_pending_listings(p_admin_id UUID)
RETURNS TABLE(
    listing_id   UUID,
    seller_email CITEXT,
    isbn         isbn13,
    title        TEXT,
    type         listing_type,
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
    SELECT l.listing_id, u.email, l.isbn, b.title, l.type, l.price, l.daily_rent_fee, l.created_at FROM core.listings l 
    JOIN core.users u ON u.user_id = l.seller_id JOIN core.books b ON b.isbn = l.isbn
    WHERE l.status = 'pending_approval' ORDER BY l.created_at ASC;
END;
$$;


-- 6. GET AUDIT LOG — admin can inspect the immutable audit trail
CREATE FUNCTION api.admin_get_audit_log(p_admin_id UUID, p_limit INT DEFAULT 100)
RETURNS TABLE(
    audit_id   BIGINT,
    table_name TEXT,
    row_id     UUID,
    action     TEXT,
    old_data   JSONB,
    new_data   JSONB,
    changed_at TIMESTAMPTZ
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
    SELECT al.audit_id, al.table_name, al.row_id, al.action, al.old_data, al.new_data, al.changed_at
    FROM core.audit_log al ORDER BY al.changed_at DESC LIMIT p_limit;
END;
$$;

