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
        pass

    async def get_embedding(self, text: str) -> List[float]:
        """
        Main entrypoint to generate embedding vector for a single text chunk.
        """
        if self.provider == "ollama":
            return await self._get_ollama_embedding(text)
        elif self.provider in ["local", "openai"]:
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
            print(f"Ollama embedding failed: {str(e)}. Falling back to mock embeddings.")
            return await self._get_openai_mock_embedding(text)

    async def _get_local_embedding(self, text: str) -> List[float]:
        return await self._get_openai_mock_embedding(text)

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
