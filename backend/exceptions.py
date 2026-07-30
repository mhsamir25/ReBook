"""
exceptions.py — Maps Postgres ERRCODE strings to clean HTTP responses.
Never forward raw asyncpg exception text to clients — it can reveal schema/table names.
"""
import asyncpg
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi import Request

# Custom application ERRCODEs defined in migrations
_ERRCODE_MAP: dict[str, tuple[int, str]] = {
    "P0002": (404, "Resource not found"),
    "P0003": (409, "Resource is no longer available"),
    "P0004": (402, "Insufficient wallet balance"),
    "P0005": (409, "Action already completed"),
    "P0006": (403, "Not authorised for this action"),
    "P0007": (400, "Cannot purchase your own listing"),
    "P0008": (400, "Cannot borrow your own listing"),
    "P0009": (409, "Cannot remove a currently rented listing"),
    "P0010": (403, "Only verified sellers can create listings"),
    "P0011": (404, "Book not found"),
    "P0403": (403, "Admin role required"),
    # Standard Postgres codes we also want to handle cleanly
    "23505": (409, "A record with these details already exists"),
    "23514": (422, "Value fails validation constraint"),
    "23503": (409, "Referenced record does not exist"),
}


def postgres_error_to_http(exc: asyncpg.PostgresError) -> HTTPException:
    """Convert a PostgresError to a clean HTTPException."""
    code = exc.sqlstate or ""
    status, message = _ERRCODE_MAP.get(code, (500, "An unexpected database error occurred"))
    return HTTPException(status_code=status, detail=message)


async def asyncpg_exception_handler(request: Request, exc: asyncpg.PostgresError) -> JSONResponse:
    """Global FastAPI exception handler for all asyncpg errors."""
    http_exc = postgres_error_to_http(exc)
    return JSONResponse(
        status_code=http_exc.status_code,
        content={"detail": http_exc.detail},
    )
