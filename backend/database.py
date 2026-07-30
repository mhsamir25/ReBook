"""
database.py — asyncpg connection pool setup.
The pool is created once at startup and shared across all requests.
FastAPI only uses asyncpg — no ORM, no SQLAlchemy. All business logic is in Postgres.
"""
import asyncpg
from config import settings

_pool: asyncpg.Pool | None = None


async def create_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=2,
        max_size=10,
        # Register UUID codec so asyncpg returns uuid.UUID objects
        init=_init_connection,
    )


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    """Called once per new connection in the pool."""
    # Ensure custom domains (isbn13, money_amount) and functions (api.*) are found
    await conn.execute("SET search_path TO core, api, public")
    
    # Encode/decode Python uuid.UUID ↔ Postgres UUID transparently
    await conn.set_type_codec(
        "uuid",
        encoder=str,
        decoder=str,
        schema="pg_catalog",
    )


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialised")
    return _pool
