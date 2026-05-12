# app/api/v1/ws.py
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

from app.infrastructure.connection_manager import manager
from app.infrastructure.redis_client import get_redis, publish_room_event
from app.db.session import get_db
from app.api.deps import get_current_user_ws, get_room_ws
from app.db.models import GameParticipant, Question
from app.services.room_service import room_service

router = APIRouter()
logger = logging.getLogger(__name__)

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
    logger.warning("WS connect attempt room=%s", room_code)

    current_user = await get_current_user_ws(ws, token=token, session=db)
    if not current_user:
        logger.warning("WS auth failed room=%s", room_code)
        return # Close đã được xử lý trong dependency helper

    room = await get_room_ws(ws, room_code=room_code, session=db)
    if not room:
        logger.warning("WS room lookup failed room=%s user=%s", room_code, current_user.id)
        return # Close đã được xử lý trong dependencies

    logger.warning("WS accepted room=%s user=%s", room_code, current_user.id)

    # 1. Chấp nhận kết nối và đăng ký vào ConnectionManager
    joined = False
    await manager.connect(ws, room_code)
    joined = True

    try:
        # 2. Đăng ký participant vào DB nếu chưa có
        # Lưu ý: Với websocket, ta cần commit thủ công vì dependency session chỉ commit khi endpoint kết thúc
        state_key = f"game:state:{room_code.upper()}"
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

        redis = await get_redis()
        active_key = f"game:active:{room_code.upper()}"
        await redis.sadd(active_key, str(current_user.id))

        # Khởi tạo điểm 0 và lưu tên vào bảng ánh xạ
        user_id_str = str(current_user.id)
        room_code_upper = room_code.upper()
        
        # 1. Điểm số (ZSET) - Chỉ dùng ID
        await redis.zincrby(f"game:leaderboard:{room_code_upper}", 0, user_id_str)
        # 2. Bảng tên (HASH) - Ánh xạ ID -> Name
        await redis.hset(f"game:names:{room_code_upper}", user_id_str, participant.display_name)

        # 3. Gửi ROOM_STATE ban đầu cho client vừa kết nối
        room_state = await room_service._build_room_state_payload(db, redis, room)
        await ws.send_json(room_state)

        # 4. Nếu join muộn vào game đang chạy, gửi luôn câu hiện tại để client sync state
        if room.status == "in_progress" and room.current_question_idx >= 0:
            stmt_current = (
                select(Question)
                .where(
                    Question.quiz_id == room.quiz_id,
                    Question.order_index == room.current_question_idx,
                )
                .options(selectinload(Question.options))
            )
            current_res = await db.execute(stmt_current)
            current_question = current_res.scalar_one_or_none()
            if current_question:
                await ws.send_json({
                    "type": "QUESTION_START",
                    "payload": {
                        "quiz_id": str(room.quiz_id),
                        "question_id": str(current_question.id),
                        "question_idx": room.current_question_idx,
                        "total_questions": int((await redis.hget(state_key, "total_questions")) or 0),
                        "question_text": current_question.question_text,
                        "question_type": current_question.question_type,
                        "time_limit_secs": current_question.time_limit_secs,
                        "points": current_question.points,
                        "options": [
                            {"id": str(option.id), "option_text": option.option_text}
                            for option in current_question.options
                        ],
                    }
                })

        # 5. Thông báo cho các người chơi khác qua Redis
        logger.warning("WS publish PLAYER_JOINED room=%s user=%s", room_code, current_user.id)
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

        while True:
            try:
                data = await ws.receive_json()
                event_type = data.get("type")
                logger.warning("WS event room=%s user=%s type=%s", room_code, current_user.id, event_type)
                
                if event_type == "START_GAME":
                    await game_service.start_game(db, redis, room_code, current_user.id)
                
                elif event_type == "SKIP_QUESTION":
                    await game_service.skip_question(db, redis, room_code, current_user.id)
                
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
                        logger.error("Error processing answer: %s", e)
                        await ws.send_json({
                            "type": "ERROR",
                            "payload": {"message": f"Lỗi xử lý đáp án: {str(e)}"}
                        })
                
                elif event_type == "CHAT_MESSAGE":
                    payload = data.get("payload", {})
                    text = payload.get("text", "").strip()
                    if text and len(text) <= 200:
                        from datetime import datetime
                        await publish_room_event(room_code, {
                            "type": "CHAT_MESSAGE",
                            "payload": {
                                "user_id": str(current_user.id),
                                "username": current_user.username,
                                "text": text,
                                "timestamp": datetime.now().isoformat()
                            }
                        })
            except WebSocketDisconnect:
                raise
            except Exception as e:
                logger.exception("Error in WS message loop room=%s", room_code)
                await ws.send_json({
                    "type": "ERROR",
                    "payload": {"message": "Lỗi xử lý yêu cầu"}
                })
            
    except WebSocketDisconnect:
        logger.warning("WS disconnect room=%s user=%s", room_code, current_user.id)
        redis = await get_redis()
        leave_event = await room_service.handle_player_leave(db, redis, room_code, current_user.id)
        if leave_event:
            await publish_room_event(room_code, leave_event)
    except Exception:
        logger.exception("WS unexpected error room=%s", room_code)

    finally:
        if joined:
            redis = await get_redis()
            await redis.srem(f"game:active:{room_code.upper()}", str(current_user.id))
            manager.disconnect(ws, room_code)
        logger.warning("WS closed room=%s", room_code)