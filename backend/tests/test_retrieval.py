import pytest
import uuid
from app.services.citation import CitationService

def test_citation_extraction_valid():
    # Arrange
    text = "The server is configured with 768 dimensions [1] and uses Redis cache [2]."
    chunks = [
      {
        "chunk_id": uuid.uuid4(),
        "document_id": uuid.uuid4(),
        "filename": "infra.md",
        "page": 1,
        "content": "The server is configured with 768 dimensions."
      },
      {
        "chunk_id": uuid.uuid4(),
        "document_id": uuid.uuid4(),
        "filename": "cache.md",
        "page": 2,
        "content": "The server uses Redis cache."
      }
    ]

    # Act
    sanitized_text, citations = CitationService.extract_and_verify_citations(text, chunks)

    # Assert
    assert len(citations) == 2
    assert "infra.md" in citations[0].filename
    assert "cache.md" in citations[1].filename
    assert "[1]" in sanitized_text
    assert "[2]" in sanitized_text

def test_citation_extraction_hallucinated():
    # Arrange
    text = "Our systems are configured with pgvector [1] and SQLite is also configured [5]."
    chunks = [
      {
        "chunk_id": uuid.uuid4(),
        "document_id": uuid.uuid4(),
        "filename": "infra.md",
        "page": 1,
        "content": "Our systems are configured with pgvector."
      }
    ]

    # Act
    sanitized_text, citations = CitationService.extract_and_verify_citations(text, chunks)

    # Assert
    assert len(citations) == 1
    assert "infra.md" in citations[0].filename
    assert "[1]" in sanitized_text
    # Hallucinated citation [5] should be stripped
    assert "[5]" not in sanitized_text
