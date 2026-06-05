import uuid
from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserOut, TenantOut, TenantCreate
from app.middleware.auth_middleware import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Check if user email already exists
    existing_user = await db.execute(select(User).where(User.email == user_in.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # 2. Handle tenant mapping
    tenant_id = user_in.tenant_id
    if user_in.tenant_name:
        # Create a new tenant if name is provided
        new_tenant = Tenant(name=user_in.tenant_name)
        db.add(new_tenant)
        await db.commit()
        await db.refresh(new_tenant)
        tenant_id = new_tenant.id
    elif not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either a tenant name to create a tenant or an existing tenant ID."
        )
    else:
        # Verify existing tenant
        db_tenant = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        if not db_tenant.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The specified tenant does not exist."
            )

    # 3. Create the user. If they are the first user for the tenant, make them an admin
    tenant_users = await db.execute(select(User).where(User.tenant_id == tenant_id))
    is_admin = len(tenant_users.all()) == 0

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pw,
        tenant_id=tenant_id,
        is_admin=is_admin
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login_user(login_in: UserLogin, db: AsyncSession = Depends(get_db)):
    # Verify user
    res = await db.execute(select(User).where(User.email == login_in.email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    # Create Access Token
    access_token = create_access_token(
        subject=user.id,
        tenant_id=user.tenant_id,
        is_admin=user.is_admin
    )
    return Token(access_token=access_token)

@router.get("/me", response_model=UserOut)
async def read_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/tenants", response_model=List[TenantOut])
async def list_tenants(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Tenant))
    return res.scalars().all()
