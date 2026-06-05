from typing import List, Dict, Any

class ChunkingService:
    @staticmethod
    def chunk_text(
        text: str, 
        chunk_size: int = 700, 
        chunk_overlap: int = 100, 
        page_number: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Split a document text into smaller overlapping chunks.
        Keeps track of page number and character offsets.
        """
        if not text or len(text.strip()) == 0:
            return []

        chunks = []
        start = 0
        text_len = len(text)
        chunk_idx = 0

        while start < text_len:
            end = min(start + chunk_size, text_len)
            
            # Try to expand end slightly to find a logical boundary (like a period or newline)
            if end < text_len:
                # Look for a paragraph end or sentence end in the last 15% of the chunk
                lookback = int(chunk_size * 0.15)
                boundary_chars = ["\n\n", "\n", ". ", "? ", "! "]
                found_boundary = False
                for char in boundary_chars:
                    pos = text.rfind(char, end - lookback, end)
                    if pos != -1:
                        end = pos + len(char)
                        found_boundary = True
                        break
                
                # If no boundary found, just split at word boundaries
                if not found_boundary:
                    space_pos = text.rfind(" ", end - 15, end)
                    if space_pos != -1:
                        end = space_pos + 1
            
            chunk_content = text[start:end].strip()
            if len(chunk_content) > 10:  # Skip trivial tiny chunks
                chunks.append({
                    "content": chunk_content,
                    "meta_info": {
                        "page": page_number,
                        "chunk_index": chunk_idx,
                        "start_char": start,
                        "end_char": end
                    }
                })
                chunk_idx += 1
            
            # Move start forward, accounting for overlap
            start += (chunk_size - chunk_overlap)
            if start >= text_len or (end == text_len and start >= end - chunk_overlap):
                break
                
        return chunks

    def chunk_document(
        self, 
        pages: List[Dict[str, Any]], 
        chunk_size: int = 700, 
        chunk_overlap: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Takes a list of pages: [{"page": 1, "text": "..."}] and splits them.
        """
        all_chunks = []
        global_chunk_idx = 0
        
        for p in pages:
            page_text = p.get("text", "")
            page_num = p.get("page", 1)
            page_chunks = self.chunk_text(
                text=page_text, 
                chunk_size=chunk_size, 
                chunk_overlap=chunk_overlap, 
                page_number=page_num
            )
            for chunk in page_chunks:
                chunk["meta_info"]["global_index"] = global_chunk_idx
                all_chunks.append(chunk)
                global_chunk_idx += 1
                
        return all_chunks
