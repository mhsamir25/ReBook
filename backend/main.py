import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import create_pool, close_pool
from mongodb import connect_to_mongo, close_mongo_connection
from exceptions import asyncpg_exception_handler
from routers.auth_router        import router as auth_router
from routers.listings_router    import router as listings_router
from routers.transactions_router import router as transactions_router
from routers.reviews_router     import router as reviews_router
from routers.wishlist_router    import router as wishlist_router
from routers.cart_router        import router as cart_router
from routers.admin_router       import router as admin_router
from routers.profile_router     import router as profile_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_pool()
    await connect_to_mongo()
    yield
    await close_pool()
    await close_mongo_connection()


app = FastAPI(
    title="ReBook API",
    description=(
        "Database-centric book marketplace. All business logic lives in PostgreSQL. "
        "This API is a thin JSON transport layer over Postgres functions."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global exception handler — clean Postgres errors, no schema leakage ─────
app.add_exception_handler(asyncpg.PostgresError, asyncpg_exception_handler)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(listings_router)
app.include_router(transactions_router)
app.include_router(reviews_router)
app.include_router(wishlist_router)
app.include_router(cart_router)
app.include_router(profile_router)
app.include_router(admin_router)



@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
