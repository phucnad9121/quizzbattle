# app/infrastructure/connection_manager.py
from collections import defaultdict
from fastapi import WebSocket
import asyncio

class ConnectionManager:
    def __init__(self):
        # room_code → {user_id: WebSocket}
        self._rooms: dict[str, dict[str, WebSocket]] = defaultdict(dict)
        # room_code → subscriber task
        self._tasks: dict[str, asyncio.Task] = {}

    async def connect(self, ws: WebSocket, room_code: str, user_id: str):
        await ws.accept()
        self._rooms[room_code][user_id] = ws
        
        # Nếu chưa có task subscribe cho phòng này, khởi tạo 1 cái
        if room_code not in self._tasks or self._tasks[room_code].done():
            from app.infrastructure.redis_client import redis_subscriber_task
            self._tasks[room_code] = asyncio.create_task(redis_subscriber_task(room_code))

    def disconnect(self, ws: WebSocket, room_code: str):
        # Tìm và xóa user_id tương ứng với ws này
        user_id_to_remove = None
        for uid, websocket in self._rooms[room_code].items():
            if websocket == ws:
                user_id_to_remove = uid
                break
        
        if user_id_to_remove:
            del self._rooms[room_code][user_id_to_remove]

        if not self._rooms[room_code]:
            if room_code in self._rooms:
                del self._rooms[room_code]

            task = self._tasks.pop(room_code, None)
            if task and not task.done():
                task.cancel()

    async def disconnect_user(self, room_code: str, user_id: str, message: dict | None = None):
        """Chủ động ngắt kết nối một người dùng cụ thể."""
        ws = self._rooms[room_code].get(user_id)
        if ws:
            if message:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass
            await ws.close(code=4000)
            self.disconnect(ws, room_code)

    async def broadcast_room(self, room_code: str, message: dict):
        """Gửi tới tất cả WS clients trong phòng (cùng worker)."""
        if room_code not in self._rooms:
            return

        dead_users = []
        for user_id, ws in self._rooms[room_code].items():
            try:
                await ws.send_json(message)
            except Exception:
                dead_users.append(user_id)
        
        for user_id in dead_users:
            if user_id in self._rooms[room_code]:
                del self._rooms[room_code][user_id]
        
        if not self._rooms[room_code]:
            del self._rooms[room_code]

    def get_connection_count(self, room_code: str) -> int:
        """Lấy số lượng WS đang active trong phòng này tại worker này."""
        return len(self._rooms.get(room_code, {}))

manager = ConnectionManager()   # Singleton per-process