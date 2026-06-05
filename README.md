# Ask My Docs - Enterprise-Grade Multi-Tenant Private RAG

**Ask My Docs** is a secure, production-ready, multi-tenant Retrieval-Augmented Generation (RAG) application. It allows organization tenants to upload proprietary documents (PDF, DOCX, TXT, Markdown), parse and index them using a dual-engine hybrid retrieval (PostgreSQL pgvector + Elasticsearch BM25), and run semantic queries against local-hosted LLMs with strict citation enforcement and hallucination checks.

---

## Architecture Overview

```
                          +------------------------+
                          |   Next.js Frontend     |
                          +-----------+------------+
                                      | HTTP / SSE
                                      v
                          +------------------------+
                          |     FastAPI Server     |
                          +--+-----+----------+----+
                             |     |          |
      +----------------------+     |          +-------------------+
      v                            v                              v
+------------+               +-----+------+                 +-----+------+
|   Redis    |               | PostgreSQL |                 |Elasticsearch|
|  (Memory)  |               | (pgvector) |                 |   (BM25)   |
+------------+               +------------+                 +------------+
```

### Core Technologies
1. **FastAPI**: Multi-tenant API router, JWT scoped parameters, background task ingestion pipelines.
2. **Next.js**: Visual frontend built with Tailwind CSS, supporting interactive streams and source panel slides.
3. **pgvector (Postgres)**: High-performance vector database, storing standard 768-D dense embeddings.
4. **Elasticsearch**: BM25 keyword text retriever.
5. **Redis**: Session storage mapping.
6. **Cross-Encoder (`BAAI/bge-reranker-large`)**: Dense re-scoring.
7. **Ollama / vLLM**: API endpoint hosting local LLM (`llama3`) and local embeddings.

---

## Directory Layout

```
ask-my-docs/
├── backend/            # FastAPI code (app, routes, models, services)
├── frontend/           # Next.js code (pages, components, styles)
├── evaluation/         # Quality benchmarks (Ragas & DeepEval runner)
├── k8s/                # Kubernetes deploy configurations
├── prometheus/         # Scraper metric configs
├── grafana/            # Panel visual configs
└── docker-compose.yml  # Local multi-container orchestration
```

---

## Local Setup & Installation

### Prerequisites
1. Docker and Docker Compose installed.
2. Ollama installed on the host machine.
   * Pull LLM model: `ollama pull llama3`
   * Pull Embedding model: `ollama pull nomic-embed-text`
   * Keep Ollama running on `http://localhost:11434`

### Quick Start
1. Clone the repository and navigate to the directory:
   ```bash
   cd C:/Users/ELCOT/.gemini/antigravity/scratch/ask-my-docs
   ```
2. Spin up the containers using Docker Compose:
   ```bash
   docker compose up --build
   ```
3. Initialize a database migration/tables and verify startup:
   * Backend API: `http://localhost:8000/docs` (Swagger UI)
   * Next.js App: `http://localhost:3000`
   * Prometheus: `http://localhost:9090`
   * Grafana: `http://localhost:3001` (Default login `admin/admin`)

---

## API Documentation

### Authentication (`/api/v1/auth`)
* `POST /register`: Sign up a user and link to an existing or newly initialized tenant workspace.
* `POST /login`: Log in to retrieve a multi-tenant JWT access token.
* `GET /me`: Fetch current user details.

### Documents (`/api/v1/documents`)
* `POST /upload`: Upload PDF, DOCX, TXT, or MD files. Ingests and embeds asynchronously.
* `GET /`: List all files with status and chunk counts.
* `DELETE /{document_id}`: Purges document, pgvector rows, and Elasticsearch indexes.

### Chat (`/api/v1/chat`)
* `POST /sessions`: Start a new chat session thread.
* `GET /sessions`: List previous sessions.
* `POST /sessions/{session_id}/query`: Post a query. Returns a Server-Sent Events (SSE) stream of tokens, ending with a JSON citation block.

### Admin Panel (`/api/v1/admin`)
* `GET /stats`: Global system metrics (Total tenants, files, vectorized blocks).
* `GET /tenants`: Tenant profiles.

---

## Kubernetes Deployment Guide

To deploy Ask My Docs to a Kubernetes cluster (e.g. Minikube or cloud cluster):
1. Apply database dependencies:
   ```bash
   kubectl apply -f k8s/databases.yaml
   ```
2. Apply API deployments and configurations:
   ```bash
   kubectl apply -f k8s/backend.yaml
   ```
3. Apply Next.js frontend deployments:
   ```bash
   kubectl apply -f k8s/frontend.yaml
   ```
4. Configure routing using the ingress resource:
   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```
