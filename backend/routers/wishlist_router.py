import asyncpg
from fastapi import APIRouter, Depends
from database import get_pool
from auth import get_current_user, CurrentUser
from models import WishlistRequest, TopupRequest, TopupResponse
from exceptions import postgres_error_to_http

router = APIRouter(prefix="/me", tags=["me"])


@router.post("/wishlist", status_code=204)
async def add_to_wishlist(
    body: WishlistRequest,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute("SELECT api.add_to_wishlist($1, $2)", user.user_id, body.listing_id)
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.delete("/wishlist/{listing_id}", status_code=204)
async def remove_from_wishlist(
    listing_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute("SELECT api.remove_from_wishlist($1, $2)", user.user_id, listing_id)
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.post("/wallet/topup", response_model=TopupResponse)
async def topup_wallet(
    body: TopupRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Add funds to the authenticated user's wallet (for demo/testing)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                new_balance = await conn.fetchval(
                    "SELECT api.topup_wallet($1, $2)", user.user_id, body.amount
                )
        return TopupResponse(new_balance=new_balance)
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)
