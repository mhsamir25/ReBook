-- 1. GET USER PROFILE
CREATE OR REPLACE FUNCTION api.get_user_profile(p_user_id UUID)
RETURNS TABLE (user_id UUID, email CITEXT, role user_role, is_verified BOOLEAN, wallet_balance money_amount, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, api, public, pg_temp
AS $$
    SELECT user_id, email, role, is_verified, wallet_balance, created_at
    FROM core.users WHERE user_id = p_user_id;
$$;


-- 2. GET WISHLIST
CREATE OR REPLACE FUNCTION api.get_wishlist(p_user_id UUID)
RETURNS TABLE (isbn isbn13, title TEXT, author TEXT, genre TEXT, added_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, api, public, pg_temp
AS $$
    SELECT w.isbn, b.title, b.author, g.name AS genre, w.added_at FROM core.wishlists w
    JOIN core.books b ON b.isbn = w.isbn JOIN core.genres g ON g.genre_id = b.genre_id
    WHERE w.user_id = p_user_id ORDER BY w.added_at DESC;
$$;


CREATE OR REPLACE FUNCTION api.get_sold_books(p_user_id UUID)
RETURNS TABLE ( txn_id UUID, listing_id UUID, title TEXT, amount money_amount, status txn_status, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, api, public, pg_temp
AS $$
    SELECT st.txn_id, st.listing_id, b.title, st.amount, st.status, st.created_at FROM core.sale_transactions st
    JOIN core.listings l ON l.listing_id = st.listing_id JOIN core.books b ON b.isbn = l.isbn
    WHERE st.seller_id = p_user_id ORDER BY st.created_at DESC;
$$;


CREATE OR REPLACE FUNCTION api.get_bought_books(p_user_id UUID)
RETURNS TABLE (txn_id UUID, listing_id UUID, title TEXT, amount money_amount, status txn_status, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, api, public, pg_temp
AS $$
    SELECT st.txn_id, st.listing_id, b.title, st.amount, st.status, st.created_at FROM core.sale_transactions st
    JOIN core.listings l ON l.listing_id = st.listing_id JOIN core.books b ON b.isbn = l.isbn
    WHERE st.buyer_id = p_user_id ORDER BY st.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION api.get_lended_books(p_user_id UUID)
RETURNS TABLE (record_id UUID, listing_id UUID, title TEXT, borrowed_at TIMESTAMPTZ, due_at TIMESTAMPTZ, returned_at TIMESTAMPTZ, late_fee_charged money_amount)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, api, public, pg_temp
AS $$
    SELECT lr.record_id, lr.listing_id, b.title, lr.borrowed_at, lr.due_at, lr.returned_at, lr.late_fee_charged FROM core.lending_records lr
    JOIN core.listings l ON l.listing_id = lr.listing_id JOIN core.books b ON b.isbn = l.isbn
    WHERE lr.lender_id = p_user_id ORDER BY lr.borrowed_at DESC;
$$;



CREATE OR REPLACE FUNCTION api.get_rented_books(p_user_id UUID)
RETURNS TABLE (record_id UUID, listing_id UUID, title TEXT, borrowed_at TIMESTAMPTZ, due_at TIMESTAMPTZ, returned_at TIMESTAMPTZ, late_fee_charged money_amount)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, api, public, pg_temp
AS $$
    SELECT lr.record_id, lr.listing_id, b.title, lr.borrowed_at, lr.due_at, lr.returned_at, lr.late_fee_charged FROM core.lending_records lr
    JOIN core.listings l ON l.listing_id = lr.listing_id JOIN core.books b ON b.isbn = l.isbn
    WHERE lr.borrower_id = p_user_id ORDER BY lr.borrowed_at DESC;
$$;

