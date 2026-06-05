import json
import uuid
import httpx
import logging
from typing import AsyncGenerator, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.chat import ChatSession, ChatMessage
from app.services.hybrid import HybridSearchService
from app.services.reranking import RerankingService
from app.services.citation import CitationService

logger = logging.getLogger("askmydocs_rag")

class RAGOrchestrationService:
    def __init__(
        self,
        hybrid_search_service: HybridSearchService,
        reranking_service: RerankingService
    ):
        self.hybrid_search_service = hybrid_search_service
        self.reranking_service = reranking_service
        self.ollama_url = settings.OLLAMA_URL
        self.llm_model = settings.LLM_MODEL

    async def get_history(self, db: AsyncSession, session_id: uuid.UUID, limit: int = 6) -> List[Dict[str, str]]:
        """
        Loads the recent message history for the conversation session to provide context.
        """
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        messages = result.scalars().all()
        
        history = []
        # Reverse to get chronological order
        for msg in reversed(messages):
            history.append({
                "role": msg.role,
                "content": msg.content
            })
        return history

    async def stream_query(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        session_id: uuid.UUID,
        query: str
    ) -> AsyncGenerator[str, None]:
        """
        Runs the full multi-tenant RAG pipeline and yields SSE streams for token outputs,
        concluding with citation mappings and database writes.
        """
        # Save User Message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=query
        )
        db.add(user_msg)
        await db.commit()

        # Step 1: Retrieve candidate chunks
        logger.info(f"RAG: Retrieving contexts for query: '{query}' under tenant {tenant_id}")
        candidate_chunks = await self.hybrid_search_service.search(db, tenant_id, query, limit=12)

        # Step 2: Rerank chunks using Cross-Encoder
        logger.info(f"RAG: Reranking {len(candidate_chunks)} candidates...")
        reranked_chunks = await self.reranking_service.rerank(query, candidate_chunks, limit=5)

        # Step 3: Load conversational history
        history = await self.get_history(db, session_id, limit=6)

        # Step 4: Build System Prompt with retrieved contexts
        context_str = ""
        for idx, chunk in enumerate(reranked_chunks):
            # Using 1-based indexing for clear citation matches
            context_str += f"Context Document [{idx + 1}]:\nSource File: {chunk['filename']}\nContent: {chunk['content']}\n\n"

        system_message = (
            "You are a helpful and precise assistant for Ask My Docs. You answer queries using ONLY the context documents provided.\n"
            "Strict Hallucination Prevention Rules:\n"
            "1. ONLY answer based on the provided Context Documents. If the answer cannot be found in the contexts, state clearly that you do not know.\n"
            "2. Cite your assertions using brackets matching the document index, e.g. [1], [2], [1, 2]. Do not combine into [1-2].\n"
            "3. Do NOT make up assertions or cite documents that are not listed in the context.\n\n"
            f"--- START OF CONTEXT DOCUMENTS ---\n{context_str}--- END OF CONTEXT DOCUMENTS ---"
        )

        messages = [{"role": "system", "content": system_message}]
        # Append chat history (excluding the user message we just saved to DB, which we append next)
        messages.extend(history[:-1])
        messages.append({"role": "user", "content": query})

        # Step 5: Query Local LLM via Ollama stream
        full_response_text = ""
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.llm_model,
                        "messages": messages,
                        "stream": True
                    }
                ) as response:
                    
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'type': 'error', 'content': 'Local LLM returned an error status.'})}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        
                        data = json.loads(line)
                        chunk_text = data.get("message", {}).get("content", "")
                        full_response_text += chunk_text
                        
                        # Yield token to client
                        yield f"data: {json.dumps({'type': 'token', 'content': chunk_text})}\n\n"
                        
                        if data.get("done", False):
                            break
                            
        except Exception as e:
            logger.error(f"Error calling local LLM: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'content': f'Inference failed: {str(e)}'})}\n\n"
            return

        # Step 6: Verify and extract citations
        sanitized_text, citations = CitationService.extract_and_verify_citations(full_response_text, reranked_chunks)

        # Save Assistant Message to DB
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=sanitized_text,
            # Serialize citation schema list to JSON compatible format
            citations=[c.model_dump(mode="json") for c in citations]
        )
        db.add(assistant_msg)
        await db.commit()

        # Step 7: Yield final citations list and conclusion signal
        yield f"data: {json.dumps({'type': 'citations', 'citations': [c.model_dump(mode='json') for c in citations]})}\n\n"
        yield "data: [DONE]\n\n"
