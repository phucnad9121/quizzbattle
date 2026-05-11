# app/api/v1/ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.infrastructure.connection_manager import manager
from app.infrastructure.redis_client import publish_room_event
from app.db.session import get_db
from app.api.deps import get_current_user_ws, get_room_ws
from app.db.models import GameParticipant

router = APIRouter()

@router.websocket("/ws/{room_code}")
async def websocket_endpoint(
    ws: WebSocket,
    room_code: str,
    token: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint chính cho phòng chơi:
    1. Xác thực qua token trong query param (deps handle).
    2. Kiểm tra phòng tồn tại (deps handle).
    3. Join room, gửi ROOM_STATE hiện tại.
    4. Broadcast PLAYER_JOINED.
    5. Xử lý các sự kiện In-game.
    """
    current_user = await get_current_user_ws(ws, token=token, session=db)
    if not current_user:
        return # Close đã được xử lý trong dependency helper

    room = await get_room_ws(ws, room_code=room_code, session=db)
    if not room:
        return # Close đã được xử lý trong dependencies

    # 1. Chấp nhận kết nối và đăng ký vào ConnectionManager
    await manager.connect(ws, room_code)

    try:
        # 2. Đăng ký participant vào DB nếu chưa có
        # Lưu ý: Với websocket, ta cần commit thủ công vì dependency session chỉ commit khi endpoint kết thúc
        stmt = select(GameParticipant).where(
            GameParticipant.session_id == room.id,
            GameParticipant.user_id == current_user.id
        )
        res = await db.execute(stmt)
        participant = res.scalar_one_or_none()
        
        if not participant:
            participant = GameParticipant(
                session_id=room.id,
                user_id=current_user.id,
                display_name=current_user.username,
                total_score=0
            )
            db.add(participant)
            await db.commit()
            await db.refresh(participant)

        # 3. Lấy danh sách tất cả người chơi trong phòng hiện tại
        stmt_all = select(GameParticipant).where(GameParticipant.session_id == room.id)
        res_all = await db.execute(stmt_all)
        participants = res_all.scalars().all()

        # 4. Gửi ROOM_STATE ban đầu cho client vừa kết nối
        await ws.send_json({
            "type": "ROOM_STATE",
            "payload": {
                "room_code": room_code,
                "status": room.status, # 'waiting', 'in_progress', 'finished'
                "is_latejoiner": room.status == "in_progress",
                "participants": [
                    {
                        "user_id": str(p.user_id), 
                        "display_name": p.display_name, 
                        "score": p.total_score
                    } for p in participants
                ]
            }
        })

        # 5. Thông báo cho các người chơi khác qua Redis
        await publish_room_event(room_code, {
            "type": "PLAYER_JOINED",
            "payload": {
                "user_id": str(current_user.id),
                "display_name": current_user.username,
                "score": participant.total_score
            }
        })

        # 6. Vòng lặp nhận tin nhắn từ client
        from app.services.game_service import game_service
        from app.infrastructure.redis_client import get_redis
        redis = await get_redis()

        while True:
            data = await ws.receive_json()
            event_type = data.get("type")
            
            if event_type == "START_GAME":
                await game_service.start_game(db, redis, room_code, current_user.id)
            
            elif event_type == "SUBMIT_ANSWER":
                payload = data.get("payload", {})
                try:
                    result = await game_service.process_answer(
                        db=db,
                        redis=redis,
                        room_code=room_code,
                        user_id=current_user.id,
                        question_id=uuid.UUID(payload.get("question_id")),
                        selected_option_id=uuid.UUID(payload.get("selected_option_id")) if payload.get("selected_option_id") else None
                    )
                    # Gửi ACK cho riêng người chơi này
                    await ws.send_json({
                        "type": "ANSWER_ACK",
                        "payload": result
                    })
                except Exception as e:
                    await ws.send_json({
                        "type": "ERROR",
                        "payload": {"message": f"Lỗi xử lý đáp án: {str(e)}"}
                    })
            
    except WebSocketDisconnect:
        manager.disconnect(ws, room_code)
        # Thông báo người chơi rời phòng
        await publish_room_event(room_code, {
            "type": "PLAYER_LEFT",
            "payload": {"user_id": str(current_user.id)}
        })