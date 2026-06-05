import redis.asyncio as aioredis
from app.core.config import settings

redis_pool = aioredis.ConnectionPool(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True,
)

def get_redis_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=redis_pool)
