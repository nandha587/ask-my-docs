import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class TenantCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)

class TenantOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    tenant_name: Optional[str] = Field(None, description="Provide tenant name to create a new tenant")
    tenant_id: Optional[uuid.UUID] = Field(None, description="Provide existing tenant ID to join")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    tenant_id: uuid.UUID
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None
    is_admin: bool = False
