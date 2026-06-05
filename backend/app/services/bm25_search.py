import uuid
import logging
from typing import List, Dict, Any
from elasticsearch import AsyncElasticsearch, NotFoundError
from app.core.config import settings

logger = logging.getLogger("askmydocs_bm25")

class BM25SearchService:
    def __init__(self):
        self.es_url = settings.ELASTICSEARCH_HOST
        self.index_name = "askmydocs_chunks"
        # Disable SSL warning for local self-signed setups if necessary
        self.es = AsyncElasticsearch(
            self.es_url,
            verify_certs=False,
            request_timeout=5.0
        )
        self.enabled = True

    async def check_connection(self) -> bool:
        try:
            return await self.es.ping()
        except Exception:
            logger.warning("Elasticsearch is offline. BM25 search will be bypassed.")
            return False

    async def create_index_if_not_exists(self):
        if not await self.check_connection():
            self.enabled = False
            return
            
        try:
            exists = await self.es.indices.exists(index=self.index_name)
            if not exists:
                await self.es.indices.create(
                    index=self.index_name,
                    body={
                        "settings": {
                            "number_of_shards": 1,
                            "number_of_replicas": 0
                        },
                        "mappings": {
                            "properties": {
                                "chunk_id": {"type": "keyword"},
                                "document_id": {"type": "keyword"},
                                "tenant_id": {"type": "keyword"},
                                "content": {"type": "text", "analyzer": "english"},
                                "meta_info": {"type": "object", "enabled": False}
                            }
                        }
                    }
                )
                logger.info(f"Created Elasticsearch index: {self.index_name}")
        except Exception as e:
            logger.error(f"Error creating Elasticsearch index: {str(e)}")
            self.enabled = False

    async def index_chunk(
        self,
        chunk_id: uuid.UUID,
        document_id: uuid.UUID,
        tenant_id: uuid.UUID,
        content: str,
        meta_info: Dict[str, Any]
    ):
        if not self.enabled:
            return
            
        try:
            await self.es.index(
                index=self.index_name,
                id=str(chunk_id),
                body={
                    "chunk_id": str(chunk_id),
                    "document_id": str(document_id),
                    "tenant_id": str(tenant_id),
                    "content": content,
                    "meta_info": meta_info
                },
                refresh="wait_for"
            )
        except Exception as e:
            logger.error(f"Failed to index chunk {chunk_id} to ES: {str(e)}")

    async def delete_document_chunks(self, document_id: uuid.UUID):
        if not self.enabled:
            return
            
        try:
            await self.es.delete_by_query(
                index=self.index_name,
                body={
                    "query": {
                        "term": {"document_id": str(document_id)}
                    }
                },
                refresh="wait_for"
            )
        except Exception as e:
            logger.error(f"Failed to delete document chunks {document_id} from ES: {str(e)}")

    async def search(
        self,
        tenant_id: uuid.UUID,
        query: str,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Executes a BM25 sparse keyword search filtered by tenant_id.
        """
        if not self.enabled or not await self.check_connection():
            return []

        try:
            response = await self.es.search(
                index=self.index_name,
                body={
                    "size": limit,
                    "query": {
                        "bool": {
                            "must": [
                                {"match": {"content": query}}
                            ],
                            "filter": [
                                {"term": {"tenant_id": str(tenant_id)}}
                            ]
                        }
                    }
                }
            )

            hits = response["hits"]["hits"]
            results = []
            for hit in hits:
                source = hit["_source"]
                results.append({
                    "chunk_id": uuid.UUID(source["chunk_id"]),
                    "document_id": uuid.UUID(source["document_id"]),
                    # Filename is loaded from Postgres in hybrid fusion
                    "filename": "",  
                    "content": source["content"],
                    "page": source["meta_info"].get("page"),
                    "type": "sparse"
                })
            return results
        except Exception as e:
            logger.error(f"BM25 search error: {str(e)}")
            return []
            
    async def close(self):
        await self.es.close()
