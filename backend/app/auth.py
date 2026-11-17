import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Header, HTTPException


# Загружаем переменные окружения из backend/.env
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)

# Получаем административный ключ
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")


def require_admin_key(
    x_admin_key: str | None = Header(
        default=None,
        alias="X-Admin-Key",
    ),
) -> None:
    """Проверяет наличие правильного административного ключа."""

    if not ADMIN_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_API_KEY не настроен на сервере",
        )

    if (
        x_admin_key is None
        or not secrets.compare_digest(
            x_admin_key.encode("utf-8"),
            ADMIN_API_KEY.encode("utf-8"),
        )
    ):
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав администратора",
        )