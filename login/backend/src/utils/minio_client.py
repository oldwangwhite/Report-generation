from minio import Minio
from minio.error import S3Error
from datetime import timedelta
from ..config.settings import settings

_minio_client = None

def get_minio_client():
    global _minio_client
    if _minio_client is None:
        _minio_client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        # 确保 bucket 存在
        if not _minio_client.bucket_exists(settings.MINIO_BUCKET_NAME):
            _minio_client.make_bucket(settings.MINIO_BUCKET_NAME)
    return _minio_client

def get_presigned_url(object_name: str, expires: int = 3600) -> str:
    """生成预签名 URL，默认有效期 1 小时"""
    client = get_minio_client()
    return client.presigned_get_object(
        bucket_name=settings.MINIO_BUCKET_NAME,
        object_name=object_name,
        expires=timedelta(seconds=expires)
    )

def upload_file(object_name: str, file_path: str, content_type: str = "application/octet-stream"):
    client = get_minio_client()
    client.fput_object(
        bucket_name=settings.MINIO_BUCKET_NAME,
        object_name=object_name,
        file_path=file_path,
        content_type=content_type
    )