from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    user      = "user"
    assistant = "assistant"
    system    = "system"


class Message(BaseModel):
    role:      MessageRole
    content:   str
    timestamp: Optional[datetime] = None


class ProcessRequest(BaseModel):
    messages:           List[Message] = Field(..., min_length=1, max_length=500)
    project_name:       str           = Field(default="Unnamed Project", max_length=255)
    source:             str           = Field(default="unknown", max_length=50)
    additional_context: str           = Field(default="", max_length=2000)
    user_id:            Optional[str] = Field(default=None, max_length=255)


# ── Nested response models ────────────────────────────────────────────────────

class TechStack(BaseModel):
    language:  str       = ""
    framework: str       = ""
    database:  str       = ""
    runtime:   str       = ""
    other:     List[str] = []


class FileTouched(BaseModel):
    path:    str = ""
    purpose: str = ""


class LastCode(BaseModel):
    file:     Optional[str] = None
    language: str           = ""
    code:     str           = ""
    purpose:  str           = ""


class LastError(BaseModel):
    message:  Optional[str] = None
    file:     Optional[str] = None
    line:     Optional[str] = None
    cause:    Optional[str] = None
    fix:      Optional[str] = None
    resolved: bool          = False


class Decision(BaseModel):
    chose:    str           = ""
    rejected: Optional[str] = None   # JSON key is "not" — mapped in route
    why:      Optional[str] = None


# ── Top-level response ────────────────────────────────────────────────────────

class EnhancedContextResponse(BaseModel):
    project_name:      str
    source:            str
    message_count:     int
    active_file:       Optional[str]    = None
    active_function:   Optional[str]    = None
    tech_stack:        TechStack
    files_touched:     List[FileTouched] = []
    last_code:         LastCode
    last_error:        LastError
    working:           List[str]        = []
    broken:            List[str]        = []
    decisions:         List[Decision]   = []
    commands_run:      List[str]        = []
    next_action:       str              = ""
    context_paragraph: str              = ""


# Keep for heuristic code-block extraction (used by engine.py)
class CodeBlock(BaseModel):
    language:    str
    code:        str
    description: str
