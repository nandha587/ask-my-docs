import uuid
from datetime import datetime
from typing import Dict, Any, List
from pydantic import BaseModel

class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    file_type: str
    status: str
    tenant_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentChunkOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    content: str
    meta_info: Dict[str, Any]

    class Config:
        from_attributes = True

class DocumentDetail(DocumentOut):
    chunk_count: int
