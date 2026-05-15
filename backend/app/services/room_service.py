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
                "quiz_id": str(room.quiz_id),
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

    async def kick_player(
        self,
        db: AsyncSession,
        redis: Redis,
        room_code: str,
        host_id: uuid.UUID,
        target_user_id: uuid.UUID
    ) -> bool:
        """
        Logic kick người chơi:
        1. Kiểm tra quyền Host.
        2. Thêm vào danh sách bị ban trong Redis (Set: game:banned:{room_code}).
        3. Phát tán event KICKED qua Pub/Sub.
        4. Phát tán event PLAYER_LEFT (từ ROOM_STATE) cho những người còn lại.
        """
        room_code_upper = room_code.upper()
        state_key = f"game:state:{room_code_upper}"
        
        actual_host_id = await redis.hget(state_key, "host_id")
        if not actual_host_id or uuid.UUID(actual_host_id) != host_id:
            return False

        # 1. Thêm vào danh sách ban (Set tồn tại trong 2 giờ)
        banned_key = f"game:banned:{room_code_upper}"
        await redis.sadd(banned_key, str(target_user_id))
        await redis.expire(banned_key, 7200)

        # 2. Xóa khỏi danh sách active
        active_key = f"game:active:{room_code_upper}"
        await redis.srem(active_key, str(target_user_id))

        # 3. Thông báo KICKED cho target player (để họ biết bị kick)
        # Đồng thời thông báo cho cả phòng biết
        from app.infrastructure.redis_client import publish_room_event
        await publish_room_event(room_code_upper, {
            "type": "KICKED",
            "payload": {
                "target_user_id": str(target_user_id),
                "message": "Bạn đã bị Host mời ra khỏi phòng."
            }
        })

        # 4. Gửi ROOM_STATE mới cập nhật cho cả phòng
        room = await db.scalar(
            select(GameSession).where(GameSession.room_code == room_code_upper)
        )
        if room:
            new_state = await self._build_room_state_payload(db, redis, room)
            # Chuyển type thành PLAYER_LEFT để UI cập nhật (hoặc dùng nguyên ROOM_STATE)
            new_state["type"] = "PLAYER_LEFT"
            await publish_room_event(room_code_upper, new_state)

        return True

    async def is_player_banned(self, redis: Redis, room_code: str, user_id: uuid.UUID) -> bool:
        """Kiểm tra người chơi có nằm trong danh sách bị ban của phòng không."""
        banned_key = f"game:banned:{room_code.upper()}"
        return await redis.sismember(banned_key, str(user_id))

room_service = RoomService()
