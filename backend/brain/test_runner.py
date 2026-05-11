import pytest
import asyncio
import uuid
import json
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.main import app
from app.db.models import Quiz, Question, AnswerOption, GameSession, GameParticipant
from app.core.security import create_access_token
from app.infrastructure.redis_client import get_redis

@pytest.fixture
def client():
    return TestClient(app)

@pytest.mark.asyncio
async def test_ws_auth_and_room_validation(client):
    with pytest.raises(Exception):
        with client.websocket_connect("/api/v1/ws/ANYROOM") as ws:
            pass
    token = create_access_token(user_id=str(uuid.uuid4()), username="test")
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/v1/ws/NONEXISTENT?token={token}") as ws:
            pass

@pytest.mark.asyncio
async def test_ws_full_gameplay_flow(client, db_session, test_user, other_user):
    quiz = Quiz(id=uuid.uuid4(), title="Integration Test Quiz", owner_id=test_user.id)
    db_session.add(quiz)
    q1 = Question(id=uuid.uuid4(), quiz_id=quiz.id, question_text="1+1=?", question_type="multiple_choice", order_index=0, time_limit_secs=2, points=100)
    db_session.add(q1)
    o1 = AnswerOption(id=uuid.uuid4(), question_id=q1.id, option_text="2", is_correct=True)
    o2 = AnswerOption(id=uuid.uuid4(), question_id=q1.id, option_text="3", is_correct=False)
    db_session.add(o1)
    db_session.add(o2)
    await db_session.commit()

    from app.services.room_service import room_service
    redis = await get_redis()
    room = await room_service.create_room(db_session, redis, test_user.id, quiz.id)
    await db_session.commit()
    room_code = room.room_code

    host_token = create_access_token(user_id=str(test_user.id), username=test_user.username)
    player_token = create_access_token(user_id=str(other_user.id), username=other_user.username)

    with client.websocket_connect(f"/api/v1/ws/{room_code}?token={host_token}") as ws_host:
        msg = ws_host.receive_json()
        assert msg["type"] == "ROOM_STATE"

        with client.websocket_connect(f"/api/v1/ws/{room_code}?token={player_token}") as ws_player:
            msg_p = ws_player.receive_json()
            assert msg_p["type"] == "ROOM_STATE"
            msg_h = ws_host.receive_json()
            assert msg_h["type"] == "PLAYER_JOINED"

            ws_host.send_json({"type": "START_GAME"})
            q_start_h = ws_host.receive_json()
            q_start_p = ws_player.receive_json()
            assert q_start_h["type"] == "QUESTION_START"

            ws_player.send_json({"type": "SUBMIT_ANSWER", "payload": {"question_id": str(q1.id), "selected_option_id": str(o1.id)}})
            ack = ws_player.receive_json()
            assert ack["type"] == "ANSWER_ACK"
            assert ack["payload"]["is_correct"] is True

            await asyncio.sleep(2.5)
            end_msg_h = ws_host.receive_json()
            assert end_msg_h["type"] == "QUESTION_END"

            await asyncio.sleep(3.5)
            over_msg_h = ws_host.receive_json()
            assert over_msg_h["type"] == "GAME_OVER"
