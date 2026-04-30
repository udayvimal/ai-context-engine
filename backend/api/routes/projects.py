import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


class ProjectSummary(BaseModel):
    id: str
    name: str
    source: str
    context_count: int
    last_extracted: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/projects", response_model=List[ProjectSummary], tags=["Projects"])
async def list_projects(db: Session = Depends(get_db)):
    """Return all projects ordered by most recently updated."""
    try:
        from services.storage import StorageService

        return StorageService(db).list_projects()
    except Exception as exc:
        logger.error("list_projects failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/projects/{project_id}", response_model=Dict[str, Any], tags=["Projects"])
async def get_project(project_id: str, db: Session = Depends(get_db)):
    """Return a single project with its full extraction history."""
    try:
        from services.storage import StorageService

        project = StorageService(db).get_project_with_history(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")
        return project
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_project failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
