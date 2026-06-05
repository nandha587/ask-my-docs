import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSessionOut(BaseModel):
    id: uuid.UUID
    title: str
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class Citation(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    page: Optional[int] = None
    content: str

class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    citations: List[Citation] = []
    created_at: datetime

    class Config:
        from_attributes = True

class ChatQuery(BaseModel):
    content: str = Field(..., min_length=1)

class RAGResponse(BaseModel):
    answer: str
    citations: List[Citation]
