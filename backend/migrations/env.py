from __future__ import with_statement
import os
import sys
from pathlib import Path
from logging.config import fileConfig

# Adds the backend directory to Python's path so the 'app' module can be found
sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy import engine_from_config, pool

from alembic import context
from dotenv import load_dotenv
from app.db.database import Base
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.message import Message
from app.models.rating import Rating
from app.models.notification import Notification
from app.models.report import Report
from app.models.payment import PaymentMethod, Payment
from app.models.document import Document

load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata


def get_url():
    # The environment variable is authoritative: Render supplies DATABASE_URL at
    # runtime. alembic.ini must NOT carry a hardcoded connection string, so an
    # empty/commented sqlalchemy.url is ignored rather than treated as config.
    env_url = os.environ.get("DATABASE_URL")
    if env_url and env_url.strip():
        url = env_url.strip()
        # Normalize the legacy postgres:// prefix, matching app/db/database.py.
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    # Fall back to alembic.ini only when it actually holds a usable URL.
    ini_url = (config.get_main_option("sqlalchemy.url") or "").strip()
    if ini_url and not ini_url.startswith("driver://"):
        return ini_url

    raise RuntimeError(
        "No database URL configured for migrations. Set the DATABASE_URL "
        "environment variable (do not hardcode credentials in alembic.ini)."
    )


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """

    url = get_url()
    if url is None:
        raise RuntimeError("No database URL configured for offline migrations")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""

    configuration = config.get_section(config.config_ini_section)
    configuration.setdefault('sqlalchemy.url', get_url() or '')

    connectable = engine_from_config(
        configuration,
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
