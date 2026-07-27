"""
AwsTank — S3 객체 스토리지 어댑터.

자격·리전은 Keymaker(.env)만 사용한다. 코드에 키를 하드코딩하지 않는다.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Any, BinaryIO

import boto3
from botocore.client import BaseClient
from botocore.exceptions import ClientError

from core.matrix.vault_keymaker_secret_manager import Keymaker, get_keymaker

logger = logging.getLogger(__name__)


class AwsTankS3Manager:
    """IAM ACCESS KEY 기반 S3 업로드·다운로드·목록·삭제·presigned URL."""

    def __init__(
        self,
        *,
        bucket: str | None = None,
        keymaker: Keymaker | None = None,
    ) -> None:
        self._km = keymaker or get_keymaker()
        access_key, secret_key, region = self._km.require_aws_credentials()
        self.region = region
        self.bucket = (bucket or self._km.aws_s3_bucket()).strip()
        self._client: BaseClient = boto3.client(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )

    def _require_bucket(self, bucket: str | None = None) -> str:
        name = (bucket or self.bucket).strip()
        if not name:
            raise RuntimeError(
                "S3 버킷이 없습니다. AWS_S3_BUCKET 을 .env 에 넣거나 bucket= 인자를 주세요."
            )
        return name

    def upload_file(
        self,
        local_path: str | Path,
        key: str,
        *,
        bucket: str | None = None,
        extra_args: dict[str, Any] | None = None,
    ) -> str:
        """로컬 파일 → S3. 반환: s3://bucket/key"""
        bucket_name = self._require_bucket(bucket)
        path = Path(local_path)
        self._client.upload_file(
            str(path),
            bucket_name,
            key,
            ExtraArgs=extra_args or {},
        )
        uri = f"s3://{bucket_name}/{key}"
        logger.info("[AwsTank] upload_file ok %s", uri)
        return uri

    def upload_fileobj(
        self,
        fileobj: BinaryIO,
        key: str,
        *,
        bucket: str | None = None,
        extra_args: dict[str, Any] | None = None,
    ) -> str:
        """파일 객체(스트림) → S3."""
        bucket_name = self._require_bucket(bucket)
        self._client.upload_fileobj(
            fileobj,
            bucket_name,
            key,
            ExtraArgs=extra_args or {},
        )
        uri = f"s3://{bucket_name}/{key}"
        logger.info("[AwsTank] upload_fileobj ok %s", uri)
        return uri

    def download_file(
        self,
        key: str,
        local_path: str | Path,
        *,
        bucket: str | None = None,
    ) -> Path:
        """S3 → 로컬 파일."""
        bucket_name = self._require_bucket(bucket)
        path = Path(local_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self._client.download_file(bucket_name, key, str(path))
        logger.info("[AwsTank] download_file ok s3://%s/%s → %s", bucket_name, key, path)
        return path

    def get_object_bytes(self, key: str, *, bucket: str | None = None) -> bytes:
        """S3 객체 본문을 bytes로 반환."""
        bucket_name = self._require_bucket(bucket)
        response = self._client.get_object(Bucket=bucket_name, Key=key)
        body = response["Body"].read()
        return body if isinstance(body, bytes) else bytes(body)

    def list_keys(
        self,
        *,
        prefix: str = "",
        bucket: str | None = None,
        max_keys: int = 1000,
    ) -> list[str]:
        """프리픽스 아래 객체 키 목록."""
        bucket_name = self._require_bucket(bucket)
        response = self._client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix,
            MaxKeys=max_keys,
        )
        contents = response.get("Contents") or []
        return [item["Key"] for item in contents if "Key" in item]

    def delete_object(self, key: str, *, bucket: str | None = None) -> None:
        bucket_name = self._require_bucket(bucket)
        self._client.delete_object(Bucket=bucket_name, Key=key)
        logger.info("[AwsTank] delete_object s3://%s/%s", bucket_name, key)

    def object_exists(self, key: str, *, bucket: str | None = None) -> bool:
        bucket_name = self._require_bucket(bucket)
        try:
            self._client.head_object(Bucket=bucket_name, Key=key)
            return True
        except ClientError as exc:
            code = (exc.response.get("Error") or {}).get("Code")
            if code in {"404", "NoSuchKey", "NotFound"}:
                return False
            raise

    def generate_presigned_url(
        self,
        key: str,
        *,
        bucket: str | None = None,
        expires_in: int = 3600,
        method: str = "get_object",
    ) -> str:
        """다운로드(get_object) 또는 업로드(put_object)용 presigned URL."""
        bucket_name = self._require_bucket(bucket)
        return self._client.generate_presigned_url(
            ClientMethod=method,
            Params={"Bucket": bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )


@lru_cache(maxsize=1)
def get_aws_tank() -> AwsTankS3Manager:
    """프로세스당 기본 버킷 매니저 (Keymaker 자격 사용)."""
    return AwsTankS3Manager()
