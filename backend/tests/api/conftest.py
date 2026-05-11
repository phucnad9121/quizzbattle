import os
import pytest_asyncio
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
import uuid

from app.infrastructure.connection_manager import manager
from app.infrastructure import redis_client as redis_client_module
from app.db.models.base import Base
from app.main import app
from app.db.session import get_db
from app.core.security import create_access_token, hash_password
from app.db.models import User, Quiz, Question, AnswerOption, RefreshToken

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://quizbattle:secret@postgres:5432/quizbattle_test",
)
TEST_DATABASE_ADMIN_URL = os.getenv(
    "TEST_DATABASE_ADMIN_URL",
    "postgresql+asyncpg://quizbattle:secret@postgres:5432/postgres",
)

from sqlalchemy.pool import NullPool


class FakeRedis:
    def __init__(self):
        self._hashes: dict[str, dict[str, str]] = {}
        self._sets: dict[str, set[str]] = {}
        self._zsets: dict[str, dict[str, float]] = {}

    async def hsetnx(self, key: str, field: str, value: str):
        bucket = self._hashes.setdefault(key, {})
        if field in bucket:
            return 0
        bucket[field] = str(value)
        return 1

    async def hset(self, key: str, field=None, value=None, mapping=None):
        bucket = self._hashes.setdefault(key, {})
        if mapping is not None:
            for map_key, map_value in mapping.items():
                bucket[str(map_key)] = str(map_value)
            return len(mapping)
        if field is not None:
            bucket[str(field)] = str(value)
            return 1
        return 0

    async def hget(self, key: str, field: str):
        return self._hashes.get(key, {}).get(field)

    async def hgetall(self, key: str):
        return dict(self._hashes.get(key, {}))

    async def expire(self, key: str, seconds: int):
        return True

    async def delete(self, key: str):
        removed = int(key in self._hashes) + int(key in self._sets) + int(key in self._zsets)
        self._hashes.pop(key, None)
        self._sets.pop(key, None)
        self._zsets.pop(key, None)
        return removed

    async def sadd(self, key: str, *values: str):
        bucket = self._sets.setdefault(key, set())
        before = len(bucket)
        bucket.update(str(value) for value in values)
        return len(bucket) - before

    async def sismember(self, key: str, value: str):
        return str(value) in self._sets.get(key, set())

    async def zincrby(self, key: str, amount: int | float, member: str):
        bucket = self._zsets.setdefault(key, {})
        bucket[member] = bucket.get(member, 0.0) + float(amount)
        return bucket[member]

    async def zrevrange(self, key: str, start: int, end: int, withscores: bool = False):
        items = sorted(self._zsets.get(key, {}).items(), key=lambda item: (-item[1], item[0]))
        sliced = items[start:] if end == -1 else items[start : end + 1]
        return sliced if withscores else [member for member, _score in sliced]


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    default_engine = create_async_engine(TEST_DATABASE_ADMIN_URL, isolation_level="AUTOCOMMIT")
    async with default_engine.connect() as conn:
        result = await conn.execute(text("SELECT 1 FROM pg_database WHERE datname='quizbattle_test'"))
        if not result.scalar():
            await conn.execute(text("CREATE DATABASE quizbattle_test"))
    await default_engine.dispose()

    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(setup_test_db):
    engine = setup_test_db
    connection = await engine.connect()
    transaction = await connection.begin()
    session = AsyncSession(bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False)
    
    yield session
    
    await session.close()
    await transaction.rollback()
    await connection.close()

@pytest_asyncio.fixture(autouse=True)
async def reset_connection_manager():
    manager._rooms.clear()
    manager._tasks.clear()
    yield
    manager._rooms.clear()
    manager._tasks.clear()


@pytest_asyncio.fixture
async def fake_redis(monkeypatch):
    fake = FakeRedis()

    from app.api.v1 import ws as ws_module
    from app.services import game_service as game_service_module

    async def fake_get_redis():
        return fake

    async def fake_publish_room_event(room_code: str, payload: dict):
        await manager.broadcast_room(room_code, payload)

    async def fake_subscriber_task(*_args, **_kwargs):
        return None

    monkeypatch.setattr(redis_client_module, "get_redis", fake_get_redis)
    monkeypatch.setattr(redis_client_module, "publish_room_event", fake_publish_room_event)
    monkeypatch.setattr(redis_client_module, "redis_subscriber_task", fake_subscriber_task)
    monkeypatch.setattr(ws_module, "publish_room_event", fake_publish_room_event)
    monkeypatch.setattr(game_service_module, "publish_room_event", fake_publish_room_event)
    monkeypatch.setattr(game_service_module.game_service, "question_timer", fake_subscriber_task)

    yield fake


@pytest_asyncio.fixture
async def client(setup_test_db):
    session_factory = async_sessionmaker(setup_test_db, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    from fastapi.testclient import TestClient
    with TestClient(app) as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def test_user(db_session):
    user = User(
        id=uuid.uuid4(),
        username="test_owner",
        email="owner@test.com",
        hashed_password=hash_password("secret"),
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()
    return user

@pytest_asyncio.fixture
async def test_token(test_user):
    return create_access_token(user_id=str(test_user.id), username=test_user.username)

@pytest_asyncio.fixture
async def auth_headers(test_token):
    return {"Authorization": f"Bearer {test_token}"}

@pytest_asyncio.fixture
async def other_user(db_session):
    user = User(
        id=uuid.uuid4(),
        username="other_user",
        email="other@test.com",
        hashed_password=hash_password("secret"),
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()
    return user

@pytest_asyncio.fixture
async def other_auth_headers(other_user):
    token = create_access_token(user_id=str(other_user.id), username=other_user.username)
    return {"Authorization": f"Bearer {token}"}
