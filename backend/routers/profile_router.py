from typing import List
import asyncpg
from fastapi import APIRouter, Depends
from database import get_pool
from auth import get_current_user, CurrentUser
from models import ProfileResponse, WishlistItem, SaleTransactionItem, LendingRecordItem
from exceptions import postgres_error_to_http

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(user: CurrentUser = Depends(get_current_user)):
    """Fetch the authenticated user's profile info."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM api.get_user_profile($1)", user.user_id
            )
            if not row:
                raise postgres_error_to_http(Exception("User profile not found"))
            
            return ProfileResponse(
                user_id=str(row['user_id']),
                email=row['email'],
                role=row['role'],
                is_verified=row['is_verified'],
                wallet_balance=row['wallet_balance'],
                created_at=str(row['created_at'])
            )
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/wishlist", response_model=List[WishlistItem])
async def get_wishlist(user: CurrentUser = Depends(get_current_user)):
    """Fetch the authenticated user's wishlist."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.get_wishlist($1)", user.user_id
            )
            return [
                WishlistItem(
                    listing_id=str(row['listing_id']),
                    isbn=row['isbn'],
                    title=row['title'],
                    author=row['author'],
                    genre=row['genre'],
                    status=row['status'],
                    price=row['price'],
                    daily_rent_fee=row['daily_rent_fee'],
                    type=row['type'],
                    added_at=str(row['added_at'])
                ) for row in rows
            ]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/listings", response_model=List[dict])
async def get_my_listings(user: CurrentUser = Depends(get_current_user)):
    """Fetch the authenticated user's active/created listings."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.all_listings_view WHERE seller_id = $1::uuid ORDER BY created_at DESC", 
                user.user_id
            )
            return [dict(row) for row in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/transactions/sales", response_model=List[SaleTransactionItem])
async def get_sales(user: CurrentUser = Depends(get_current_user)):
    """Fetch the authenticated user's sold books."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.get_sold_books($1)", user.user_id
            )
            return [
                SaleTransactionItem(
                    txn_id=str(row['txn_id']),
                    listing_id=str(row['listing_id']),
                    title=row['title'],
                    amount=row['amount'],
                    status=row['status'],
                    created_at=str(row['created_at'])
                ) for row in rows
            ]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/transactions/purchases", response_model=List[SaleTransactionItem])
async def get_purchases(user: CurrentUser = Depends(get_current_user)):
    """Fetch the authenticated user's purchased books."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.get_bought_books($1)", user.user_id
            )
            return [
                SaleTransactionItem(
                    txn_id=str(row['txn_id']),
                    listing_id=str(row['listing_id']),
                    title=row['title'],
                    amount=row['amount'],
                    status=row['status'],
                    created_at=str(row['created_at'])
                ) for row in rows
            ]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/transactions/lending", response_model=List[LendingRecordItem])
async def get_lending(user: CurrentUser = Depends(get_current_user)):
    """Fetch the authenticated user's lended books."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.get_lended_books($1)", user.user_id
            )
            return [
                LendingRecordItem(
                    record_id=str(row['record_id']),
                    listing_id=str(row['listing_id']),
                    title=row['title'],
                    borrowed_at=str(row['borrowed_at']),
                    due_at=str(row['due_at']),
                    returned_at=str(row['returned_at']) if row['returned_at'] else None,
                    late_fee_charged=row['late_fee_charged']
                ) for row in rows
            ]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/transactions/borrowing", response_model=List[LendingRecordItem])
async def get_borrowing(user: CurrentUser = Depends(get_current_user)):
    """Fetch the authenticated user's rented/borrowed books."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.get_rented_books($1)", user.user_id
            )
            return [
                LendingRecordItem(
                    record_id=str(row['record_id']),
                    listing_id=str(row['listing_id']),
                    title=row['title'],
                    borrowed_at=str(row['borrowed_at']),
                    due_at=str(row['due_at']),
                    returned_at=str(row['returned_at']) if row['returned_at'] else None,
                    late_fee_charged=row['late_fee_charged']
                ) for row in rows
            ]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)
