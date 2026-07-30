import asyncpg
from fastapi import APIRouter, Depends
from typing import List
from database import get_pool
from auth import get_current_user, CurrentUser
from models import VerifyUserRequest, RemoveListingRequest, RemoveUserRequest, AdminEditListingRequest
from exceptions import postgres_error_to_http

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users/verify", status_code=204)
async def verify_user(
    body: VerifyUserRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Mark a user as verified. Admin-only (enforced in Postgres)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute(
                    "CALL api.verify_user($1, $2)", user.user_id, body.target_user_id
                )
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.post("/listings/remove", status_code=204)
async def remove_listing(
    body: RemoveListingRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Remove a listing. Admin or listing owner (enforced in Postgres)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute(
                    "CALL api.remove_listing($1, $2)", user.user_id, body.listing_id
                )
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.put("/listings/{listing_id}", status_code=204)
async def update_listing_book_info(
    listing_id: str,
    body: AdminEditListingRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Admin-only: update the ISBN, title, and author of a listing."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute(
                    "CALL api.admin_update_listing_book_info($1, $2, $3, $4, $5)",
                    user.user_id, listing_id, body.isbn, body.title, body.author
                )
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.post("/users/remove", status_code=204)
async def remove_user(
    body: RemoveUserRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Remove a user. Admin-only (enforced in Postgres)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute(
                    "CALL api.remove_user($1, $2)", user.user_id, body.target_user_id
                )
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/users", response_model=List[dict])
async def get_all_users(user: CurrentUser = Depends(get_current_user)):
    """List all users. Admin-only (enforced in Postgres)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM api.admin_get_users($1)", user.user_id)
        return [dict(r) for r in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/listings/all", response_model=List[dict])
async def get_all_listings_admin(user: CurrentUser = Depends(get_current_user)):
    """List all listings. Admin-only (enforced in Postgres)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM api.admin_get_all_listings($1)", user.user_id)
        return [dict(r) for r in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/listings/suspicious", response_model=List[dict])
async def get_suspicious_listings(user: CurrentUser = Depends(get_current_user)):
    """List suspicious listings. Admin-only (enforced in Postgres)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.admin_get_suspicious_listings($1)", user.user_id
            )
        return [dict(r) for r in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/audit-log", response_model=List[dict])
async def get_audit_log(
    limit: int = 100,
    user: CurrentUser = Depends(get_current_user),
):
    """Return recent audit log entries. Admin-only (enforced in Postgres)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.admin_get_audit_log($1, $2)", user.user_id, limit
            )
        return [dict(r) for r in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)
