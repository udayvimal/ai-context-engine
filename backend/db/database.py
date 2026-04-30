import logging
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./context_engine.db")

# SQLite requires check_same_thread=False for FastAPI's threading model
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def _migrate(conn) -> None:
    """Add any columns that exist in models but are missing from the live DB."""
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    migrations = {
        "context_history": [
            # Legacy columns from older schema — kept so existing rows don't break
            ("tech_stack",        "JSON"),
            ("files_created",     "JSON"),
            ("key_functions",     "JSON"),
            ("environment_setup", "JSON"),
            # New schema
            ("raw_data",      "JSON"),
            ("resume_prompt", "TEXT"),
        ],
    }

    for table, columns in migrations.items():
        if table not in tables:
            continue
        existing = {c["name"] for c in inspector.get_columns(table)}
        for col_name, col_type in columns:
            if col_name not in existing:
                conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                )
                logger.info("Migration: added column %s.%s", table, col_name)


def init_db() -> None:
    """Create tables (if not present) and run lightweight column migrations."""
    from db import models  # noqa: F401 — registers models with Base

    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)
        _migrate(conn)


def get_db():
    """FastAPI dependency — yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
