from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import create_engine
from app.core.config import settings

# Async Engine for core FastAPI requests
engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    future=True,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Sync engine for setup/migrations or tests if needed
sync_engine = create_engine(
    settings.SQLALCHEMY_SYNC_DATABASE_URI,
    pool_pre_ping=True,
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
            
async def init_db() -> None:
    # Set up vector extension and tables
    # pgvector requires registering/creating the vector extension in the DB
    import sqlalchemy as sa
    from sqlalchemy.ext.asyncio import AsyncConnection

    async with engine.begin() as conn:
        # Create extension if not exists
        await conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector;"))
        # Create all tables (will imports models inside app/models/__init__.py)
        # For simplicity, we create them here
        await conn.run_sync(Base.metadata.create_all)
