import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from database import get_pool
from auth import create_access_token
from models import RegisterRequest, RegisterResponse, LoginRequest, LoginResponse
from exceptions import postgres_error_to_http

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: RegisterRequest):
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            user_id = await conn.fetchval(
                "SELECT api.register_user($1, $2, $3)",
                body.email, body.password, body.role.value
            )
        return RegisterResponse(user_id=str(user_id))
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM api.verify_login($1, $2)",
                body.email, body.password
            )
    except asyncpg.PostgresError as exc:
        raise postgres_error_to_http(exc)

    if not row:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(
        user_id=str(row["user_id"]),
        role=row["role"],
        is_verified=row["is_verified"],
    )
    return LoginResponse(
        access_token=token,
        user_id=str(row["user_id"]),
        role=row["role"],
        is_verified=row["is_verified"],
    )
