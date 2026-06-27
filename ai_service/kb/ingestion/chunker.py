import re
from typing import List
from langchain_core.documents import Document

# Section keywords for metadata tagging
_SECTION_PATTERNS = {
    "pricing":    r"\b(price|pricing|cost|rate|lakh|crore|₹|rs\.?|emi|payment)\b",
    "location":   r"\b(location|address|near|metro|highway|road|sector|zone|city)\b",
    "amenities":  r"\b(amenities|gym|pool|club|parking|garden|terrace|security|lift)\b",
    "possession": r"\b(possession|ready|handover|completion|2025|2026|2027|q1|q2|q3|q4)\b",
    "config":     r"\b(\d\s?bhk|bedroom|studio|floor|sqft|sq\.?ft|carpet|area|size)\b",
    "rera":       r"\b(rera|registration|approved|pr\/gj|pr\/mh)\b",
}


def _detect_section(text: str) -> str:
    text_l = text.lower()
    for section, pattern in _SECTION_PATTERNS.items():
        if re.search(pattern, text_l):
            return section
    return "general"


def chunk_text(
    text: str,
    source_label: str,
    max_chunk_size: int = 1200,
    overlap: int = 150,
    context_prefix: str = "",
) -> List[Document]:
    """
    Paragraph-aware chunker with:
    - Configurable overlap between chunks (default 150 chars)
    - Auto section metadata tagging (pricing/location/amenities/etc.)
    - Context prefix injection per chunk
    """
    if not text or not text.strip():
        return []

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks: List[Document] = []
    current_chunk = ""
    last_overlap = ""  # tail of previous chunk for overlap

    def _make_doc(content: str) -> Document:
        if context_prefix:
            content = f"{context_prefix}\n{content}"
        section = _detect_section(content)
        return Document(
            page_content=content.strip(),
            metadata={"source": source_label, "section": section},
        )

    for p in paragraphs:
        # If adding this paragraph exceeds max size, flush current chunk
        if current_chunk and len(current_chunk) + len(p) + 2 > max_chunk_size:
            chunks.append(_make_doc(current_chunk))
            # Carry overlap from end of flushed chunk
            last_overlap = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
            current_chunk = last_overlap + "\n\n" + p
        else:
            current_chunk = (current_chunk + "\n\n" + p).strip() if current_chunk else p

    # Flush remaining
    if current_chunk.strip():
        chunks.append(_make_doc(current_chunk))

    return chunks
