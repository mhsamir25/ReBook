import asyncpg
from fastapi import APIRouter, Depends, UploadFile, File, Form, Response, HTTPException
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
            rows = await conn.fetch("SELECT genre_id, name FROM api.genres_view ORDER BY name")
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
                    "SELECT api.create_listing($1::uuid, $2::public.isbn13, $3::smallint, $4::public.listing_type, $5::public.money_amount, $6::public.money_amount, $7::smallint, $8::text, $9::text, $10::boolean, $11::smallint)",
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
                    "SELECT api.update_listing($1::uuid, $2::uuid, $3::smallint, $4::public.listing_type, $5::public.money_amount, $6::public.money_amount, $7::smallint)",
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


@router.post("/{listing_id}/images", status_code=201)
async def upload_listing_images(
    listing_id: str,
    title_index: int = Form(0),
    files: List[UploadFile] = File(...),
    user: CurrentUser = Depends(get_current_user),
):
    """Upload up to 3 images for a listing. The listing must belong to the user."""
    # 1. Verify listing ownership
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT seller_id FROM api.all_listings_view WHERE listing_id = $1::uuid", listing_id)
            if not row:
                raise HTTPException(status_code=404, detail="Listing not found")
            if str(row['seller_id']) != user.user_id and user.role != 'admin':
                raise HTTPException(status_code=403, detail="Not authorized to modify this listing")
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)

    if len(files) > 3:
        raise HTTPException(status_code=400, detail="Cannot upload more than 3 images")
        
    from mongodb import db_client
    if db_client.db is None:
        raise HTTPException(status_code=503, detail="Database connection not available")
    
    images_data = []
    for idx, file in enumerate(files):
        content = await file.read()
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 2MB)")
        images_data.append({
            "index": idx,
            "data": content,
            "content_type": file.content_type,
            "is_title": (idx == title_index)
        })
        
    # Upsert images document for the listing
    await db_client.db.listing_images.update_one(
        {"listing_id": listing_id},
        {"$set": {"listing_id": listing_id, "images": images_data}},
        upsert=True
    )
    return {"message": "Images uploaded successfully"}


@router.get("/{listing_id}/image/title")
async def get_title_image(listing_id: str):
    """Get the title image of a listing."""
    from mongodb import db_client
    if db_client.db is None:
        raise HTTPException(status_code=503, detail="Database connection not available")
    doc = await db_client.db.listing_images.find_one({"listing_id": listing_id})
    if not doc or not doc.get("images"):
        raise HTTPException(status_code=404, detail="No images found")
        
    title_img = next((img for img in doc["images"] if img["is_title"]), doc["images"][0])
    return Response(content=title_img["data"], media_type=title_img["content_type"])


@router.get("/{listing_id}/images/{index}")
async def get_image_by_index(listing_id: str, index: int):
    """Get a specific image by its index."""
    from mongodb import db_client
    if db_client.db is None:
        raise HTTPException(status_code=503, detail="Database connection not available")
    doc = await db_client.db.listing_images.find_one({"listing_id": listing_id})
    if not doc or not doc.get("images"):
        raise HTTPException(status_code=404, detail="No images found")
        
    img = next((img for img in doc["images"] if img["index"] == index), None)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return Response(content=img["data"], media_type=img["content_type"])
