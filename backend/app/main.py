import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from app.core.config import settings
from app.core.database import init_db
from app.api import auth, documents, chat, admin
from app.middleware.logging_middleware import TelemetryMiddleware
from app.services.embedding import EmbeddingService
from app.services.reranking import RerankingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("askmydocs_main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("Initializing system...")
    try:
        # Create database tables and vector extension if not present
        await init_db()
        logger.info("PostgreSQL database tables verified/created.")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL: {str(e)}")

    # Pre-load/warmup local models to avoid request latency spikes
    if settings.EMBEDDING_PROVIDER.lower() == "local":
        logger.info("Pre-warming embedding models...")
        try:
            emb = EmbeddingService()
            emb._load_local_model()
        except Exception as e:
            logger.warning(f"Could not pre-load embedding model: {str(e)}")

    if settings.USE_RERANKER:
        logger.info("Pre-warming cross-encoder reranker models...")
        try:
            rerank = RerankingService()
            rerank._load_model()
        except Exception as e:
            logger.warning(f"Could not pre-load reranker: {str(e)}")

    yield
    # Shutdown tasks (cleanups if any)
    logger.info("Shutting down system...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set CORS middleware (Next.js is hosted on localhost:3000 by default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom Prometheus and logs telemetry middleware
app.add_middleware(TelemetryMiddleware)

# Mount Prometheus metrics app to expose metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["Documents"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["Chat"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
