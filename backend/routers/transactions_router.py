import asyncpg
from fastapi import APIRouter, Depends
from database import get_pool
from auth import get_current_user, CurrentUser
from models import PurchaseResponse, BorrowResponse, ReturnResponse
from exceptions import postgres_error_to_http

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/purchase/{listing_id}", response_model=PurchaseResponse)
async def purchase_book(
    listing_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                txn_id = await conn.fetchval(
                    "SELECT api.purchase_book($1, $2)", user.user_id, listing_id
                )
        return PurchaseResponse(txn_id=str(txn_id))
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.post("/borrow/{listing_id}", response_model=BorrowResponse)
async def borrow_book(
    listing_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Borrow a rental listing.
    EXCLUDE constraint prevents double-booking entirely in Postgres.
    """
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                record_id = await conn.fetchval(
                    "SELECT api.borrow_book($1, $2)", user.user_id, listing_id
                )
        return BorrowResponse(record_id=str(record_id))
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.post("/return/{record_id}", response_model=ReturnResponse)
async def return_book(
    record_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Return a borrowed book.
    Late fee calculation and wallet debit/credit all handled in Postgres.
    """
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                fee = await conn.fetchval(
                    "SELECT api.return_book($1)", record_id
                )
        return ReturnResponse(late_fee_charged=fee)
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)
