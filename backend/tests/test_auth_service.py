from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.security import create_refresh_token, hash_refresh_token
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services import auth_service


@pytest.mark.asyncio
async def test_register_happy_path(mock_user_repo: AsyncMock, faker) -> None:
    data = RegisterRequest(
        username=faker.user_name(),
        email=faker.email(),
        password="Secret12345",
    )
    created_user = SimpleNamespace(
        id=uuid4(),
        username=data.username,
        email=data.email,
        avatar_url=None,
        is_active=True,
    )

    mock_user_repo.exists_email = AsyncMock(return_value=False)
    mock_user_repo.exists_username = AsyncMock(return_value=False)
    mock_user_repo.create = AsyncMock(return_value=created_user)

    session = AsyncMock()
    result = await auth_service.register_user(session, data)

    assert result == created_user
    args, kwargs = mock_user_repo.create.await_args
    user_in = args[0]
    assert user_in.username == data.username
    assert user_in.email == data.email
    assert kwargs["hashed_password"].startswith("$2b$")


@pytest.mark.asyncio
async def test_register_duplicate_email(mock_user_repo: AsyncMock, faker) -> None:
    data = RegisterRequest(
        username=faker.user_name(),
        email=faker.email(),
        password="Secret12345",
    )
    mock_user_repo.exists_email = AsyncMock(return_value=True)

    with pytest.raises(HTTPException) as exc:
        await auth_service.register_user(AsyncMock(), data)

    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_register_duplicate_username(mock_user_repo: AsyncMock, faker) -> None:
    data = RegisterRequest(
        username=faker.user_name(),
        email=faker.email(),
        password="Secret12345",
    )
    mock_user_repo.exists_email = AsyncMock(return_value=False)
    mock_user_repo.exists_username = AsyncMock(return_value=True)

    with pytest.raises(HTTPException) as exc:
        await auth_service.register_user(AsyncMock(), data)

    assert exc.value.status_code == 409


def test_register_invalid_password(faker) -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(
            username=faker.user_name(),
            email=faker.email(),
            password="short",
        )


@pytest.mark.asyncio
async def test_login_happy_path(
    mock_user_repo: AsyncMock,
    fake_user: SimpleNamespace,
    fake_password: str,
) -> None:
    mock_user_repo.get_by_email = AsyncMock(return_value=fake_user)
    mock_user_repo.save_refresh_token = AsyncMock()

    data = LoginRequest(email=fake_user.email, password=fake_password)
    result = await auth_service.login_user(AsyncMock(), data)

    assert result.access_token
    assert result.refresh_token
    assert result.token_type == "bearer"

    token_args = mock_user_repo.save_refresh_token.await_args.kwargs
    assert token_args["token_hash"] == hash_refresh_token(result.refresh_token)


@pytest.mark.asyncio
async def test_login_wrong_password(
    mock_user_repo: AsyncMock,
    fake_user: SimpleNamespace,
) -> None:
    mock_user_repo.get_by_email = AsyncMock(return_value=fake_user)

    data = LoginRequest(email=fake_user.email, password="WrongPass123")
    with pytest.raises(HTTPException) as exc:
        await auth_service.login_user(AsyncMock(), data)

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_login_wrong_email(mock_user_repo: AsyncMock, faker) -> None:
    mock_user_repo.get_by_email = AsyncMock(return_value=None)

    data = LoginRequest(email=faker.email(), password="Secret12345")
    with pytest.raises(HTTPException) as exc:
        await auth_service.login_user(AsyncMock(), data)

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_account(
    mock_user_repo: AsyncMock,
    fake_user: SimpleNamespace,
    fake_password: str,
) -> None:
    inactive_user = SimpleNamespace(**{**fake_user.__dict__, "is_active": False})
    mock_user_repo.get_by_email = AsyncMock(return_value=inactive_user)
    mock_user_repo.save_refresh_token = AsyncMock()

    data = LoginRequest(email=inactive_user.email, password=fake_password)
    with pytest.raises(HTTPException) as exc:
        await auth_service.login_user(AsyncMock(), data)

    assert exc.value.status_code == 403
    assert mock_user_repo.save_refresh_token.await_count == 0


@pytest.mark.asyncio
async def test_refresh_happy_path(
    mock_user_repo: AsyncMock,
    fake_user: SimpleNamespace,
) -> None:
    raw_token, token_hash, expires_at = create_refresh_token()
    token = SimpleNamespace(
        user_id=fake_user.id,
        token_hash=token_hash,
        revoked=False,
        expires_at=expires_at,
    )

    mock_user_repo.get_refresh_token_any = AsyncMock(return_value=token)
    mock_user_repo.get_refresh_token = AsyncMock(return_value=token)
    mock_user_repo.get_by_id = AsyncMock(return_value=fake_user)
    mock_user_repo.revoke_all_user_tokens = AsyncMock(return_value=1)
    mock_user_repo.save_refresh_token = AsyncMock()

    result = await auth_service.refresh_tokens(AsyncMock(), raw_token)

    assert result.access_token
    assert result.refresh_token
    assert result.refresh_token != raw_token
    mock_user_repo.revoke_all_user_tokens.assert_awaited_once_with(fake_user.id)


@pytest.mark.asyncio
async def test_refresh_revoked_token(
    mock_user_repo: AsyncMock,
    fake_user: SimpleNamespace,
) -> None:
    token = SimpleNamespace(user_id=fake_user.id, revoked=True)
    mock_user_repo.get_refresh_token_any = AsyncMock(return_value=token)
    mock_user_repo.revoke_all_user_tokens = AsyncMock(return_value=1)

    with pytest.raises(HTTPException) as exc:
        await auth_service.refresh_tokens(AsyncMock(), "raw_token")

    assert exc.value.status_code == 401
    mock_user_repo.revoke_all_user_tokens.assert_awaited_once_with(fake_user.id)


@pytest.mark.asyncio
async def test_refresh_expired_token(
    mock_user_repo: AsyncMock,
    fake_user: SimpleNamespace,
) -> None:
    token = SimpleNamespace(user_id=fake_user.id, revoked=False)
    mock_user_repo.get_refresh_token_any = AsyncMock(return_value=token)
    mock_user_repo.get_refresh_token = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await auth_service.refresh_tokens(AsyncMock(), "raw_token")

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_missing_token(mock_user_repo: AsyncMock) -> None:
    mock_user_repo.get_refresh_token_any = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await auth_service.refresh_tokens(AsyncMock(), "raw_token")

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_logout_happy_path(
    mock_user_repo: AsyncMock,
    fake_user: SimpleNamespace,
) -> None:
    token = SimpleNamespace(user_id=fake_user.id, revoked=False)
    mock_user_repo.get_refresh_token_any = AsyncMock(return_value=token)
    mock_user_repo.revoke_refresh_token = AsyncMock()

    await auth_service.logout_user(AsyncMock(), str(fake_user.id), "raw_token")

    mock_user_repo.revoke_refresh_token.assert_awaited_once()


@pytest.mark.asyncio
async def test_logout_already_logged_out(
    mock_user_repo: AsyncMock,
    fake_user: SimpleNamespace,
) -> None:
    token = SimpleNamespace(user_id=fake_user.id, revoked=True)
    mock_user_repo.get_refresh_token_any = AsyncMock(return_value=token)

    with pytest.raises(HTTPException) as exc:
        await auth_service.logout_user(AsyncMock(), str(fake_user.id), "raw_token")

    assert exc.value.status_code == 401
