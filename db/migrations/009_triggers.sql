-- All triggers and trigger functions:

-- 1. AUDIT TRIGGER — fires on every wallet_balance change and after that inserts to audit_log

CREATE FUNCTION core.fn_audit_wallet_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    IF OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance THEN
        INSERT INTO core.audit_log(table_name, row_id, action, old_data, new_data)
        VALUES ('users', NEW.user_id, 'wallet_update', jsonb_build_object('wallet_balance', OLD.wallet_balance), jsonb_build_object('wallet_balance', NEW.wallet_balance));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_wallet
AFTER UPDATE ON core.users
FOR EACH ROW
EXECUTE FUNCTION core.fn_audit_wallet_change();


-- 2. REVIEW VALIDATION — constraint trigger, can reference other tables

CREATE FUNCTION core.fn_validate_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    PERFORM 1 FROM core.sale_transactions WHERE txn_id = NEW.txn_id AND buyer_id  = NEW.reviewer_id AND status = 'completed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Review must reference a completed transaction where you are the buyer' USING ERRCODE = 'P0006';
    END IF;

    RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_validate_review
AFTER INSERT ON core.reviews
FOR EACH ROW
EXECUTE FUNCTION core.fn_validate_review();

-- 3. WISHLIST NOTIFY — LISTEN/NOTIFY when a listing becomes available
CREATE FUNCTION core.fn_notify_wishlist_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    IF NEW.status = 'available' AND (OLD IS NULL OR OLD.status <> 'available') THEN
        PERFORM 1 FROM core.wishlists WHERE isbn = NEW.isbn;
        IF FOUND THEN
            PERFORM pg_notify('wishlist_match', json_build_object('isbn', NEW.isbn, 'listing_id', NEW.listing_id, 'type', NEW.type)::TEXT);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_wishlist
AFTER INSERT OR UPDATE ON core.listings
FOR EACH ROW
EXECUTE FUNCTION core.fn_notify_wishlist_match();



-- 4. AUDIT TRIGGER — generic, covers listing status changes too
CREATE FUNCTION core.fn_audit_listing_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO core.audit_log(table_name, row_id, action, old_data, new_data)
        VALUES ( 'listings', NEW.listing_id, 'status_change', jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_listing
AFTER UPDATE ON core.listings
FOR EACH ROW
EXECUTE FUNCTION core.fn_audit_listing_change();
