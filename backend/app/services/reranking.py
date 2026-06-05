import asyncio
import logging
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor
from app.core.config import settings

logger = logging.getLogger("askmydocs_reranker")

class RerankingService:
    def __init__(self):
        self.model_name = settings.RERANKER_MODEL
        self.use_reranker = settings.USE_RERANKER
        self._executor = ThreadPoolExecutor(max_workers=2)
        self.model = None
        self.failed_to_load = False

    def _load_model(self):
        """
        Lazy load CrossEncoder to prevent long startup delays.
        """
        if self.model is None and not self.failed_to_load:
            try:
                from sentence_transformers import CrossEncoder
                logger.info(f"Loading Cross-Encoder model: {self.model_name}...")
                self.model = CrossEncoder(self.model_name)
                logger.info("Cross-Encoder loaded successfully.")
            except Exception as e:
                logger.warning(f"Could not load CrossEncoder model locally: {str(e)}. Using fallback matching reranker.")
                self.failed_to_load = True

    async def rerank(self, query: str, chunks: List[Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
        """
        Reranks a list of chunks using the CrossEncoder model based on relevance to query.
        """
        if not chunks:
            return []
            
        if not self.use_reranker:
            return chunks[:limit]

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(self._executor, self._load_model)

        if self.failed_to_load or self.model is None:
            # Fallback mock reranking based on simple word overlaps (TF-IDF mock)
            return self._fallback_rerank(query, chunks, limit)

        # Build pairs for prediction: [[query, doc1], [query, doc2], ...]
        pairs = [[query, c["content"]] for c in chunks]
        
        def predict():
            return self.model.predict(pairs)

        scores = await loop.run_in_executor(self._executor, predict)

        # Attach scores and sort
        for idx, score in enumerate(scores):
            # Sigmoid scaling if necessary, CrossEncoder outputs logit
            chunks[idx]["rerank_score"] = float(score)

        sorted_chunks = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)
        return sorted_chunks[:limit]

    def _fallback_rerank(self, query: str, chunks: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        """
        Resilient fallback search. Scores chunks based on unique keyword matching.
        """
        query_words = set(query.lower().split())
        
        for chunk in chunks:
            content_words = chunk["content"].lower()
            # Score is number of query words appearing in chunk content
            score = sum(1.0 for word in query_words if word in content_words)
            chunk["rerank_score"] = score

        sorted_chunks = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)
        return sorted_chunks[:limit]
