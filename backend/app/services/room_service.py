# app/services/room_service.py
import secrets
import string
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis
from app.db.models.game import GameSession, GameParticipant

class RoomService:
    def generate_room_code(self, length: int = 6) -> str:
        """Sinh mã phòng ngẫu nhiên 6 ký tự (A-Z, 0-9)."""
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))

    async def create_room(
        self, 
        db: AsyncSession, 
        redis: Redis, 
        host_id: uuid.UUID, 
        quiz_id: uuid.UUID
    ) -> GameSession:
        """
        Business logic tạo phòng chơi:
        1. Sinh mã phòng unique (retry tối đa 5 lần).
        2. Lưu GameSession vào DB.
        3. Khởi tạo trạng thái phòng trong Redis.
        """
        room_code = None
        state_key = ""
        
        for _ in range(5):
            candidate_code = self.generate_room_code()
            state_key = f"game:state:{candidate_code}"
            
            # Dùng hsetnx để atomic check+set trong Redis
            # Nếu trả về 1, nghĩa là key/field chưa tồn tại và đã được set thành công
            if await redis.hsetnx(state_key, "status", "waiting"):
                # Kiểm tra thêm trong DB để đảm bảo tuyệt đối không trùng (trường hợp Redis bị clear)
                result = await db.execute(
                    select(GameSession).where(GameSession.room_code == candidate_code)
                )
                if result.scalar_one_or_none() is None:
                    room_code = candidate_code
                    break
                else:
                    # Nếu trùng trong DB, xóa key tạm trong Redis và thử lại
                    await redis.delete(state_key)
        
        if not room_code:
            raise ValueError("Không thể tạo mã phòng unique sau 5 lần thử.")

        # 1. Lưu vào Database
        session = GameSession(
            quiz_id=quiz_id,
            host_id=host_id,
            room_code=room_code,
            status="waiting",
            current_question_idx=-1
        )
        db.add(session)
        # Flush để đảm bảo object hợp lệ và có ID nếu cần, commit sẽ do caller hoặc middleware xử lý
        await db.flush()

        # 2. Lưu các thông tin còn lại vào Redis Hash
        await redis.hset(state_key, mapping={
            "session_id": str(session.id),
            "quiz_id": str(quiz_id),
            "host_id": str(host_id),
            "current_question": "-1"
        })
        
        # 3. Set expire 2 giờ (7200 giây)
        await redis.expire(state_key, 7200)
        
        return session

    async def _build_room_state_payload(
        self,
        db: AsyncSession,
        redis: Redis,
        room: GameSession,
    ) -> dict:
        active_key = f"game:active:{room.room_code}"
        active_ids = await redis.smembers(active_key)
        participants: list[dict] = []

        if active_ids:
            active_uuid_list = [uuid.UUID(user_id) for user_id in active_ids]
            result = await db.execute(
                select(GameParticipant)
                .where(
                    GameParticipant.session_id == room.id,
                    GameParticipant.user_id.in_(active_uuid_list),
                )
                .order_by(GameParticipant.joined_at.asc())
            )
            participants = [
                {
                    "user_id": str(participant.user_id),
                    "display_name": participant.display_name,
                    "score": participant.total_score,
                }
                for participant in result.scalars().all()
            ]

        return {
            "type": "ROOM_STATE",
            "payload": {
                "room_code": room.room_code,
                "status": room.status,
                "host_id": str(room.host_id),
                "is_latejoiner": room.status == "in_progress",
                "participants": participants,
            },
        }

    async def handle_player_leave(
        self,
        db: AsyncSession,
        redis: Redis,
        room_code: str,
        leaving_user_id: uuid.UUID,
    ) -> dict | None:
        room = await db.scalar(
            select(GameSession).where(GameSession.room_code == room_code.upper())
        )
        if not room:
            return None

        state_key = f"game:state:{room.room_code}"
        active_key = f"game:active:{room.room_code}"
        await redis.srem(active_key, str(leaving_user_id))

        # Chỉ cập nhật trạng thái "active" trong Redis. 
        # Không tự động chuyển Host hoặc kết thúc game khi ngắt kết nối tạm thời (chuyển trang).
        # Game sẽ kết thúc khi hết câu hỏi hoặc Host chủ động đóng phòng.
        return await self._build_room_state_payload(db, redis, room)

room_service = RoomService()
