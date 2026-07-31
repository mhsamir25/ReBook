import asyncio
import asyncpg
from config import settings

async def main():
    print(f"Connecting to {settings.database_url}")
    conn = await asyncpg.connect(settings.database_url)
    with open("../db/migrations/020_admin_edit_listing_book.sql", "r") as f:
        sql = f.read()
    await conn.execute(sql)
    print("Migration 020 applied successfully")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
