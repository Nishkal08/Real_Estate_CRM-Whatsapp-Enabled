"""
pgvector-backed vector store — replaces ChromaDB.
Data persists in Postgres across deploys.
"""
import os
from langchain_postgres import PGVector
from langchain_mistralai import MistralAIEmbeddings
from config.settings import settings


from sqlalchemy import create_engine

# Global engine singleton to reuse connections and limit pool size
_engine = None

def get_engine():
    global _engine
    if _engine is None:
        import re
        db_url = re.sub(r'[?&]pgbouncer=[^&]*', '', settings.database_url)
        db_url = re.sub(r'[?&]connection_limit=[^&]*', '', db_url)
        if '?' not in db_url and '&' in db_url:
            db_url = db_url.replace('&', '?', 1)
        conn_str = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        conn_str = conn_str.replace("postgres://", "postgresql+psycopg2://", 1)
        # Configure connection pooling to reuse connections and limit max active connections to 2
        _engine = create_engine(
            conn_str,
            pool_size=2,
            max_overflow=0,
            pool_recycle=1800,
            pool_pre_ping=True
        )
    return _engine


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
    engine = get_engine()

    return PGVector(
        collection_name=_collection_name(kb_id),
        connection=engine,
        embeddings=_get_embeddings(),
        use_jsonb=True,
    )
