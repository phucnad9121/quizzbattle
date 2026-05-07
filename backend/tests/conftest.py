from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock

import pytest
from faker import Faker

from app.core.security import hash_password
from app.services import auth_service


@pytest.fixture
def faker() -> Faker:
    return Faker()


@pytest.fixture
def fake_password() -> str:
    return "Secret12345"


@pytest.fixture
def fake_user(fake_password: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        username="testuser",
        email="test@example.com",
        hashed_password=hash_password(fake_password),
        is_active=True,
    )


@pytest.fixture
def mock_user_repo(monkeypatch: pytest.MonkeyPatch) -> AsyncMock:
    repo = AsyncMock()
    monkeypatch.setattr(auth_service, "UserRepository", lambda session: repo)
    return repo


@pytest.fixture
def auth_service_module():
    return auth_service
