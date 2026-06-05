import httpx
import asyncio
from typing import List
from concurrent.futures import ThreadPoolExecutor
from app.core.config import settings

class EmbeddingService:
    def __init__(self):
        self.provider = settings.EMBEDDING_PROVIDER.lower()
        self.model_name = settings.EMBEDDING_MODEL
        self.ollama_url = settings.OLLAMA_URL
        self._executor = ThreadPoolExecutor(max_workers=4)
        self.local_model = None

    def _load_local_model(self):
        """
        Lazy load SentenceTransformer to save memory if using Ollama.
        We default to a 768-dimension local model (e.g. 'BAAI/bge-base-en-v1.5')
        to match our pgvector Vector(768) column.
        """
        if self.local_model is None:
            from sentence_transformers import SentenceTransformer
            # If all-MiniLM-L6-v2 is configured, it produces 384 dimensions.
            # If so, we will pad it to 768 in get_embedding.
            self.local_model = SentenceTransformer(self.model_name)

    async def get_embedding(self, text: str) -> List[float]:
        """
        Main entrypoint to generate embedding vector for a single text chunk.
        """
        if self.provider == "ollama":
            return await self._get_ollama_embedding(text)
        elif self.provider == "local":
            return await self._get_local_embedding(text)
        elif self.provider == "openai":
            return await self._get_openai_mock_embedding(text)
        else:
            raise ValueError(f"Unknown embedding provider: {self.provider}")

    async def _get_ollama_embedding(self, text: str) -> List[float]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/embeddings",
                    json={"model": self.model_name, "prompt": text}
                )
                response.raise_for_status()
                vector = response.json()["embedding"]
                return self._ensure_dimension(vector, 768)
        except Exception as e:
            # Fall back to local sentence transformers if Ollama service is unavailable
            print(f"Ollama embedding failed: {str(e)}. Falling back to local SentenceTransformers.")
            return await self._get_local_embedding(text)

    async def _get_local_embedding(self, text: str) -> List[float]:
        # Run synchronous HuggingFace model in thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(self._executor, self._load_local_model)
        
        def encode():
            return self.local_model.encode(text).tolist()
            
        vector = await loop.run_in_executor(self._executor, encode)
        return self._ensure_dimension(vector, 768)

    async def _get_openai_mock_embedding(self, text: str) -> List[float]:
        # Standard placeholder embedding for mock testing
        # In real scenario, would use OpenAI API client
        import math
        vec = [math.sin(i + len(text)) for i in range(768)]
        # Normalize vector
        norm = math.sqrt(sum(x * x for x in vec))
        return [x / norm for x in vec]

    def _ensure_dimension(self, vector: List[float], target_dim: int = 768) -> List[float]:
        """
        Ensures the vector matches target_dim by padding with zeros or truncating.
        """
        curr_dim = len(vector)
        if curr_dim == target_dim:
            return vector
        elif curr_dim < target_dim:
            return vector + [0.0] * (target_dim - curr_dim)
        else:
            return vector[:target_dim]
            
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Bulk generate embeddings.
        """
        tasks = [self.get_embedding(text) for text in texts]
        return await asyncio.gather(*tasks)
