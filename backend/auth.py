"""
auth.py — JWT creation and verification helpers.
FastAPI only signs/verifies the token — it never validates business rules.
All business logic (role checks, account status) stays in Postgres.
"""
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings

bearer_scheme = HTTPBearer()


def create_access_token(user_id: str, role: str, is_verified: bool) -> str:
    """Create a signed JWT containing user identity claims."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "role": role,
        "is_verified": is_verified,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises HTTPException on failure."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


class CurrentUser:
    """Dependency: decode JWT and expose user_id + role to route handlers."""
    def __init__(self, credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
        payload = decode_token(credentials.credentials)
        self.user_id: str = payload["sub"]
        self.role: str = payload["role"]
        self.is_verified: bool = payload.get("is_verified", False)

    def require_role(self, *roles: str) -> "CurrentUser":
        if self.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return self


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> CurrentUser:
    return CurrentUser(credentials)
