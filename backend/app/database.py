import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from collections.abc import Generator

# Путь к папке backend
BASE_DIR = Path(__file__).resolve().parents[1]

# Загружаем настройки из backend/.env
load_dotenv(BASE_DIR / ".env")

# Получаем строку подключения
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL не задана. Проверь файл .env"
    )

# Создаём engine SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def check_database_connection() -> None:
    """ Проверяет, доступна ли база данных. """
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        result.scalar_one()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
