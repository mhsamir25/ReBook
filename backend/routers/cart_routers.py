import asyncpg
from fastapi import APIRouter, Depends
from typing import List
from database import get_pool
from auth import get_current_user, CurrentUser
from models import CartRequest, CartItem
from exceptions import postgres_error_to_http

router = APIRouter(prefix="/me/cart", tags=["cart"])

@router.get("", response_model=List[CartItem])
async def get_cart(user: CurrentUser = Depends(get_current_user)):
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                rows = await conn.fetch("SELECT * FROM api.get_cart($1)", user.user_id)
                return [CartItem(**dict(r)) for r in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)

@router.post("", status_code=204)
async def add_to_cart(
    body: CartRequest,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute("SELECT api.add_to_cart($1, $2)", user.user_id, body.listing_id)
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.delete("/{listing_id}", status_code=204)
async def remove_from_cart(
    listing_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute("SELECT api.remove_from_cart($1, $2)", user.user_id, listing_id)
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)
