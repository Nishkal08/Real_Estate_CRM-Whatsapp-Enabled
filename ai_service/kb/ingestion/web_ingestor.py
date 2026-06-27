import requests
from bs4 import BeautifulSoup
from langchain_core.documents import Document
from kb.ingestion.chunker import chunk_text
from kb.ingestion.pdf_ingestor import get_chroma_db

def ingest_url(url: str, kb_id: str):
    """Scrapes URL text, chunks, and embeds into ChromaDB."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    full_text = ""
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()

        text = soup.get_text(separator="\n\n")
        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        full_text = "\n\n".join(lines)
    except Exception as fetch_err:
        print(f"[URL Ingest] Failed to fetch {url}: {fetch_err}")

    chunks = chunk_text(full_text, source_label=url)

    if not chunks:
        fallback_content = f"Web Reference URL: {url}\nScraped status: Empty or protected content"
        chunks = [
            Document(
                page_content=fallback_content,
                metadata={"source": url}
            )
        ]

    vectorstore = get_chroma_db(kb_id)
    vectorstore.add_documents(chunks)

    return {"collection_name": f"kb_{kb_id.replace('-', '_')}", "chunk_count": len(chunks)}
