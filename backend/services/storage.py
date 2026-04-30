from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from api.models.schemas import EnhancedContextResponse, ProcessRequest
from db import crud
from db.models import ContextHistory


class StorageService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def save_context(
        self, request: ProcessRequest, response: EnhancedContextResponse
    ) -> ContextHistory:
        project = crud.get_or_create_project(
            self.db, name=request.project_name, source=request.source
        )
        return crud.create_context_history(
            db            = self.db,
            project_id    = project.id,
            next_step     = response.next_action,
            resume_prompt = response.context_paragraph,
            message_count = response.message_count,
            raw_data      = response.model_dump(),
        )

    def list_projects(self) -> List[Dict[str, Any]]:
        projects = crud.get_all_projects(self.db)
        result = []
        for p in projects:
            last_ctx: Optional[ContextHistory] = (
                self.db.query(ContextHistory)
                .filter(ContextHistory.project_id == p.id)
                .order_by(ContextHistory.extracted_at.desc())
                .first()
            )
            result.append({
                "id":            p.id,
                "name":          p.name,
                "source":        p.source,
                "context_count": len(p.contexts),
                "last_extracted": last_ctx.extracted_at if last_ctx else None,
                "last_next_step": last_ctx.next_step if last_ctx else None,
                "created_at":    p.created_at,
            })
        return result

    def get_project_with_history(self, project_id: str) -> Optional[Dict[str, Any]]:
        project = crud.get_project_by_id(self.db, project_id)
        if not project:
            return None
        histories: List[ContextHistory] = (
            self.db.query(ContextHistory)
            .filter(ContextHistory.project_id == project_id)
            .order_by(ContextHistory.extracted_at.desc())
            .all()
        )
        return {
            "id":         project.id,
            "name":       project.name,
            "source":     project.source,
            "created_at": project.created_at,
            "contexts": [
                {
                    "id":           h.id,
                    "next_step":    h.next_step,
                    "resume_prompt": h.resume_prompt,
                    "message_count": h.message_count,
                    "extracted_at": h.extracted_at,
                    "data":         h.raw_data,
                }
                for h in histories
            ],
        }
