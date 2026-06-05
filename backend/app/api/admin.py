from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.models.document import Document, DocumentChunk
from app.schemas.admin import SystemStats, TenantDetail
from app.middleware.auth_middleware import get_current_admin

router = APIRouter()

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns global system statistics. Only available to system administrators.
    """
    # Count totals
    tenant_count_res = await db.execute(select(func.count(Tenant.id)))
    user_count_res = await db.execute(select(func.count(User.id)))
    doc_count_res = await db.execute(select(func.count(Document.id)))
    chunk_count_res = await db.execute(select(func.count(DocumentChunk.id)))

    return SystemStats(
        tenant_count=tenant_count_res.scalar_one(),
        user_count=user_count_res.scalar_one(),
        document_count=doc_count_res.scalar_one(),
        chunk_count=chunk_count_res.scalar_one()
    )

@router.get("/tenants", response_model=List[TenantDetail])
async def get_tenants_details(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns a detailed list of tenants with user and document counts.
    """
    stmt = (
        select(
            Tenant.id,
            Tenant.name,
            Tenant.created_at,
            func.count(func.distinct(User.id)).label("user_count"),
            func.count(func.distinct(Document.id)).label("document_count")
        )
        .outerjoin(User, Tenant.id == User.tenant_id)
        .outerjoin(Document, Tenant.id == Document.tenant_id)
        .group_by(Tenant.id)
        .order_by(Tenant.created_at.desc())
    )

    res = await db.execute(stmt)
    rows = res.all()

    tenants = []
    for r in rows:
        tenants.append(
            TenantDetail(
                id=r[0],
                name=r[1],
                created_at=r[2],
                user_count=r[3],
                document_count=r[4]
            )
        )
    return tenants
