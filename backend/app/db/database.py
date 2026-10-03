import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError
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

# --- PostgreSQL driver normalization -----------------------------------------
# The installed PostgreSQL driver is psycopg 3 (`psycopg`), NOT psycopg2.
# A bare `postgresql://` URL makes SQLAlchemy 2.0 default to the psycopg2 dialect,
# which is not installed -> ModuleNotFoundError at import. Supabase's dashboard
# hands out bare `postgresql://` strings, so pin the driver explicitly to
# `postgresql+psycopg://` to match what requirements.txt actually installs.
# Also normalize the legacy `postgres://` alias that SQLAlchemy 2.0 rejects.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg://", 1
    )

_ALLOWED_PG_PREFIXES = (
    "postgresql+psycopg://",
    "sqlite",
)

if not DATABASE_URL.startswith(_ALLOWED_PG_PREFIXES):
    # e.g. postgresql+psycopg2:// / postgresql+asyncpg:// / postgresql+pg8000://
    _driver = DATABASE_URL.split("://", 1)[0]
    raise RuntimeError(
        f"DATABASE_URL uses an unsupported driver '{_driver}'. This deployment "
        "installs psycopg 3 only, so the URL must be a Supabase Session Pooler "
        "connection string beginning with 'postgresql://' (it is normalized to "
        "postgresql+psycopg:// automatically). Fix DATABASE_URL in the Render "
        "environment rather than relying on any local fallback."
    )

_is_sqlite = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if _is_sqlite else {}

# For serverless/pooled Postgres (e.g. Supabase pooler) drop connections that
# the pooler has already closed, instead of handing a dead socket to a request.
engine_kwargs = {}
if not _is_sqlite:
    engine_kwargs = {
        # Keep-alive ping before reusing a connection from the pool.
        # Required for Supabase pooler which closes idle connections server-side.
        "pool_pre_ping": True,
        # Recycle connections older than 10 min (Supabase pooler default timeout is ~10m).
        "pool_recycle": 600,
        # Number of persistent connections kept open.
        "pool_size": 5,
        # Extra connections allowed when pool is exhausted (total max = pool_size + max_overflow).
        "max_overflow": 10,
        # Seconds to wait for a connection before raising OperationalError.
        "pool_timeout": 30,
    }

try:
    make_url(DATABASE_URL)
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        **engine_kwargs,
    )
    # Log only the driver/dialect (never the URL, which holds credentials).
    print(
        f"[db] engine driver={engine.url.drivername} "
        f"backend={engine.url.get_backend_name()} "
        f"pool_pre_ping={engine_kwargs.get('pool_pre_ping', False)}"
    )
except ArgumentError as _exc:
    raise RuntimeError(
        "DATABASE_URL could not be parsed by SQLAlchemy. Set a valid "
        "connection string in the environment (Render → Environment "
        "Variables). See the Render logs above for the exact parser error."
    ) from _exc

# --- Supabase pooler sanity check ---------------------------------------------
# Supabase's pooler identifies the project by the `postgres.<project-ref>` user
# name. If the project was deleted, paused or the ref is wrong, the pooler
# answers with: "FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found".
# That is a credentials/config problem, not a network or driver problem, so
# surface it as such instead of a raw psycopg stack trace.
_POOLER_HOST_MARKER = "pooler.supabase.com"
_PG_USER = ""
if not _is_sqlite:
    try:
        _parsed = make_url(DATABASE_URL)
        _PG_USER = _parsed.username or ""
    except Exception:  # noqa: BLE001 - non-fatal, only used for a hint
        _PG_USER = ""

if (
    _PG_USER.startswith("postgres.")
    and _POOLER_HOST_MARKER not in DATABASE_URL
):
    raise RuntimeError(
        f"DATABASE_URL user '{_PG_USER}' is a Supabase pooler-style username, but "
        "the host is not a pooler host. Use the full 'Session pooler' string from "
        "Supabase → Project Settings → Database → Connection string."
    )

if _PG_USER.startswith("postgres.") and not _PG_USER[9:].strip():
    raise RuntimeError(
        f"DATABASE_URL user '{_PG_USER}' has an empty Supabase project ref after "
        "'postgres.'. Expected 'postgres.<project-ref>'. Copy the connection "
        "string again from the Supabase dashboard."
    )


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)