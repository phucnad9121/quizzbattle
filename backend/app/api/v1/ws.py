# app/api/v1/ws.py
import asyncio, json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.infrastructure.connection_manager import manager
from app.infrastructure.redis_client import publish_room_event, redis_subscriber_task
from app.services.game_service import GameService
from app.api.deps import get_current_user_ws

router = APIRouter()

@router.websocket("/ws/{room_code}")
async def websocket_endpoint(
    ws: WebSocket,
    room_code: str,
    current_user = Depends(get_current_user_ws),
    game_svc: GameService = Depends(),
):
    await manager.connect(ws, room_code)

    # Khởi chạy subscriber nếu phòng chưa có
    sub_task = asyncio.create_task(redis_subscriber_task(room_code))

    # Thông báo player mới join
    await publish_room_event(room_code, {
        "type": "PLAYER_JOINED",
        "payload": {"user_id": str(current_user.id), "username": current_user.username}
    })

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            event_type = data.get("type")

            # ── Xử lý các loại event từ client ──────────
            if event_type == "SUBMIT_ANSWER":
                result = await game_svc.process_answer(
                    room_code=room_code,
                    user_id=current_user.id,
                    **data["payload"]
                )
                # Publish kết quả cho cả phòng
                await publish_room_event(room_code, {
                    "type": "ANSWER_RESULT",
                    "payload": result
                })

            elif event_type == "START_GAME":
                await game_svc.start_game(room_code, current_user.id)

            elif event_type == "CHAT_MESSAGE":   # Bonus
                await publish_room_event(room_code, {
                    "type": "CHAT_MESSAGE",
                    "payload": {
                        "username": current_user.username,
                        "text": data["payload"]["text"]
                    }
                })

    except WebSocketDisconnect:
        manager.disconnect(ws, room_code)
        await publish_room_event(room_code, {
            "type": "PLAYER_LEFT",
            "payload": {"user_id": str(current_user.id)}
        })
    finally:
        sub_task.cancel()