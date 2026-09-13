import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

MONGODB_USER = os.getenv("MONGODB_USER")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
MONGODB_URI = f"mongodb+srv://{MONGODB_USER}:{MONGODB_PASSWORD}@cluster0.l0dfh3l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
# ReBook has a free MongoDB cluster. Let's just create a global client.

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_client = MongoDB()

async def connect_to_mongo():
    if not MONGODB_USER:
        print("Warning: MongoDB user not set.")
        return
    
    # We might need the exact host if it's not cluster0, but often mongodb.net clusters have unique hosts.
    # Let's try to find MONGODB_HOST or construct the generic string.
    # If the user's cluster is free, it usually looks like cluster0.xxxx.mongodb.net
    # Without the host, motor might fail. But I'll use a placeholder or read MONGODB_HOST.
    host = os.getenv("MONGODB_HOST", "cluster0.l0dfh3l.mongodb.net")
    uri = os.getenv("MONGODB_URI", f"mongodb+srv://{MONGODB_USER}:{MONGODB_PASSWORD}@{host}/?retryWrites=true&w=majority&appName=Cluster0")
    
    db_client.client = AsyncIOMotorClient(uri, tlsCAFile=certifi.where())
    db_client.db = db_client.client.rebook

async def close_mongo_connection():
    if db_client.client:
        db_client.client.close()
