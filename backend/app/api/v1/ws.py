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

    # 0. Kiểm tra xem người chơi có bị ban không
    redis = await get_redis()
    if await room_service.is_player_banned(redis, room_code, current_user.id):
        logger.warning("WS connection rejected: User is banned. room=%s user=%s", room_code, current_user.id)
        await ws.accept() # Chấp nhận rồi mới gửi lỗi được
        await ws.send_json({
            "type": "ERROR",
            "payload": {"message": "Bạn đã bị cấm truy cập vào phòng này."}
        })
        await ws.close(code=4003)
        return

    # 1. Chấp nhận kết nối và đăng ký vào ConnectionManager
    joined = False
    await manager.connect(ws, room_code, str(current_user.id))
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
            # Atomic check using a temporary Redis set to track total unique joiners
            redis = await get_redis()
            room_code_upper = room_code.upper()
            total_participants_key = f"game:total_participants:{room_code_upper}"
            user_id_str = str(current_user.id)
            
            # Thử "đăng ký" ID vào set (Trả về 1 nếu là người mới)
            is_new = await redis.sadd(total_participants_key, user_id_str)
            
            if is_new:
                # Kiểm tra lại tổng số lượng ngay lập tức
                current_total = await redis.scard(total_participants_key)
                MAX_PLAYERS = 20
                
                if current_total > MAX_PLAYERS:
                    # Nếu vượt quá, xóa "đăng ký" và từ chối
                    await redis.srem(total_participants_key, user_id_str)
                    logger.warning("Room full (Atomic): room=%s user=%s total=%d", room_code, current_user.id, current_total)
                    await ws.send_json({
                        "type": "ERROR", 
                        "payload": {"message": f"Phòng đã đầy! (Tối đa {MAX_PLAYERS} người)"}
                    })
                    await ws.close(code=4000)
                    return

            participant = GameParticipant(
                session_id=room.id,
                user_id=current_user.id,
                display_name=current_user.username,
                total_score=0
            )
            db.add(participant)
            await db.commit()
            await db.refresh(participant)

        # Sau khi đã chắc chắn là participant, cập nhật các bảng game khác
        redis = await get_redis()
        room_code_upper = room_code.upper()
        user_id_str = str(current_user.id)
        active_key = f"game:active:{room_code_upper}"
        
        await redis.sadd(active_key, user_id_str)
        # Điểm số (ZSET) - Đảm bảo đồng bộ với total_participants
        await redis.zincrby(f"game:leaderboard:{room_code_upper}", 0, user_id_str)
        # 2. Bảng tên (HASH) - Ánh xạ ID -> Name
        await redis.hset(f"game:names:{room_code_upper}", user_id_str, participant.display_name)

        # 3. Gửi ROOM_STATE ban đầu cho client vừa kết nối
        room_state = await room_service._build_room_state_payload(db, redis, room)
        await ws.send_json(room_state)

        # 4. Nếu join muộn vào game đang chạy, gửi luôn câu hiện tại để client sync state
        if room.status == "in_progress" and room.current_question_idx >= 0:
            import time
            start_ts = await redis.hget(state_key, "question_start_ts")
            elapsed = time.time() - float(start_ts) if start_ts else 0
            
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
                # Tính thời gian còn lại, không để nhỏ hơn 0
                remaining = max(0, current_question.time_limit_secs - elapsed)
                
                await ws.send_json({
                    "type": "QUESTION_START",
                    "payload": {
                        "quiz_id": str(room.quiz_id),
                        "question_id": str(current_question.id),
                        "question_idx": room.current_question_idx,
                        "total_questions": int((await redis.hget(state_key, "total_questions")) or 0),
                        "question_text": current_question.question_text,
                        "question_type": current_question.question_type,
                        "time_limit_secs": int(remaining), # Gửi thời gian còn lại thực tế
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
                
                elif event_type == "KICK_PLAYER":
                    payload = data.get("payload", {})
                    target_id_str = payload.get("target_user_id")
                    if target_id_str:
                        try:
                            target_uuid = uuid.UUID(target_id_str)
                            success = await room_service.kick_player(
                                db=db,
                                redis=redis,
                                room_code=room_code,
                                host_id=current_user.id,
                                target_user_id=target_uuid
                            )
                            if not success:
                                await ws.send_json({
                                    "type": "ERROR",
                                    "payload": {"message": "Bạn không có quyền kick người chơi này."}
                                })
                        except ValueError:
                            await ws.send_json({
                                "type": "ERROR",
                                "payload": {"message": "ID người chơi không hợp lệ."}
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