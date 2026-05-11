# app/infrastructure/connection_manager.py
from collections import defaultdict
from fastapi import WebSocket
import asyncio

class ConnectionManager:
    def __init__(self):
        # room_code → set of WebSocket
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        # room_code → subscriber task
        self._tasks: dict[str, asyncio.Task] = {}

    async def connect(self, ws: WebSocket, room_code: str):
        await ws.accept()
        self._rooms[room_code].add(ws)
        
        # Nếu chưa có task subscribe cho phòng này, khởi tạo 1 cái
        if room_code not in self._tasks or self._tasks[room_code].done():
            from app.infrastructure.redis_client import redis_subscriber_task
            self._tasks[room_code] = asyncio.create_task(redis_subscriber_task(room_code))

    def disconnect(self, ws: WebSocket, room_code: str):
        self._rooms[room_code].discard(ws)
        if not self._rooms[room_code]:
            # Xóa phòng khỏi map nếu trống
            if room_code in self._rooms:
                del self._rooms[room_code]

            task = self._tasks.pop(room_code, None)
            if task and not task.done():
                task.cancel()

    async def broadcast_room(self, room_code: str, message: dict):
        """Gửi tới tất cả WS clients trong phòng (cùng worker)."""
        if room_code not in self._rooms:
            return

        dead = set()
        for ws in self._rooms[room_code]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        
        self._rooms[room_code] -= dead
        if not self._rooms[room_code]:
            del self._rooms[room_code]

    def get_connection_count(self, room_code: str) -> int:
        """Lấy số lượng WS đang active trong phòng này tại worker này."""
        return len(self._rooms.get(room_code, []))

manager = ConnectionManager()   # Singleton per-process