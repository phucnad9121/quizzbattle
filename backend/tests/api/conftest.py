import pytest_asyncio
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from httpx import AsyncClient, ASGITransport
import uuid

from app.db.models.base import Base
from app.main import app
from app.db.session import get_db
from app.core.security import create_access_token, hash_password
from app.db.models import User, Quiz, Question, AnswerOption, RefreshToken

TEST_DATABASE_URL = "postgresql+asyncpg://quizbattle:secret@postgres:5432/quizbattle_test"

from sqlalchemy.pool import NullPool

# We use the isolation_level to create the test DB if it doesn't exist
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    default_engine = create_async_engine("postgresql+asyncpg://quizbattle:secret@postgres:5432/postgres", isolation_level="AUTOCOMMIT")
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

@pytest_asyncio.fixture
async def client(db_session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
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
