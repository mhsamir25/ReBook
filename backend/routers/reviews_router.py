import asyncpg
from fastapi import APIRouter, Depends
from database import get_pool
from auth import get_current_user, CurrentUser
from models import AddReviewRequest, AddReviewResponse
from exceptions import postgres_error_to_http

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("/", response_model=AddReviewResponse, status_code=201)
async def add_review(
    body: AddReviewRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Submit a review for a completed transaction.
    Validation (is buyer? is completed?) enforced by constraint trigger in Postgres.
    """
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                txn_id = await conn.fetchval(
                    "SELECT txn_id FROM core.sale_transactions WHERE buyer_id = $1 AND listing_id = $2 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
                    user.user_id, body.listing_id
                )
                if not txn_id:
                    from fastapi import HTTPException
                    raise HTTPException(status_code=400, detail="No completed purchase found for this listing to review")
                    
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user.user_id)
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                review_id = await conn.fetchval(
                    "SELECT api.add_review($1, $2, $3, $4)",
                    user.user_id, txn_id, body.rating, body.comment
                )
        return AddReviewResponse(review_id=str(review_id))
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)
