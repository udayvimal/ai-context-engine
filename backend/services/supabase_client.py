import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy singleton — created once on first use
_client = None


def get_supabase():
    """Return the Supabase client, or None if env vars are not set."""
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_KEY", "").strip()

    if not url or not key:
        logger.warning("SUPABASE_URL or SUPABASE_KEY not set — Supabase storage disabled.")
        return None

    try:
        from supabase import create_client
        _client = create_client(url, key)
        logger.info("Supabase client initialised.")
        return _client
    except Exception as exc:
        logger.error("Failed to initialise Supabase client: %s", exc)
        return None


def save_context(user_id: Optional[str], context_json: dict) -> bool:
    """
    Insert one row into the 'contexts' table.
    Returns True on success, False on failure (never raises).

    Table schema (run once in Supabase SQL editor):
        CREATE TABLE contexts (
            id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id     text,
            context_json jsonb,
            created_at  timestamptz DEFAULT now()
        );
    """
    sb = get_supabase()
    if sb is None:
        return False

    try:
        sb.table("contexts").insert({
            "user_id":      user_id,
            "context_json": context_json,
        }).execute()
        logger.info("Supabase: saved context for user_id=%r", user_id)
        return True
    except Exception as exc:
        logger.warning("Supabase save failed (non-fatal): %s", exc)
        return False
