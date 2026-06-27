from config.settings import settings

_checkpointer = None


def get_checkpointer():
    """
    Returns a LangGraph checkpointer.

    Strategy:
    1. Try PostgresSaver with a connection pool (psycopg_pool) — handles
       Supabase idle-connection drops automatically via min_size=1.
    2. If pool import fails, fall back to a plain psycopg connection.
    3. If Postgres is unreachable, fall back gracefully to MemorySaver
       (in-process memory — conversations reset on restart, but agent works).
    """
    global _checkpointer
    if _checkpointer is not None:
        return _checkpointer

    import re
    db_url = re.sub(r'[?&]pgbouncer=[^&]*', '', settings.database_url)
    db_url = re.sub(r'[?&]connection_limit=[^&]*', '', db_url)
    if '?' not in db_url and '&' in db_url:
        db_url = db_url.replace('&', '?', 1)

    # ── Attempt 1: connection pool (best for long-running services) ──────────
    try:
        from psycopg_pool import ConnectionPool
        from langgraph.checkpoint.postgres import PostgresSaver

        # Convert postgresql:// to postgresql+psycopg:// if needed
        pool_url = db_url
        pool = ConnectionPool(
            conninfo=pool_url,
            min_size=1,
            max_size=2,
            open=True,
            kwargs={"autocommit": True, "prepare_threshold": None},
        )
        _checkpointer = PostgresSaver(pool)
        _checkpointer.setup()
        print("[Checkpointer] Using PostgresSaver with connection pool.")
        return _checkpointer
    except ImportError:
        print("[Checkpointer] psycopg_pool not available, trying plain connection...")
    except Exception as e:
        print(f"[Checkpointer] Connection pool failed: {e}. Trying plain connection...")

    # ── Attempt 2: plain psycopg connection ──────────────────────────────────
    try:
        import psycopg
        from langgraph.checkpoint.postgres import PostgresSaver

        conn = psycopg.connect(db_url, connect_timeout=10, autocommit=True, prepare_threshold=None)
        _checkpointer = PostgresSaver(conn)
        _checkpointer.setup()
        print("[Checkpointer] Using PostgresSaver with plain psycopg connection.")
        return _checkpointer
    except Exception as e:
        print(f"[Checkpointer] Plain psycopg connection failed: {e}. Falling back to MemorySaver.")

    # ── Fallback: MemorySaver ────────────────────────────────────────────────
    from langgraph.checkpoint.memory import MemorySaver
    _checkpointer = MemorySaver()
    print("[Checkpointer] WARNING: Using MemorySaver (in-memory only). "
          "Conversations will not persist across restarts.")
    return _checkpointer
