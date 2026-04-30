import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from db.models import ContextHistory, Project


def get_or_create_project(db: Session, name: str, source: str) -> Project:
    project = db.query(Project).filter(Project.name == name).first()
    if not project:
        project = Project(id=str(uuid.uuid4()), name=name, source=source)
        db.add(project)
        db.commit()
        db.refresh(project)
    return project


def create_context_history(
    db:            Session,
    project_id:    str,
    next_step:     str,
    resume_prompt: str,
    message_count: int,
    raw_data:      dict,
) -> ContextHistory:
    record = ContextHistory(
        id            = str(uuid.uuid4()),
        project_id    = project_id,
        next_step     = next_step,
        resume_prompt = resume_prompt,
        message_count = message_count,
        raw_data      = raw_data,
        extracted_at  = datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_all_projects(db: Session) -> List[Project]:
    return db.query(Project).order_by(Project.updated_at.desc()).all()


def get_project_by_id(db: Session, project_id: str) -> Optional[Project]:
    return db.query(Project).filter(Project.id == project_id).first()
