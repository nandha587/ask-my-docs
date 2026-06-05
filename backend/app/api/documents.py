import os
import uuid
import shutil
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.core.database import get_db, async_session_factory
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.schemas.document import DocumentOut, DocumentDetail
from app.middleware.auth_middleware import get_current_user
from app.services.ingestion import IngestionService
from app.services.chunking import ChunkingService
from app.services.embedding import EmbeddingService
from app.services.bm25_search import BM25SearchService

logger = logging.getLogger("askmydocs_docs")
router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper function to run background processing
async def process_document_background(
    document_id: uuid.UUID,
    file_path: str,
    tenant_id: uuid.UUID
):
    # Retrieve dependency wrappers
    ingestion = IngestionService()
    chunker = ChunkingService()
    embedding_svc = EmbeddingService()
    bm25_svc = BM25SearchService()

    # Initialize ES index
    await bm25_svc.create_index_if_not_exists()

    async with async_session_factory() as db:
        try:
            # 1. Parse text from document
            logger.info(f"Parsing document {document_id}")
            pages = ingestion.parse_file(file_path)
            
            # 2. Chunk text
            logger.info(f"Chunking document {document_id}")
            chunks = chunker.chunk_document(pages)
            
            if not chunks:
                raise ValueError("No text content could be extracted or chunked.")

            # 3. Vectorize and save chunks
            for chunk in chunks:
                content = chunk["content"]
                meta = chunk["meta_info"]
                
                # Generate pgvector embedding vector
                vector = await embedding_svc.get_embedding(content)
                
                db_chunk = DocumentChunk(
                    document_id=document_id,
                    tenant_id=tenant_id,
                    content=content,
                    meta_info=meta,
                    vector=vector
                )
                db.add(db_chunk)
                await db.flush()  # Flushes to DB to get chunk.id

                # Index in Elasticsearch
                await bm25_svc.index_chunk(
                    chunk_id=db_chunk.id,
                    document_id=document_id,
                    tenant_id=tenant_id,
                    content=content,
                    meta_info=meta
                )

            # Update document status to ready
            stmt = select(Document).where(Document.id == document_id)
            doc_res = await db.execute(stmt)
            db_doc = doc_res.scalar_one()
            db_doc.status = "ready"
            
            await db.commit()
            logger.info(f"Document {document_id} fully processed and indexed.")
        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {str(e)}")
            # Mark document as error
            try:
                stmt = select(Document).where(Document.id == document_id)
                doc_res = await db.execute(stmt)
                db_doc = doc_res.scalar_one_or_none()
                if db_doc:
                    db_doc.status = "error"
                    await db.commit()
            except Exception:
                pass
        finally:
            await bm25_svc.close()

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in [".pdf", ".docx", ".txt", ".md", ".markdown"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Supported: PDF, DOCX, TXT, Markdown."
        )

    # Save to uploads directory
    document_id = uuid.uuid4()
    saved_filename = f"{document_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to local disk: {str(e)}"
        )

    # Create DB entry
    db_doc = Document(
        id=document_id,
        filename=filename,
        file_type=ext.replace(".", ""),
        storage_path=file_path,
        status="processing",
        tenant_id=current_user.tenant_id
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)

    # Dispatch background task for parsing and embeddings
    background_tasks.add_task(
        process_document_background,
        document_id=db_doc.id,
        file_path=file_path,
        tenant_id=current_user.tenant_id
    )

    return db_doc

@router.get("/", response_model=List[DocumentDetail])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Query documents with aggregated chunk counts
    stmt = (
        select(
            Document.id,
            Document.filename,
            Document.file_type,
            Document.status,
            Document.tenant_id,
            Document.created_at,
            func.count(DocumentChunk.id).label("chunk_count")
        )
        .outerjoin(DocumentChunk, Document.id == DocumentChunk.document_id)
        .where(Document.tenant_id == current_user.tenant_id)
        .group_by(Document.id)
        .order_by(Document.created_at.desc())
    )
    
    res = await db.execute(stmt)
    rows = res.all()
    
    docs = []
    for r in rows:
        docs.append(
            DocumentDetail(
                id=r[0],
                filename=r[1],
                file_type=r[2],
                status=r[3],
                tenant_id=r[4],
                created_at=r[5],
                chunk_count=r[6]
            )
        )
    return docs

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Retrieve document and verify ownership
    stmt = select(Document).where(Document.id == document_id, Document.tenant_id == current_user.tenant_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    # Delete local physical file if exists
    if os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except Exception as e:
            logger.warning(f"Could not remove local physical file {doc.storage_path}: {str(e)}")

    # Delete from Elasticsearch
    bm25 = BM25SearchService()
    await bm25.delete_document_chunks(document_id)
    await bm25.close()

    # Delete from PostgreSQL (cascade deletes chunks automatically)
    await db.delete(doc)
    await db.commit()
