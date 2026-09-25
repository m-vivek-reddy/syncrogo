import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Allow an explicit opt-in to the SQLite fallback for local/dev use only.
# Deployed environments must fail loudly instead of silently creating an
# ephemeral SQLite database on an ephemeral disk and losing all data.
_IS_DEPLOYED = (
    os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"}
    or bool(os.getenv("RENDER"))
)

if not DATABASE_URL:
    if _IS_DEPLOYED:
        raise RuntimeError(
            "DATABASE_URL is not configured. Refusing to start with the "
            "ephemeral SQLite fallback in a deployed environment. Set "
            "DATABASE_URL to your Supabase connection string."
        )
    DATABASE_URL = "sqlite:///./syncrogo.db"

# Normalize legacy postgres:// prefix to postgresql:// for SQLAlchemy 2.0+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_is_sqlite = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if _is_sqlite else {}

# For serverless/pooled Postgres (e.g. Supabase pooler) drop connections that
# the pooler has already closed, instead of handing a dead socket to a request.
engine_kwargs = {}
if not _is_sqlite:
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)