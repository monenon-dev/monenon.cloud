"""JWT 발급·검증·리프레시 재사용 거부 테스트."""

from __future__ import annotations

import base64
import json
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from core.security import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    verify_token,
)


@pytest.fixture(scope="module")
def rsa_env():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    pub = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    old = {
        "JWT_PRIVATE_KEY": os.environ.get("JWT_PRIVATE_KEY"),
        "JWT_PUBLIC_KEY": os.environ.get("JWT_PUBLIC_KEY"),
    }
    os.environ["JWT_PRIVATE_KEY"] = priv
    os.environ["JWT_PUBLIC_KEY"] = pub
    yield priv, pub
    for k, v in old.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


def test_verify_with_public_key_only(rsa_env):
    token = create_access_token("1", ["user"], "monenon-api", expires_min=5)
    payload = verify_token(token, aud="monenon-api")
    assert payload.sub == "1"
    assert "user" in payload.roles


def test_aud_mismatch_rejected(rsa_env):
    token = create_access_token("1", ["user"], "monenon-api", expires_min=5)
    with pytest.raises(jwt.InvalidAudienceError):
        verify_token(token, aud="other-service")


def test_expired_token_rejected(rsa_env):
    priv, _pub = rsa_env
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": "1",
            "roles": ["user"],
            "aud": "monenon-api",
            "exp": now - timedelta(minutes=1),
            "iat": now - timedelta(minutes=11),
            "jti": "expired-jti",
        },
        priv,
        algorithm="RS256",
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        verify_token(token, aud="monenon-api")


def test_tampered_signature_rejected(rsa_env):
    token = create_access_token("1", ["user"], "monenon-api", expires_min=5)
    parts = token.split(".")
    pad = "=" * (-len(parts[1]) % 4)
    raw = json.loads(base64.urlsafe_b64decode(parts[1] + pad))
    raw["roles"] = ["admin"]
    new_payload = (
        base64.urlsafe_b64encode(json.dumps(raw, separators=(",", ":")).encode())
        .rstrip(b"=")
        .decode()
    )
    bad = f"{parts[0]}.{new_payload}.{parts[2]}"
    with pytest.raises(jwt.InvalidSignatureError):
        verify_token(bad, aud="monenon-api")


def test_alg_none_rejected(rsa_env):
    token = jwt.encode(
        {
            "sub": "1",
            "roles": ["admin"],
            "aud": "monenon-api",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            "iat": datetime.now(timezone.utc),
            "jti": "none-jti",
        },
        key=None,
        algorithm="none",
    )
    with pytest.raises(jwt.PyJWTError):
        verify_token(token, aud="monenon-api")


def test_hs256_forced_rejected(rsa_env):
    token = jwt.encode(
        {
            "sub": "1",
            "roles": ["admin"],
            "aud": "monenon-api",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            "iat": datetime.now(timezone.utc),
            "jti": "hs-jti",
        },
        "secret",
        algorithm="HS256",
    )
    with pytest.raises(jwt.PyJWTError):
        verify_token(token, aud="monenon-api")


@pytest.mark.asyncio
async def test_refresh_reuse_revokes_all(rsa_env):
    from auth import services

    refresh = create_refresh_token("42", expires_days=1)
    payload = verify_refresh_token(refresh)

    mock_r = AsyncMock()
    mock_r.get = AsyncMock(return_value=None)
    mock_r.smembers = AsyncMock(return_value={payload.jti, "other-jti"})
    mock_pipe = MagicMock()
    mock_pipe.execute = AsyncMock(return_value=[])
    mock_r.pipeline = MagicMock(return_value=mock_pipe)

    with patch.object(services, "_redis", return_value=mock_r):
        with pytest.raises(ValueError, match="유효하지 않습니다|재사용"):
            await services.refresh_tokens(refresh)

    mock_r.smembers.assert_awaited_with("monenon:auth:user_sessions:42")
    assert mock_pipe.delete.call_count >= 1
    mock_pipe.execute.assert_awaited()
