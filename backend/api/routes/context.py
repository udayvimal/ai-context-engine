import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.models.schemas import (
    Decision,
    EnhancedContextResponse,
    FileTouched,
    LastCode,
    LastError,
    ProcessRequest,
    TechStack,
)
from db.database import get_db
from services.llm import LLMService

router = APIRouter()
logger = logging.getLogger(__name__)

_llm = LLMService()


@router.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}


@router.post("/process", response_model=EnhancedContextResponse, tags=["Context"])
async def process_conversation(
    request: ProcessRequest,
    db: Session = Depends(get_db),
):
    if len(request.messages) < 1:
        raise HTTPException(status_code=422, detail="At least 1 message is required.")
    if len(request.messages) > 500:
        raise HTTPException(status_code=422, detail="Maximum 500 messages allowed.")

    try:
        raw = _llm.extract_context(
            messages=request.messages,
            project_name=request.project_name,
            additional_context=request.additional_context,
        )

        # ── tech_stack ────────────────────────────────────────────────────────
        ts_raw = raw.get("tech_stack") or {}
        if isinstance(ts_raw, list):
            # graceful handle if LLM returns a flat list instead of object
            ts_raw = {"other": ts_raw}
        tech_stack = TechStack(
            language  = ts_raw.get("language")  or "",
            framework = ts_raw.get("framework") or "",
            database  = ts_raw.get("database")  or "",
            runtime   = ts_raw.get("runtime")   or "",
            other     = ts_raw.get("other")     or [],
        )

        # ── files_touched ─────────────────────────────────────────────────────
        files_touched = [
            FileTouched(
                path    = f.get("path", "") if isinstance(f, dict) else str(f),
                purpose = f.get("purpose", "") if isinstance(f, dict) else "",
            )
            for f in (raw.get("files_touched") or [])
            if f
        ]

        # ── last_code ─────────────────────────────────────────────────────────
        lc_raw = raw.get("last_code") or {}
        last_code = LastCode(
            file     = lc_raw.get("file"),
            language = lc_raw.get("language") or "",
            code     = lc_raw.get("code")     or "",
            purpose  = lc_raw.get("purpose")  or "",
        )

        # ── last_error ────────────────────────────────────────────────────────
        le_raw = raw.get("last_error") or {}
        last_error = LastError(
            message  = le_raw.get("message"),
            file     = le_raw.get("file"),
            line     = str(le_raw["line"]) if le_raw.get("line") is not None else None,
            cause    = le_raw.get("cause"),
            fix      = le_raw.get("fix"),
            resolved = bool(le_raw.get("resolved", False)),
        )

        # ── decisions — "not" is a Python keyword, mapped to "rejected" ───────
        decisions = [
            Decision(
                chose    = d.get("chose", ""),
                rejected = d.get("not") or d.get("rejected"),
                why      = d.get("why"),
            )
            for d in (raw.get("decisions") or [])
            if isinstance(d, dict) and d.get("chose")
        ]

        response = EnhancedContextResponse(
            project_name      = raw.get("project_name")      or request.project_name,
            source            = request.source,
            message_count     = len(request.messages),
            active_file       = raw.get("active_file"),
            active_function   = raw.get("active_function"),
            tech_stack        = tech_stack,
            files_touched     = files_touched,
            last_code         = last_code,
            last_error        = last_error,
            working           = raw.get("working")       or [],
            broken            = raw.get("broken")        or [],
            decisions         = decisions,
            commands_run      = raw.get("commands_run")  or [],
            next_action       = raw.get("next_action")   or "Review conversation manually.",
            context_paragraph = raw.get("context_paragraph") or "",
        )

        # Persist best-effort — never fail the API on a DB error
        try:
            from services.storage import StorageService
            StorageService(db).save_context(request, response)
        except Exception as db_exc:
            logger.warning("DB save failed (non-fatal): %s", db_exc)

        return response

    except Exception as exc:
        logger.error("Context extraction failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")
