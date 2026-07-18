from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hospital import Hospital


async def resolve_tenant_hospital(db: AsyncSession) -> Hospital:
    """Resolve which hospital a pre-auth request (register/login) belongs to.

    Single-tenant pilot: return the one active clinic. To go multi-tenant, replace
    this body with subdomain/slug resolution — nothing else has to change.
    """
    result = await db.execute(
        select(Hospital).where(Hospital.is_active.is_(True)).limit(1)
    )
    hospital = result.scalar_one_or_none()
    if hospital is None:
        raise RuntimeError("No hospital configured. Run: uv run python -m scripts.seed")
    return hospital
