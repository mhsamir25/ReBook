import asyncio
from database import create_pool, close_pool, get_pool
from uuid import UUID

async def main():
    await create_pool()
    pool = get_pool()
    print("Pool connected!")
    async with pool.acquire() as conn:
        try:
            listing_id = "26cf9b5e-c5dc-4970-9a0b-1cae638d1123"
            row = await conn.fetchrow("SELECT seller_id FROM core.listings WHERE listing_id = $1", listing_id)
            print("Row:", row)
        except Exception as e:
            print("Error type:", type(e))
            print("Error:", e)
    await close_pool()

if __name__ == "__main__":
    asyncio.run(main())
