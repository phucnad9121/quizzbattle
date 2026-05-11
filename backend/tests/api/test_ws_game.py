import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_access_token, hash_password
from app.db.models import AnswerOption, Question, Quiz, User
from app.main import app


async def seed_user(db_session, *, username: str, email: str) -> User:
    user = User(
        id=uuid.uuid4(),
        username=username,
        email=email,
        hashed_password=hash_password("secret"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_ws_connect_valid_and_invalid_token(client, setup_test_db, fake_redis):
    session_factory = async_sessionmaker(setup_test_db, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as seed_session:
        host = await seed_user(seed_session, username="host_valid", email="host_valid@test.com")
        quiz = Quiz(id=uuid.uuid4(), title="WS Quiz", owner_id=host.id)
        seed_session.add(quiz)
        await seed_session.flush()

        from app.services.room_service import room_service

        room = await room_service.create_room(seed_session, fake_redis, host.id, quiz.id)
        await seed_session.commit()

    valid_token = create_access_token(user_id=str(host.id), username=host.username)
    with client.websocket_connect(f"/api/v1/ws/{room.room_code}?token={valid_token}") as ws:
        room_state = ws.receive_json()
        assert room_state["type"] == "ROOM_STATE"
        join_self = ws.receive_json()
        assert join_self["type"] == "PLAYER_JOINED"
        assert join_self["payload"]["user_id"] == str(host.id)

    invalid_token = create_access_token(user_id=str(uuid.uuid4()), username="ghost")
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/api/v1/ws/{room.room_code}?token={invalid_token}") as ws:
            ws.receive_json()
    assert exc_info.value.code == 4001


@pytest.mark.asyncio
async def test_ws_gameplay_join_start_answer_disconnect(client, setup_test_db, fake_redis):
    session_factory = async_sessionmaker(setup_test_db, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as seed_session:
        host = await seed_user(seed_session, username="host_game", email="host_game@test.com")
        player = await seed_user(seed_session, username="player_game", email="player_game@test.com")

        quiz = Quiz(id=uuid.uuid4(), title="WS Quiz", owner_id=host.id)
        seed_session.add(quiz)
        await seed_session.flush()

        question = Question(
            id=uuid.uuid4(),
            quiz_id=quiz.id,
            question_text="1+1=?",
            question_type="multiple_choice",
            order_index=0,
            time_limit_secs=5,
            points=100,
        )
        seed_session.add(question)
        await seed_session.flush()

        correct_option = AnswerOption(
            id=uuid.uuid4(),
            question_id=question.id,
            option_text="2",
            is_correct=True,
        )
        wrong_option = AnswerOption(
            id=uuid.uuid4(),
            question_id=question.id,
            option_text="3",
            is_correct=False,
        )
        seed_session.add(correct_option)
        seed_session.add(wrong_option)
        await seed_session.flush()

        from app.services.room_service import room_service

        room = await room_service.create_room(seed_session, fake_redis, host.id, quiz.id)
        await seed_session.commit()

    host_token = create_access_token(user_id=str(host.id), username=host.username)
    player_token = create_access_token(user_id=str(player.id), username=player.username)

    with client.websocket_connect(f"/api/v1/ws/{room.room_code}?token={host_token}") as ws_host:
        host_state = ws_host.receive_json()
        assert host_state["type"] == "ROOM_STATE"
        host_self_join = ws_host.receive_json()
        assert host_self_join["type"] == "PLAYER_JOINED"
        assert host_self_join["payload"]["user_id"] == str(host.id)

        with client.websocket_connect(f"/api/v1/ws/{room.room_code}?token={player_token}") as ws_player:
            player_state = ws_player.receive_json()
            assert player_state["type"] == "ROOM_STATE"
            player_self_join = ws_player.receive_json()
            assert player_self_join["type"] == "PLAYER_JOINED"
            assert player_self_join["payload"]["user_id"] == str(player.id)

            host_join = ws_host.receive_json()
            assert host_join["type"] == "PLAYER_JOINED"
            assert host_join["payload"]["user_id"] == str(player.id)

            ws_host.send_json({"type": "START_GAME"})
            host_question = ws_host.receive_json()
            player_question = ws_player.receive_json()
            assert host_question["type"] == "QUESTION_START"
            assert player_question["type"] == "QUESTION_START"
            assert host_question["payload"]["question_text"] == "1+1=?"
            assert player_question["payload"]["question_text"] == "1+1=?"

            ws_player.send_json(
                {
                    "type": "SUBMIT_ANSWER",
                    "payload": {
                        "question_id": str(question.id),
                        "selected_option_id": str(correct_option.id),
                    },
                }
            )
            ack = ws_player.receive_json()
            assert ack["type"] == "ANSWER_ACK"
            assert ack["payload"]["is_correct"] is True

            ws_player.close()
            left = ws_host.receive_json()
            assert left["type"] == "PLAYER_LEFT"
            assert left["payload"]["user_id"] == str(player.id)
