import uuid
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import DocumentChunk, Document
from app.services.embedding import EmbeddingService

class VectorSearchService:
    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service

    async def search(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        query: str,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Generates query embedding and returns top-K matching chunks from PostgreSQL using pgvector.
        """
        # Generate query embedding vector
        query_vector = await self.embedding_service.get_embedding(query)

        # Select chunks and join Document to extract filename
        stmt = (
            select(DocumentChunk, Document.filename)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(DocumentChunk.tenant_id == tenant_id)
            # pgvector cosine_distance returns value between 0 (identical) and 2 (orthogonal/opposite)
            # Cosine similarity = 1 - cosine_distance
            .order_by(DocumentChunk.vector.cosine_distance(query_vector))
            .limit(limit)
        )

        result = await db.execute(stmt)
        rows = result.all()

        results = []
        for chunk, filename in rows:
            # We calculate approximate similarity score
            # cosine_distance is d, similarity is 1 - d
            # Let's fetch distance value (must evaluate in raw pgvector if we want it as a column)
            results.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "filename": filename,
                "content": chunk.content,
                "page": chunk.meta_info.get("page"),
                # Return vector search raw match rank
                "type": "dense"
            })
            
        return results
