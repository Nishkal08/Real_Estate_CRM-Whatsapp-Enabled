from typing import Tuple, List
from kb.vector_store import get_vector_store
from config.settings import settings

# Real-estate keyword synonyms for fast query expansion (no LLM call)
_SYNONYM_MAP = {
    "price": ["cost", "rate", "pricing", "how much", "budget", "amount"],
    "location": ["area", "address", "where", "locality", "zone", "sector"],
    "bhk": ["bedroom", "configuration", "flat", "apartment", "unit"],
    "amenities": ["facilities", "features", "club", "gym", "pool", "parking"],
    "possession": ["ready", "handover", "completion", "move in", "delivery"],
    "rera": ["registration", "approved", "certified", "authority"],
    "brochure": ["pdf", "catalog", "details", "floor plan", "layout"],
}

def _keyword_expand(query: str) -> List[str]:
    """Generate 2 fast keyword-expanded query variants without any LLM call."""
    q_lower = query.lower()
    extra_terms = []
    for key, synonyms in _SYNONYM_MAP.items():
        if key in q_lower:
            extra_terms.extend(synonyms[:2])
        else:
            for syn in synonyms:
                if syn in q_lower:
                    extra_terms.append(key)
                    break

    if not extra_terms:
        return []

    # Variant 1: original + synonyms appended
    v1 = f"{query} {' '.join(extra_terms[:3])}"
    # Variant 2: query rephrased with first synonym swap
    words = query.split()
    v2_words = []
    for w in words:
        matched = False
        for key, syns in _SYNONYM_MAP.items():
            if w.lower() == key and syns:
                v2_words.append(syns[0])
                matched = True
                break
        if not matched:
            v2_words.append(w)
    v2 = " ".join(v2_words)
    return [v1, v2] if v2 != query else [v1]


def retrieve_context(query: str, kb_id: str) -> Tuple[str, List[str]]:
    """MMR retrieval with fast keyword expansion. No extra LLM calls."""
    try:
        kb_id_clean = kb_id or "main-kb"
        if kb_id_clean in ("null", "None"):
            kb_id_clean = "main-kb"

        vectorstore = get_vector_store(kb_id_clean)

        # Fast keyword expansion — no LLM cost
        variants = _keyword_expand(query)
        queries = [query] + variants
        print(f"[Retriever] Queries: {queries}")

        retriever = vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 6, "fetch_k": 20, "lambda_mult": 0.6}
        )

        all_docs = []
        for q in queries:
            docs = retriever.invoke(q)
            all_docs.extend(docs)

        # Deduplicate by content
        seen = set()
        unique_docs = []
        for doc in all_docs:
            h = doc.page_content.strip()
            if h not in seen:
                seen.add(h)
                unique_docs.append(doc)

        # Top 8 unique results
        unique_docs = unique_docs[:8]

        context_str = "\n\n---\n\n".join([doc.page_content for doc in unique_docs])
        sources = list(set([doc.metadata.get("source", "Unknown") for doc in unique_docs]))
        return context_str, sources
    except Exception as e:
        print(f"[Retriever] Error: {e}")
        return "", []
