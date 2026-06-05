import pytest
import tempfile
import os
from app.services.ingestion import IngestionService
from app.services.chunking import ChunkingService

def test_parse_txt_file():
    # Arrange: Create a mock text file
    content = "Hello world! This is a test document to test our local txt ingestion parsing mechanisms."
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w", encoding="utf-8") as f:
        f.write(content)
        temp_name = f.name

    try:
        # Act
        ingestion = IngestionService()
        pages = ingestion.parse_file(temp_name)

        # Assert
        assert len(pages) == 1
        assert pages[0]["page"] == 1
        assert "Hello world" in pages[0]["text"]
    finally:
        os.remove(temp_name)

def test_recursive_chunking():
    # Arrange
    text = "Paragraph 1 is here.\n\nParagraph 2 is here. It has multiple sentences. We want to check split boundaries."
    
    # Act
    chunks = ChunkingService.chunk_text(text, chunk_size=40, chunk_overlap=10)

    # Assert
    assert len(chunks) > 0
    for chunk in chunks:
        assert "content" in chunk
        assert "meta_info" in chunk
        assert chunk["meta_info"]["page"] == 1
        assert len(chunk["content"]) <= 50  # boundaries might expand slightly but should stay small
