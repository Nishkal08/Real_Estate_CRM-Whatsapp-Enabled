import os
import re
from pypdf import PdfReader
from langchain_core.documents import Document
from kb.ingestion.chunker import chunk_text
from kb.vector_store import get_vector_store
from config.settings import settings


# Keep get_chroma_db as a compatibility shim — points to pgvector now
def get_chroma_db(kb_id: str):
    """Compatibility alias — returns pgvector store."""
    return get_vector_store(kb_id)


def _clean_pdf_text(text: str) -> str:
    """Remove common PDF extraction artefacts."""
    # Collapse excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Remove page numbers like "12" on their own line
    text = re.sub(r'^\s*\d{1,3}\s*$', '', text, flags=re.MULTILINE)
    # Remove sequences of just digits/dashes (TOC artefacts)
    text = re.sub(r'^[\d\s\-\.]+$', '', text, flags=re.MULTILINE)
    # Collapse leftover blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def ingest_pdf(
    file_path: str,
    kb_id: str,
    source_label: str = "brochure",
    description: str = None,
):
    """Extracts text from PDF, chunks with overlap, and embeds via Mistral → pgvector."""
    full_text = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            try:
                text = page.extract_text()
                if text:
                    full_text += text + "\n\n"
            except Exception as page_err:
                print(f"[PDF] Page extract error: {page_err}")
    except Exception as reader_err:
        print(f"[PDF] Reader error: {reader_err}")

    full_text = _clean_pdf_text(full_text)

    filename = os.path.basename(file_path)
    clean_name = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ")
    context_desc = description.strip() if description else clean_name
    context_prefix = f"Project/Document Context: {context_desc}"

    chunks = chunk_text(full_text, source_label, context_prefix=context_prefix)

    if not chunks:
        # Fallback for fully-scanned/image-only PDFs
        fallback_content = (
            f"Brochure Project: {clean_name}\n"
            f"Context/Description: {description or 'Brochure document details'}"
        )
        chunks = [Document(
            page_content=fallback_content,
            metadata={"source": source_label, "section": "general"}
        )]

    vectorstore = get_vector_store(kb_id)
    vectorstore.add_documents(chunks)

    return {
        "collection_name": f"kb_{kb_id.replace('-', '_')}",
        "chunk_count": len(chunks)
    }
