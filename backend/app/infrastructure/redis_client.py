# app/infrastructure/redis_client.py
import redis.asyncio as aioredis
from app.core.config import settings

_pool: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _pool

# ─────────────────────────────────────────────────
# Publish một event vào channel của phòng
async def publish_room_event(room_code: str, payload: dict):
    import json
    r = await get_redis()
    await r.publish(f"room:{room_code}", json.dumps(payload))

# ─────────────────────────────────────────────────
async def redis_subscriber_task(room_code: str):
    """
    Bridge kết nối giữa Redis Pub/Sub và WebSocket clients.
    Chạy như 1 asyncio task riêng cho mỗi phòng đang active trên worker này.
    """
    from app.infrastructure.connection_manager import manager
    import json
    import asyncio

    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(f"room:{room_code}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                
                # Broadcast cho tất cả clients trên worker này
                await manager.broadcast_room(room_code, data)
                
                # Nếu là sự kiện KICKED, ngắt kết nối target player nếu họ ở trên worker này
                if data.get("type") == "KICKED":
                    payload = data.get("payload", {})
                    target_id = payload.get("target_user_id")
                    if target_id:
                        await manager.disconnect_user(room_code, target_id)
            
            # Tự kết thúc task nếu phòng không còn ai tham gia trên worker này
            if manager.get_connection_count(room_code) == 0:
                break
    finally:
        # Đảm bảo dọn dẹp subscription
        await pubsub.unsubscribe(f"room:{room_code}")
        await pubsub.close()