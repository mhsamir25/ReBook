import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
MONGODB_USER = os.getenv("MONGODB_USER")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
host = os.getenv("MONGODB_HOST", "cluster0.l0dfh3l.mongodb.net")

async def main():
    import certifi
    uri = f"mongodb+srv://{MONGODB_USER}:{MONGODB_PASSWORD}@{host}/?retryWrites=true&w=majority&appName=Cluster0"
    print("Testing MongoDB upload directly...")
    client = AsyncIOMotorClient(uri, tlsCAFile=certifi.where())
    db = client.rebook
    try:
        await db.listing_images.update_one(
            {"listing_id": "26cf9b5e-c5dc-4970-9a0b-1cae638d1123"},
            {"$set": {"listing_id": "26cf9b5e-c5dc-4970-9a0b-1cae638d1123", "images": []}},
            upsert=True
        )
        print("Upload successful!")
    except Exception as e:
        print("Error type:", type(e))
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
