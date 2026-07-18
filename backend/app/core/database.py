import uuid
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.database_url, echo=settings.debug, pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


async def set_hospital_context(session: AsyncSession, hospital_id: uuid.UUID) -> None:
    """Scope the current transaction to one hospital for Row-Level Security.

    Uses set_config(..., is_local=true) so the setting resets at transaction end
    (safe with connection pooling) and accepts a bind parameter (no SQL injection).
    """
    await session.execute(
        text("SELECT set_config('app.current_hospital_id', :hid, true)"),
        {"hid": str(hospital_id)},
    )
