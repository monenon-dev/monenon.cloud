"""Alembic — Neon PostgreSQL, apps/ 모델 metadata."""

from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

BACKEND_DIR = Path(__file__).resolve().parents[1]
APPS_DIR = BACKEND_DIR / "apps"
for path in (BACKEND_DIR, APPS_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from core.matrix.grid_oracle_database_manager import Base, resolved_database_url  # noqa: E402
import admin.adapter.outbound.orm.admin_account  # noqa: E402, F401
import admin.adapter.outbound.orm.warning  # noqa: E402, F401
import secretary.adapter.outbound.orm.user_model  # noqa: E402, F401
import titanic.adapter.outbound.orm.passenger_jack_trainer_orm  # noqa: E402, F401
import titanic.adapter.outbound.orm.passenger_rose_model_orm  # noqa: E402, F401
import moneyball.adapter.outbound.orm.stadium_orm  # noqa: E402, F401
import moneyball.adapter.outbound.orm.team_orm  # noqa: E402, F401
import moneyball.adapter.outbound.orm.player_orm  # noqa: E402, F401
import moneyball.adapter.outbound.orm.schedule_orm  # noqa: E402, F401

config = context.config
config.set_main_option("sqlalchemy.url", resolved_database_url())

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
