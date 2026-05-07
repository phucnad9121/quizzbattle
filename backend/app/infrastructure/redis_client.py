# app/infrastructure/redis_client.py
import redis.asyncio as aioredis
from app.core.config import settings

_pool: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _pool

# ─────────────────────────────────────────────────
# Publish một event vào channel của phòng
async def publish_room_event(room_code: str, payload: dict):
    import json
    r = await get_redis()
    await r.publish(f"room:{room_code}", json.dumps(payload))

# ─────────────────────────────────────────────────
# Background task: subscribe và forward tới WS clients
async def redis_subscriber_task(room_code: str):
    """Chạy song song với WebSocket endpoint, mỗi phòng 1 task."""
    from app.infrastructure.connection_manager import manager
    import json, asyncio

    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(f"room:{room_code}")

    async for message in pubsub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            await manager.broadcast_room(room_code, data)