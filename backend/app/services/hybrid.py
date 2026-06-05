import uuid
import asyncio
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.document import Document
from app.services.vector_search import VectorSearchService
from app.services.bm25_search import BM25SearchService

class HybridSearchService:
    def __init__(
        self,
        vector_search_service: VectorSearchService,
        bm25_search_service: BM25SearchService
    ):
        self.vector_search_service = vector_search_service
        self.bm25_search_service = bm25_search_service

    async def search(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        query: str,
        limit: int = 10,
        rrf_k: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Runs vector and BM25 retrievals, fuses results using Reciprocal Rank Fusion (RRF),
        and fetches document filenames for sparse results.
        """
        # Execute retrievals concurrently
        # Fetching a larger candidate pool (e.g. limit * 2) to ensure good fusion overlap
        candidate_limit = limit * 2
        dense_task = self.vector_search_service.search(db, tenant_id, query, limit=candidate_limit)
        sparse_task = self.bm25_search_service.search(tenant_id, query, limit=candidate_limit)

        dense_results, sparse_results = await asyncio.gather(dense_task, sparse_task)

        # Apply Reciprocal Rank Fusion (RRF)
        rrf_scores: Dict[uuid.UUID, float] = {}
        chunk_map: Dict[uuid.UUID, Dict[str, Any]] = {}

        # Process dense results
        for rank, item in enumerate(dense_results):
            chunk_id = item["chunk_id"]
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + (1.0 / (rrf_k + rank + 1))
            chunk_map[chunk_id] = item

        # Process sparse results
        for rank, item in enumerate(sparse_results):
            chunk_id = item["chunk_id"]
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + (1.0 / (rrf_k + rank + 1))
            if chunk_id not in chunk_map:
                chunk_map[chunk_id] = item

        # Sort chunk IDs by fused RRF scores
        sorted_chunks = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        top_chunk_pairs = sorted_chunks[:limit]

        # Assemble result list
        fused_results = []
        missing_filename_doc_ids = set()

        for chunk_id, score in top_chunk_pairs:
            chunk_data = chunk_map[chunk_id]
            chunk_data["rrf_score"] = score
            fused_results.append(chunk_data)
            
            # Chunks from Elasticsearch don't have filenames populated yet
            if not chunk_data["filename"]:
                missing_filename_doc_ids.add(chunk_data["document_id"])

        # Resolve missing filenames from PostgreSQL if needed
        if missing_filename_doc_ids:
            stmt = select(Document.id, Document.filename).where(Document.id.in_(missing_filename_doc_ids))
            db_res = await db.execute(stmt)
            doc_id_to_filename = {row[0]: row[1] for row in db_res.all()}
            
            for item in fused_results:
                if not item["filename"] and item["document_id"] in doc_id_to_filename:
                    item["filename"] = doc_id_to_filename[item["document_id"]]

        return fused_results
