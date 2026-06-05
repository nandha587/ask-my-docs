import re
from typing import List, Dict, Any, Tuple
from app.schemas.chat import Citation

class CitationService:
    @staticmethod
    def extract_and_verify_citations(
        text: str, 
        chunks: List[Dict[str, Any]]
    ) -> Tuple[str, List[Citation]]:
        """
        Scans LLM output text for citation brackets (e.g. [1], [2]).
        Maps these brackets back to the list of retrieved source chunks.
        Strips or modifies citations that are out of bounds (hallucinations).
        """
        # Find all citation brackets in text like [1], [2], [1,2], [1, 2]
        # Using a regex to match bracketed numbers
        pattern = r"\[(\d+(?:\s*,\s*\d+)*)\]"
        
        citations_found: Dict[int, Dict[str, Any]] = {}
        sanitized_text = text
        
        # We find matches and sort them in reverse order to replace safely without offset issues
        matches = list(re.finditer(pattern, text))
        
        valid_citations: List[Citation] = []
        seen_chunks = set()

        for match in matches:
            full_match = match.group(0)
            inner_content = match.group(1)
            
            # Split numbers (in case of [1, 2])
            indices = [int(idx.strip()) for idx in inner_content.split(",")]
            
            valid_indices = []
            for idx in indices:
                # 1-indexed citations in LLM responses mapping to 0-indexed chunk lists
                chunk_array_idx = idx - 1
                if 0 <= chunk_array_idx < len(chunks):
                    chunk = chunks[chunk_array_idx]
                    valid_indices.append(idx)
                    
                    chunk_id = chunk["chunk_id"]
                    if chunk_id not in seen_chunks:
                        seen_chunks.add(chunk_id)
                        valid_citations.append(
                            Citation(
                                chunk_id=chunk["chunk_id"],
                                document_id=chunk["document_id"],
                                filename=chunk["filename"],
                                page=chunk.get("page"),
                                content=chunk["content"]
                            )
                        )
            
            # Reconstruct the bracket if some were valid, or remove if completely hallucinated
            if valid_indices:
                new_bracket = "[" + ", ".join(map(str, sorted(valid_indices))) + "]"
                sanitized_text = sanitized_text.replace(full_match, new_bracket)
            else:
                # Remove hallucinated citation entirely
                sanitized_text = sanitized_text.replace(full_match, "")

        # Sort citations by page and index for a clean reading experience
        return sanitized_text, valid_citations
