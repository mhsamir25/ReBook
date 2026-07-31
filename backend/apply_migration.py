import asyncio
import asyncpg
import os
import sys

async def main():
    # Setup DB connection
    # Assuming connection string is in .env or hardcoded for localhost in backend/config.py
    # Let's read backend/config.py to find out or just try common defaults
    try:
        from config import DATABASE_URL
        # if using postgresql+asyncpg we need to convert for asyncpg.connect
        db_url = DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
    except ImportError:
        # Fallback to demo default
        db_url = "postgresql://rebook_admin:admin_pass@localhost:5432/rebook"
        
    print(f"Connecting to {db_url}")
    try:
        conn = await asyncpg.connect(db_url)
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    with open('../db/migrations/016_advanced_search.sql', 'r') as f:
        sql = f.read()
    
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
