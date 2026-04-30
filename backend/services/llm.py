import json
import logging
import os
import re
from typing import Any, Callable, Dict, List, Optional

import anthropic
import openai
from dotenv import load_dotenv
from groq import Groq

from api.models.schemas import Message

load_dotenv()

logger = logging.getLogger(__name__)

MASTER_PROMPT = """You are a Technical Context Extractor for developers.
Analyse the conversation and output ONLY a valid JSON object with this EXACT structure.
No markdown. No text before or after. Pure JSON only.

{
  "project_name": "name of the project",

  "active_file": "the file being actively edited right now, or null",
  "active_function": "exact function/method/endpoint being written, or null",

  "tech_stack": {
    "language": "e.g. Python 3.11 / TypeScript 5",
    "framework": "e.g. FastAPI / Next.js",
    "database": "e.g. PostgreSQL / SQLite",
    "runtime": "e.g. Node 20 / CPython 3.11",
    "other": ["sentence-transformers", "Pydantic v2", "etc — only if explicitly mentioned"]
  },

  "files_touched": [
    {"path": "backend/services/llm.py", "purpose": "LLM extraction service"}
  ],

  "last_code": {
    "file": "filename or null",
    "language": "python / javascript / etc",
    "code": "VERBATIM last code block from the conversation — not a description",
    "purpose": "one sentence: what this code does"
  },

  "last_error": {
    "message": "exact error text or null",
    "file": "filename where error occurred or null",
    "line": "line number as string or null",
    "cause": "root cause identified in conversation or null",
    "fix": "fix attempted or null",
    "resolved": false
  },

  "working": [
    "specific thing confirmed working 1",
    "specific thing confirmed working 2"
  ],

  "broken": [
    "specific thing NOT working 1"
  ],

  "decisions": [
    {
      "chose": "what was chosen",
      "not": "what was rejected or null",
      "why": "reason or null"
    }
  ],

  "commands_run": [
    "pip install sentence-transformers",
    "uvicorn main:app --reload"
  ],

  "next_action": "ONE ultra-specific action: open backend/routes/context.py line 42, add X parameter to Y function",

  "context_paragraph": "Write a MINIMUM 200-word dense paragraph covering: what is being built (full description), exact tech stack, every file mentioned, what was completed this session, what is currently broken, every technical decision made with reasons, the last error with exact line, and the single most important next step. A developer must be able to paste this into a new AI session and resume with ZERO re-explanation."
}

ABSOLUTE RULES:
1. Output ONLY the JSON — zero markdown, zero preamble, zero explanation
2. Use EXACT names, file paths, error messages from the conversation — never paraphrase
3. NEVER invent anything not in the conversation — use null or [] if unknown
4. last_code.code MUST be verbatim code, never a description
5. context_paragraph MUST be at least 200 words — this is the most important field
6. next_action must name a specific file and action — never say "review" or "consider"
7. tech_stack.other: ONLY libraries explicitly named — never invent (e.g. never add FAISS unless mentioned)
8. last_error.resolved: true only if conversation explicitly confirms the fix worked"""

_REQUIRED_KEYS = {
    "project_name", "active_file", "active_function", "tech_stack",
    "files_touched", "last_code", "last_error", "working", "broken",
    "decisions", "commands_run", "next_action", "context_paragraph",
}

_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def _clean_json(text: str) -> str:
    text = text.strip()
    m = _JSON_FENCE.search(text)
    if m:
        return m.group(1).strip()
    start = text.find("{")
    end   = text.rfind("}")
    if start != -1 and end != -1:
        return text[start: end + 1]
    return text


def _empty_result(project_name: str) -> Dict[str, Any]:
    return {
        "project_name":      project_name,
        "active_file":       None,
        "active_function":   None,
        "tech_stack": {
            "language": "", "framework": "", "database": "", "runtime": "", "other": [],
        },
        "files_touched":     [],
        "last_code": {
            "file": None, "language": "", "code": "", "purpose": "",
        },
        "last_error": {
            "message": None, "file": None, "line": None,
            "cause": None, "fix": None, "resolved": False,
        },
        "working":           [],
        "broken":            [],
        "decisions":         [],
        "commands_run":      [],
        "next_action":       "Review conversation and identify the next concrete action.",
        "context_paragraph": "LLM extraction was unavailable. Context was derived from heuristic analysis of the conversation.",
    }


class LLMService:
    def __init__(self) -> None:
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        openai_key    = os.getenv("OPENAI_API_KEY", "")
        groq_key      = os.getenv("GROQ_API_KEY", "")
        self._provider    = os.getenv("LLM_PROVIDER", "groq").lower()
        self._groq_model  = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self._max_messages = int(os.getenv("MAX_MESSAGES", "200"))

        self._anthropic: Optional[anthropic.Anthropic] = None
        self._openai:    Optional[openai.OpenAI]       = None
        self._groq:      Optional[Groq]                = None

        if anthropic_key and anthropic_key != "your_anthropic_api_key_here":
            self._anthropic = anthropic.Anthropic(api_key=anthropic_key)
            logger.info("Anthropic client initialised.")

        if openai_key and openai_key != "your_openai_api_key_here":
            self._openai = openai.OpenAI(api_key=openai_key)
            logger.info("OpenAI client initialised.")

        if groq_key and groq_key != "your_groq_api_key_here":
            self._groq = Groq(api_key=groq_key)
            logger.info("Groq client initialised (model: %s).", self._groq_model)

    def _format_conversation(self, messages: List[Message]) -> str:
        return "\n\n".join(f"[{m.role.upper()}]: {m.content}" for m in messages)

    def _call_groq(self, user_message: str) -> Dict[str, Any]:
        if not self._groq:
            raise RuntimeError("Groq client not initialised — check GROQ_API_KEY")
        response = self._groq.chat.completions.create(
            model=self._groq_model,
            messages=[
                {"role": "system", "content": MASTER_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
        return json.loads(_clean_json(response.choices[0].message.content))

    def _call_claude(self, user_message: str) -> Dict[str, Any]:
        if not self._anthropic:
            raise RuntimeError("Anthropic client not initialised — check ANTHROPIC_API_KEY")
        response = self._anthropic.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=MASTER_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return json.loads(_clean_json(response.content[0].text))

    def _call_openai(self, user_message: str) -> Dict[str, Any]:
        if not self._openai:
            raise RuntimeError("OpenAI client not initialised — check OPENAI_API_KEY")
        response = self._openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": MASTER_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
        return json.loads(_clean_json(response.choices[0].message.content))

    def _truncate(self, messages: List[Message]) -> List[Message]:
        if len(messages) <= self._max_messages:
            return messages
        keep_head = self._max_messages // 5
        keep_tail = self._max_messages - keep_head
        return messages[:keep_head] + messages[-keep_tail:]

    def extract_context(
        self,
        messages: List[Message],
        project_name: str,
        additional_context: str = "",
    ) -> Dict[str, Any]:
        truncated = self._truncate(messages)

        extra_block = (
            f"\n\nAdditional developer context:\n{additional_context.strip()}"
            if additional_context and additional_context.strip()
            else ""
        )

        user_message = (
            f"Project name: {project_name}{extra_block}\n\n"
            f"Conversation:\n{self._format_conversation(truncated)}"
        )

        _all = {
            "groq":   self._call_groq,
            "claude": self._call_claude,
            "openai": self._call_openai,
        }
        primary   = _all.get(self._provider, self._call_groq)
        fallbacks = [fn for key, fn in _all.items() if key != self._provider]
        providers: List[Callable[[str], Dict[str, Any]]] = [primary, *fallbacks]

        for call_fn in providers:
            try:
                result = call_fn(user_message)
                logger.info(
                    "LLM keys from %s: %s",
                    call_fn.__name__, list(result.keys())
                )
                logger.info(
                    "next_action=%r | context_paragraph=%r",
                    str(result.get("next_action", ""))[:80],
                    str(result.get("context_paragraph", ""))[:80],
                )
                if _REQUIRED_KEYS.issubset(result.keys()):
                    logger.info("LLM extraction succeeded via %s", call_fn.__name__)
                    return result
                logger.warning(
                    "%s missing keys %s — trying next provider",
                    call_fn.__name__,
                    _REQUIRED_KEYS - result.keys(),
                )
            except RuntimeError as exc:
                logger.warning("Provider skipped: %s", exc)
            except json.JSONDecodeError as exc:
                logger.warning("Non-JSON from LLM: %s", exc)
            except Exception as exc:
                logger.error("LLM call error (%s): %s", call_fn.__name__, exc)

        logger.warning("All LLM providers failed — returning empty result.")
        return _empty_result(project_name)
