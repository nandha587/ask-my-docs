import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatSessionCreate, ChatSessionOut, ChatMessageOut, ChatQuery
from app.middleware.auth_middleware import get_current_user
from app.services.embedding import EmbeddingService
from app.services.vector_search import VectorSearchService
from app.services.bm25_search import BM25SearchService
from app.services.hybrid import HybridSearchService
from app.services.reranking import RerankingService
from app.services.rag import RAGOrchestrationService

router = APIRouter()

@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    session_in: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = ChatSession(
        title=session_in.title or "New Chat",
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/sessions", response_model=List[ChatSessionOut])
async def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(ChatSession)
        .where(
            ChatSession.tenant_id == current_user.tenant_id,
            ChatSession.user_id == current_user.id
        )
        .order_by(ChatSession.created_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
async def list_session_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify session ownership
    stmt = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.tenant_id == current_user.tenant_id,
        ChatSession.user_id == current_user.id
    )
    session_res = await db.execute(stmt)
    if not session_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied."
        )

    # Fetch messages
    msg_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    return msg_res.scalars().all()

@router.post("/sessions/{session_id}/query")
async def query_session(
    session_id: uuid.UUID,
    query: ChatQuery,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify session exists and belongs to tenant/user
    stmt = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.tenant_id == current_user.tenant_id,
        ChatSession.user_id == current_user.id
    )
    session_res = await db.execute(stmt)
    if not session_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied."
        )

    # 2. Wire up RAG orchestration services
    embedding_svc = EmbeddingService()
    vector_search_svc = VectorSearchService(embedding_svc)
    bm25_search_svc = BM25SearchService()
    
    hybrid_search_svc = HybridSearchService(vector_search_svc, bm25_search_svc)
    reranking_svc = RerankingService()
    
    rag_orchestration_svc = RAGOrchestrationService(hybrid_search_svc, reranking_svc)

    # 3. Return Streaming SSE Response
    return StreamingResponse(
        rag_orchestration_svc.stream_query(
            db=db,
            tenant_id=current_user.tenant_id,
            session_id=session_id,
            query=query.content
        ),
        media_type="text/event-stream"
    )
