-- users
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own record
CREATE POLICY users_select_own ON core.users
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Users can only update their own record
CREATE POLICY users_update_own ON core.users
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Admins bypass all restrictions on users table
CREATE POLICY users_admin_all ON core.users
    FOR ALL
    USING (current_setting('app.current_role', TRUE) = 'admin');


-- listings

ALTER TABLE core.listings ENABLE ROW LEVEL SECURITY;


-- Sellers can also see their own listings (any status)
CREATE POLICY listings_select ON core.listings
    FOR SELECT
    USING (
        status = 'available'
        OR seller_id = current_setting('app.current_user_id', TRUE)::UUID
    );

-- Only the listing's seller can update it 
CREATE POLICY listings_update_own ON core.listings
    FOR UPDATE
    USING (seller_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Admin bypass
CREATE POLICY listings_admin_all ON core.listings
    FOR ALL
    USING (current_setting('app.current_role', TRUE) = 'admin');


-- sale_transactions
ALTER TABLE core.sale_transactions ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers can only see their own transactions
CREATE POLICY txn_select_participants ON core.sale_transactions
    FOR SELECT
    USING (
        buyer_id  = current_setting('app.current_user_id', TRUE)::UUID
        OR seller_id = current_setting('app.current_user_id', TRUE)::UUID
    );

-- Admin bypass
CREATE POLICY txn_admin_all ON core.sale_transactions
    FOR ALL
    USING (current_setting('app.current_role', TRUE) = 'admin');

-- lending_records
ALTER TABLE core.lending_records ENABLE ROW LEVEL SECURITY;

-- Borrowers and lenders can only see their own lending records
CREATE POLICY lending_select_participants ON core.lending_records
    FOR SELECT
    USING (
        borrower_id = current_setting('app.current_user_id', TRUE)::UUID
        OR lender_id  = current_setting('app.current_user_id', TRUE)::UUID
    );

-- Admin bypass
CREATE POLICY lending_admin_all ON core.lending_records
    FOR ALL
    USING (current_setting('app.current_role', TRUE) = 'admin');

-- reviews

ALTER TABLE core.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (they are public)
CREATE POLICY reviews_select_all ON core.reviews
    FOR SELECT
    USING (TRUE);

-- Only the reviewer can see/manage their own review row for writes
CREATE POLICY reviews_insert_own ON core.reviews
    FOR INSERT
    WITH CHECK (reviewer_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Admin bypass
CREATE POLICY reviews_admin_all ON core.reviews
    FOR ALL
    USING (current_setting('app.current_role', TRUE) = 'admin');



-- wishlists
ALTER TABLE core.wishlists ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own wishlist
CREATE POLICY wishlists_own ON core.wishlists
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Admin bypass
CREATE POLICY wishlists_admin_all ON core.wishlists
    FOR ALL
    USING (current_setting('app.current_role', TRUE) = 'admin');

ALTER TABLE core.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin can read audit log directly (the SECURITY DEFINER function bypasses RLS anyway)
CREATE POLICY audit_log_admin_only ON core.audit_log
    FOR SELECT
    USING (current_setting('app.current_role', TRUE) = 'admin');
