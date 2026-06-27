"""
pgvector-backed vector store — replaces ChromaDB.
Data persists in Postgres across deploys.
"""
import os
from langchain_postgres import PGVector
from langchain_mistralai import MistralAIEmbeddings
from config.settings import settings


def _get_embeddings() -> MistralAIEmbeddings:
    return MistralAIEmbeddings(
        api_key=settings.mistral_api_key,
        model="mistral-embed"
    )


def _collection_name(kb_id: str) -> str:
    """Normalise kb_id to a safe collection name."""
    return f"kb_{kb_id.replace('-', '_')}"


def get_vector_store(kb_id: str) -> PGVector:
    """Return a PGVector store for the given KB."""
    # PGVector needs a synchronous psycopg2 connection string
    # DATABASE_URL from env is already a postgres:// URL
    conn_str = settings.database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    # Also handle postgres:// prefix (Render uses this)
    conn_str = conn_str.replace("postgres://", "postgresql+psycopg2://", 1)

    return PGVector(
        collection_name=_collection_name(kb_id),
        connection=conn_str,
        embeddings=_get_embeddings(),
        use_jsonb=True,
    )
