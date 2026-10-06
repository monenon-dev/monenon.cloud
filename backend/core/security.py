"""RS256 JWT 발급·검증. 개인키는 발급 함수 호출 시에만 로드."""

from __future__ import annotations

import base64
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt.algorithms import RSAAlgorithm

ACCESS_COOKIE = "monenon_access"
REFRESH_COOKIE = "monenon_refresh"


def cookie_kwargs() -> dict:
    """환경별 httpOnly 쿠키 옵션 — 기본은 host-only, AUTH_COOKIE_DOMAIN 지정 시에만 domain 설정."""
    domain = os.getenv("AUTH_COOKIE_DOMAIN", "").strip()
    is_production = os.getenv("ENV", "").strip().lower() in ("production", "prod")
    secure_raw = os.getenv("AUTH_COOKIE_SECURE", "auto").strip().lower()
    if secure_raw == "true":
        secure = True
    elif secure_raw == "false":
        secure = False
    else:
        secure = is_production
    same_site = os.getenv("AUTH_COOKIE_SAMESITE", "lax").strip().lower() or "lax"
    if same_site not in ("lax", "strict", "none"):
        same_site = "lax"
    kwargs: dict = {"httponly": True, "secure": secure, "samesite": same_site}
    if domain:
        kwargs["domain"] = domain
    return kwargs


# 하위 호환 — auth.router 등 기존 import 유지
COOKIE_KWARGS = cookie_kwargs()


def set_auth_cookies(
    response,
    access: str,
    refresh: str,
    *,
    access_ttl_min: int,
    refresh_ttl_days: int,
) -> None:
    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=access_ttl_min * 60,
        path="/",
        **cookie_kwargs(),
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=refresh_ttl_days * 86400,
        path="/auth",
        **cookie_kwargs(),
    )


def clear_auth_cookies(response) -> None:
    kwargs = cookie_kwargs()
    domain = kwargs.get("domain")
    response.delete_cookie(ACCESS_COOKIE, domain=domain, path="/")
    response.delete_cookie(REFRESH_COOKIE, domain=domain, path="/auth")
DEFAULT_AUD = "monenon-api"
DEFAULT_KID = "monenon-auth-1"


@dataclass(frozen=True)
class TokenPayload:
    sub: str
    roles: list[str]
    aud: str
    exp: int
    iat: int
    jti: str


def _decode_pem_env(raw: str) -> str:
    text = raw.strip()
    if not text:
        return ""
    if "BEGIN" in text:
        return text.replace("\\n", "\n")
    try:
        decoded = base64.b64decode(text).decode("utf-8")
        if "BEGIN" in decoded:
            return decoded
    except Exception:
        pass
    return text.replace("\\n", "\n")


def _public_key_pem() -> str:
    pem = _decode_pem_env(os.getenv("JWT_PUBLIC_KEY", ""))
    if not pem:
        raise RuntimeError("JWT_PUBLIC_KEY가 설정되지 않았습니다.")
    return pem


def _private_key_pem() -> str:
    """발급 경로 전용 — verify_token 등에서는 호출하지 말 것."""
    pem = _decode_pem_env(os.getenv("JWT_PRIVATE_KEY", ""))
    if not pem:
        raise RuntimeError("JWT_PRIVATE_KEY가 설정되지 않았습니다.")
    return pem


def create_access_token(
    sub: str,
    roles: list[str],
    aud: str,
    expires_min: int = 10,
) -> str:
    now = datetime.now(timezone.utc)
    kid = os.getenv("JWT_KID", DEFAULT_KID).strip() or DEFAULT_KID
    payload = {
        "sub": sub,
        "roles": roles,
        "aud": aud,
        "exp": now + timedelta(minutes=expires_min),
        "iat": now,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(
        payload,
        _private_key_pem(),
        algorithm="RS256",
        headers={"kid": kid},
    )


def create_refresh_token(sub: str, expires_days: int = 14) -> str:
    now = datetime.now(timezone.utc)
    kid = os.getenv("JWT_KID", DEFAULT_KID).strip() or DEFAULT_KID
    payload = {
        "sub": sub,
        "typ": "refresh",
        "exp": now + timedelta(days=expires_days),
        "iat": now,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(
        payload,
        _private_key_pem(),
        algorithm="RS256",
        headers={"kid": kid},
    )


def verify_token(token: str, aud: str) -> TokenPayload:
    decoded = jwt.decode(
        token,
        _public_key_pem(),
        algorithms=["RS256"],
        audience=aud,
        options={"require": ["exp", "iat", "sub", "jti"]},
    )
    roles_raw = decoded.get("roles") or []
    if not isinstance(roles_raw, list):
        roles_raw = []
    roles = [str(r) for r in roles_raw]
    aud_claim = decoded.get("aud")
    if isinstance(aud_claim, list):
        aud_val = str(aud_claim[0]) if aud_claim else aud
    else:
        aud_val = str(aud_claim) if aud_claim else aud
    return TokenPayload(
        sub=str(decoded["sub"]),
        roles=roles,
        aud=aud_val,
        exp=int(decoded["exp"]),
        iat=int(decoded["iat"]),
        jti=str(decoded["jti"]),
    )


def verify_refresh_token(token: str) -> TokenPayload:
    """refresh는 aud 없이 typ=refresh만 검사."""
    decoded = jwt.decode(
        token,
        _public_key_pem(),
        algorithms=["RS256"],
        options={"require": ["exp", "iat", "sub", "jti"]},
    )
    if decoded.get("typ") != "refresh":
        raise jwt.InvalidTokenError("refresh 토큰이 아닙니다.")
    return TokenPayload(
        sub=str(decoded["sub"]),
        roles=[],
        aud="",
        exp=int(decoded["exp"]),
        iat=int(decoded["iat"]),
        jti=str(decoded["jti"]),
    )


def public_jwk() -> dict:
    """JWKS용 공개 JWK (kid 포함)."""
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import serialization

    pem = _public_key_pem().encode("utf-8")
    pub = serialization.load_pem_public_key(pem, backend=default_backend())
    jwk = RSAAlgorithm.to_jwk(pub, as_dict=True)
    jwk["kid"] = os.getenv("JWT_KID", DEFAULT_KID).strip() or DEFAULT_KID
    jwk["use"] = "sig"
    jwk["alg"] = "RS256"
    return jwk


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(raw: str, hashed: str) -> bool:
    return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))
