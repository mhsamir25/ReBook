import asyncio
from database import create_pool, close_pool, get_pool
from uuid import UUID

async def main():
    await create_pool()
    pool = get_pool()
    print("Pool connected!")
    async with pool.acquire() as conn:
        try:
            listing_id = await conn.fetchval(
                "SELECT api.create_listing($1::uuid, $2::public.isbn13, $3::smallint, $4::public.listing_type, $5::public.money_amount, $6::public.money_amount, $7::smallint, $8::text, $9::text, $10::boolean, $11::smallint)",
                "bbbbbbbb-0000-0000-0000-000000000001", # string UUID
                "9780140449150",
                1,
                "sale",
                10.0,
                None,
                None,
                "Test Title",
                "Test Author",
                False,
                1
            )
            print("Listing ID:", listing_id)
        except Exception as e:
            print("Error type:", type(e))
            print("Error:", e)
    await close_pool()

if __name__ == "__main__":
    asyncio.run(main())
