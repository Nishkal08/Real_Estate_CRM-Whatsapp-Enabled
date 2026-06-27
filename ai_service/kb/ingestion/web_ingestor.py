import requests
from bs4 import BeautifulSoup
from langchain_core.documents import Document
from kb.ingestion.chunker import chunk_text
from kb.vector_store import get_vector_store

# Tags that add no useful text content
_STRIP_TAGS = ["script", "style", "nav", "footer", "header",
               "aside", "button", "form", "noscript", "svg", "iframe"]


def ingest_url(url: str, kb_id: str):
    """Scrapes URL, chunks with overlap, and embeds into pgvector."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    }
    full_text = ""
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(_STRIP_TAGS):
            tag.decompose()

        text = soup.get_text(separator="\n\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        full_text = "\n\n".join(lines)
    except Exception as fetch_err:
        print(f"[URL Ingest] Failed to fetch {url}: {fetch_err}")

    chunks = chunk_text(full_text, source_label=url)

    if not chunks:
        chunks = [Document(
            page_content=f"Web Reference: {url}\nNote: Content could not be scraped.",
            metadata={"source": url, "section": "general"}
        )]

    vectorstore = get_vector_store(kb_id)
    vectorstore.add_documents(chunks)

    return {
        "collection_name": f"kb_{kb_id.replace('-', '_')}",
        "chunk_count": len(chunks)
    }
