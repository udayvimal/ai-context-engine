import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    id:         Mapped[str]      = mapped_column(String(36), primary_key=True, default=_new_uuid)
    name:       Mapped[str]      = mapped_column(String(255), nullable=False, index=True)
    source:     Mapped[str]      = mapped_column(String(50), default="unknown")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    contexts: Mapped[list["ContextHistory"]] = relationship(
        "ContextHistory", back_populates="project", cascade="all, delete-orphan"
    )


class ContextHistory(Base):
    __tablename__ = "context_history"

    id:         Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )

    # Queryable summary fields
    next_step:     Mapped[str] = mapped_column(Text, default="")
    resume_prompt: Mapped[str] = mapped_column(Text, default="")
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    extracted_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Full nested extraction stored as JSON blob
    raw_data: Mapped[dict] = mapped_column(JSON, default=dict)

    project: Mapped["Project"] = relationship("Project", back_populates="contexts")
