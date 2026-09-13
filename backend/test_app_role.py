import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

async def main():
    try:
        conn = await asyncpg.connect(
            user=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            database=os.getenv("POSTGRES_DB"),
            host=os.getenv("POSTGRES_HOST"),
            port=os.getenv("POSTGRES_PORT")
        )
        print("Connected as", os.getenv("POSTGRES_USER"))
        # Test if we can cast to public.isbn13
        res = await conn.fetchval("SELECT '9780140449150'::public.isbn13")
        print("Result:", res)
    except Exception as e:
        print("Error type:", type(e))
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
