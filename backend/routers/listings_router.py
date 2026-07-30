import asyncpg
from fastapi import APIRouter, Depends
import httpx
from typing import List
from database import get_pool
from auth import get_current_user, CurrentUser
from models import CreateListingRequest, CreateListingResponse, ListingDetail, EditListingRequest
from exceptions import postgres_error_to_http

router = APIRouter(prefix="/listings", tags=["listings"])


def _set_rls_vars(conn: asyncpg.Connection, user: CurrentUser):
    """Helper — sets RLS session variables. Called inside every transaction."""
    return [
        conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id),
        conn.execute("SELECT set_config('app.current_role', $1, true)", user.role),
    ]

@router.get("/book/{isbn}", response_model=dict)
async def get_book_by_isbn(isbn: str):
    """Check if we already have this ISBN in our database."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT title, author FROM api.active_listings_cache WHERE isbn::text = $1 LIMIT 1", isbn)
        if row:
            return dict(row)
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Book not found")
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


from typing import List, Optional

@router.get("/genres", response_model=List[dict])
async def get_genres():
    """Return all genres."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT genre_id, name FROM core.genres ORDER BY name")
        return [dict(r) for r in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)

@router.get("/search", response_model=List[dict])
async def search_listings(
    q: Optional[str] = None,
    genre: Optional[str] = None,
    type: Optional[str] = None,
    condition: Optional[str] = None
):
    """Advanced search available listings."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM api.search_books_advanced($1, $2, $3, $4)",
                q, genre, type, condition
            )
        return [dict(r) for r in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/", response_model=List[dict])
async def list_all():
    """Return all available listings (no auth required)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM api.active_listings_cache")
        return [dict(r) for r in rows]
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.get("/{listing_id}", response_model=dict)
async def get_listing(listing_id: str):
    """Return a single listing by ID (no auth required)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM api.get_listing($1)", listing_id)
        if not row:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Listing not found")
        return dict(row)
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.post("/", response_model=CreateListingResponse, status_code=201)
async def create_listing(
    body: CreateListingRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Create a new listing. Seller role and verification checked in Postgres."""
    title = body.title
    author = body.author
    is_suspicious = False

    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                listing_id = await conn.fetchval(
                    "SELECT api.create_listing($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
                    user.user_id,
                    body.isbn,
                    body.condition_id,
                    body.type.value,
                    body.price,
                    body.daily_rent_fee,
                    body.max_lend_days,
                    title,
                    author,
                    is_suspicious,
                    body.genre_id
                )
        return CreateListingResponse(listing_id=str(listing_id))
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.put("/{listing_id}", status_code=204)
async def update_listing(
    listing_id: str,
    body: EditListingRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Edit an existing listing. Must be owned by the user and available."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute(
                    "SELECT api.update_listing($1, $2, $3, $4, $5, $6, $7)",
                    user.user_id,
                    listing_id,
                    body.condition_id,
                    body.type.value,
                    body.price,
                    body.daily_rent_fee,
                    body.max_lend_days,
                )
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.delete("/{listing_id}", status_code=204)
async def remove_listing(
    listing_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Remove a listing. Must be owned by the user (or caller must be admin)."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                await conn.execute(
                    "CALL api.remove_listing($1, $2)",
                    user.user_id,
                    listing_id
                )
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)
