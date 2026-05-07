# app/infrastructure/connection_manager.py
from collections import defaultdict
from fastapi import WebSocket
import asyncio

class ConnectionManager:
    def __init__(self):
        # room_code → set of WebSocket
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, ws: WebSocket, room_code: str):
        await ws.accept()
        self._rooms[room_code].add(ws)

    def disconnect(self, ws: WebSocket, room_code: str):
        self._rooms[room_code].discard(ws)

    async def broadcast_room(self, room_code: str, message: dict):
        """Gửi tới tất cả WS clients trong phòng (cùng worker)."""
        dead = set()
        for ws in self._rooms[room_code]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        self._rooms[room_code] -= dead

manager = ConnectionManager()   # Singleton per-process