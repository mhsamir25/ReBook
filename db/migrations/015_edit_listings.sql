-- 015_edit_listings.sql
-- Function to allow users to edit their own available listings.

CREATE OR REPLACE FUNCTION api.update_listing(
    p_seller_id     UUID,
    p_listing_id    UUID,
    p_condition_id  SMALLINT,
    p_type          listing_type,
    p_price         money_amount DEFAULT NULL,
    p_daily_rent_fee money_amount DEFAULT NULL,
    p_max_lend_days SMALLINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    UPDATE core.listings
    SET condition_id = p_condition_id,
        type = p_type,
        price = p_price,
        daily_rent_fee = p_daily_rent_fee,
        max_lend_days = p_max_lend_days
    WHERE listing_id = p_listing_id
      AND seller_id = p_seller_id
      AND status = 'available';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found, not owned by you, or no longer available to edit' USING ERRCODE = 'P0002';
    END IF;
END;
$$;
