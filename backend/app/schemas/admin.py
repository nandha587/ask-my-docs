import uuid
from datetime import datetime
from typing import List
from pydantic import BaseModel

class SystemStats(BaseModel):
    tenant_count: int
    user_count: int
    document_count: int
    chunk_count: int

class TenantDetail(BaseModel):
    id: uuid.UUID
    name: str
    user_count: int
    document_count: int
    created_at: datetime

    class Config:
        from_attributes = True
