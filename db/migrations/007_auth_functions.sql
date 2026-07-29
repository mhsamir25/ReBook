-- Authentication functions: register and login, with password hashing done entirely in Postgres via pgcrypto.
-- FastAPI only issues a JWT after verify_login returns a row — it never sees or checks the password itself.

CREATE FUNCTION api.register_user(
    p_email    CITEXT,
    p_password TEXT,
    p_role     user_role DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO core.users(email, password_hash, role)
    VALUES (p_email, crypt(p_password, gen_salt('bf', 10)), p_role)
    RETURNING user_id INTO v_id;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION api.register_user IS
    'Creates a new user with bcrypt-hashed password (cost=10). Returns the new user_id. Raises a unique-violation if the email is already taken.';


CREATE FUNCTION api.verify_login(
    p_email    CITEXT,
    p_password TEXT
)
RETURNS TABLE(user_id UUID, role user_role, is_verified BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.role, u.is_verified
    FROM core.users u
    WHERE u.email = p_email
      AND u.password_hash = crypt(p_password, u.password_hash);
    -- Returns 0 rows on bad credentials (no exception — FastAPI detects empty result)
END;
$$;

COMMENT ON FUNCTION api.verify_login IS
    'Returns (user_id, role, is_verified) if credentials match, or no rows on failure. Password comparison done via pgcrypto crypt().';
