import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Ask My Docs"
    API_V1_STR: str = "/api/v1"
    
    # Security & JWT
    SECRET_KEY: str = Field(default="SUPER_SECRET_KEY_FOR_JWT_SIGNING_DO_NOT_USE_IN_PRODUCTION_CHANGE_ME", validation_alias="JWT_SECRET")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # PostgreSQL Connection Settings
    POSTGRES_USER: str = Field(default="postgres")
    POSTGRES_PASSWORD: str = Field(default="postgres")
    POSTGRES_DB: str = Field(default="askmydocs")
    POSTGRES_HOST: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def SQLALCHEMY_SYNC_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Elasticsearch Connection Settings
    ELASTICSEARCH_HOST: str = Field(default="http://localhost:9200")

    # Redis Connection Settings
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_DB: int = Field(default=0)

    # Local LLM and Embedding Providers (Ollama, local HF transformers)
    EMBEDDING_PROVIDER: str = Field(default="ollama")  # options: ollama, local (sentence-transformers), openai
    EMBEDDING_MODEL: str = Field(default="nomic-embed-text")  # nomic-embed-text or all-MiniLM-L6-v2
    OLLAMA_URL: str = Field(default="http://localhost:11434")
    LLM_MODEL: str = Field(default="llama3")  # model for LLM generation
    
    # Reranking settings
    RERANKER_MODEL: str = Field(default="BAAI/bge-reranker-large")
    USE_RERANKER: bool = True

    # Observability & LangSmith
    LANGCHAIN_TRACING_V2: str = Field(default="false")
    LANGCHAIN_API_KEY: Optional[str] = Field(default=None)
    LANGCHAIN_PROJECT: str = Field(default="ask-my-docs")
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = Field(default=None)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
