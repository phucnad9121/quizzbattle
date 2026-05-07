from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.core.security import (
    AccessTokenData,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_hash_password_format() -> None:
    hashed = hash_password("Secret12345")
    assert hashed.startswith("$2b$")


def test_verify_password() -> None:
    hashed = hash_password("Secret12345")
    assert verify_password("Secret12345", hashed) is True
    assert verify_password("WrongPass", hashed) is False


def test_access_token_roundtrip() -> None:
    token = create_access_token("user-id", "tester")
    data = decode_access_token(token)
    assert isinstance(data, AccessTokenData)
    assert data.user_id == "user-id"
    assert data.username == "tester"


def test_access_token_expired() -> None:
    token = create_access_token("user-id", "tester", expires_minutes=-1)
    with pytest.raises(ValueError):
        decode_access_token(token)


def test_access_token_tampered() -> None:
    token = create_access_token("user-id", "tester")
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
    with pytest.raises(ValueError):
        decode_access_token(tampered)


def test_refresh_token_generation() -> None:
    raw_token, token_hash, expires_at = create_refresh_token()
    assert isinstance(raw_token, str)
    assert isinstance(token_hash, str)
    assert token_hash == hash_refresh_token(raw_token)
    assert expires_at > datetime.now(timezone.utc)
