import asyncio
import asyncpg
import os
import sys

async def main():
    db_url = "postgresql://rebook_admin:admin_pass@localhost:5432/rebook"
        
    print(f"Connecting to {db_url}")
    try:
        conn = await asyncpg.connect(db_url)
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    sql = """
    DROP FUNCTION IF EXISTS api.add_to_wishlist(UUID, isbn13);
    DROP FUNCTION IF EXISTS api.remove_from_wishlist(UUID, isbn13);
    """
    
    print("Executing migration...")
    try:
        await conn.execute(sql)
        print("Success!")
    except Exception as e:
        print(f"Execution failed: {e}")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
