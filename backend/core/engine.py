import hashlib
import re
from typing import Any, Dict, List

from api.models.schemas import CodeBlock, Message
from core.semantic_engine import SemanticEngine


class ContextEngine:
    _GOAL_PATTERNS = [
        r"i(?:'m| am) (?:trying to |going to |planning to )?build(?:ing)? (.{10,150})",
        r"i want to (.{10,150})",
        r"the goal is (?:to )?(.{10,150})",
        r"i(?:'m| am) (?:creating|developing|making|working on) (.{10,150})",
        r"help me (?:build|create|make|develop) (.{10,150})",
        r"i need to (?:build|create|make|develop) (.{10,150})",
        r"we(?:'re| are) building (.{10,150})",
        r"this project (?:is|will) (.{10,150})",
    ]

    _PROGRESS_PATTERNS = [
        r"(?:i(?:'ve| have)|we(?:'ve| have)) (?:completed?|finished?|done|implemented?|built?|created?|added?|set up|configured?) (.{5,150})",
        r"(?:it|that|this) (?:is )?(?:now )?(?:working|works|done|complete|finished)",
        r"successfully (?:set up|configured?|implemented?|created?|built?) (.{5,100})",
        r"(?:got|get) (.{5,100}) (?:working|to work)",
        r"(?:fixed|resolved|solved) (.{5,100})",
    ]

    _ERROR_PATTERNS = [
        r"(?:Error|Exception|TypeError|ValueError|AttributeError|ImportError"
        r"|ModuleNotFoundError|SyntaxError|NameError|KeyError|IndexError"
        r"|RuntimeError)[\s:].{5,200}",
        r"(?:i(?:'m| am)) (?:getting|seeing|facing|having) (?:an? )?(?:error|issue|problem|bug) .{5,150}",
        r"(?:the )?(?:error|issue|problem|bug) (?:is|seems to be) .{5,150}",
        r"Traceback \(most recent call last\)[\s\S]{0,500}",
        r"(?:localhost|server|api|endpoint) (?:is )?(?:not|isn't) (?:responding|working|running)",
    ]

    _DECISION_PATTERNS = [
        r"(?:i(?:'ve| have)|we(?:'ve| have)) (?:decided|chosen|opted) (?:to use |to go with |on )?.{5,150}",
        r"(?:going|went) with .{5,100} (?:because|instead|for)",
        r"(?:chose|choosing|use|using) .{5,100} (?:instead of|over|rather than) .{5,100}",
        r"(?:decided|decision) (?:to )?(?:use |go with )?.{5,150}",
        r"(?:will|should) use .{5,100} (?:for|to|because)",
    ]

    _CODE_FENCE = re.compile(r"```(\w*)\n?([\s\S]*?)```", re.MULTILINE)

    def __init__(self) -> None:
        self.semantic = SemanticEngine()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _get_full_text(self, messages: List[Message]) -> str:
        return "\n\n".join(f"[{m.role.upper()}]: {m.content}" for m in messages)

    def _get_user_text(self, messages: List[Message]) -> str:
        return "\n\n".join(m.content for m in messages if m.role == "user")

    # ── Individual extractors ─────────────────────────────────────────────────

    def detect_goal(self, text: str) -> str:
        for pattern in self._GOAL_PATTERNS:
            m = re.search(pattern, text[:3000], re.IGNORECASE)
            if m:
                return m.group(0).strip().capitalize()
        return "Not mentioned in conversation"

    def extract_progress(self, text: str) -> List[str]:
        results, seen = [], set()
        for pattern in self._PROGRESS_PATTERNS:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                item = m.group(0).strip()
                key  = re.sub(r"\s+", " ", item.lower())[:80]
                if key not in seen and len(item) > 8:
                    seen.add(key)
                    results.append(item.capitalize())
        return results[:10]

    def detect_errors(self, text: str) -> List[str]:
        results, seen = [], set()
        for pattern in self._ERROR_PATTERNS:
            for m in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
                item = m.group(0).strip()[:200]
                key  = item.lower()[:80]
                if key not in seen and len(item) > 5:
                    seen.add(key)
                    results.append(item)
        return results[:8]

    def extract_code(self, text: str) -> List[CodeBlock]:
        """
        Extract fenced code blocks.
        Returns REVERSED so index 0 = most recent (last written) code.
        """
        results, seen_hashes = [], set()
        for m in self._CODE_FENCE.finditer(text):
            language = m.group(1).strip() or "text"
            code     = m.group(2).strip()
            if not code or len(code) < 20:
                continue
            h = hashlib.md5(code.encode()).hexdigest()
            if h in seen_hashes:
                continue
            seen_hashes.add(h)
            first_line  = code.split("\n")[0].strip()
            description = first_line[:80] if first_line else f"{language} code block"
            results.append(CodeBlock(language=language, code=code, description=description))

        # Most recent code first
        return list(reversed(results))[:15]

    def extract_decisions(self, text: str) -> List[str]:
        results, seen = [], set()
        for pattern in self._DECISION_PATTERNS:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                item = m.group(0).strip()
                key  = re.sub(r"\s+", " ", item.lower())[:80]
                if key not in seen and len(item) > 8:
                    seen.add(key)
                    results.append(item.capitalize())
        return results[:8]

    # ── Main entry ────────────────────────────────────────────────────────────

    def extract_all(self, messages: List[Message]) -> Dict[str, Any]:
        """
        Use SemanticEngine to select the 20 most technically relevant
        messages from the full conversation, then run all heuristic
        extractors on that filtered set.
        """
        # Semantic filtering — score and rank all messages
        raw_dicts = [{"role": m.role, "content": m.content} for m in messages]
        relevant_dicts = self.semantic.find_most_relevant_messages(
            raw_dicts, top_k=20
        )

        # Convert back to Message objects
        relevant: List[Message] = [
            Message(role=d["role"], content=d["content"])
            for d in relevant_dicts
        ]

        full_text = self._get_full_text(relevant)
        user_text = self._get_user_text(relevant)

        return {
            "goal":                  self.detect_goal(user_text or full_text),
            "progress":              self.extract_progress(full_text),
            "issues":                self.detect_errors(full_text),
            "code_blocks":           self.extract_code(full_text),
            "decisions":             self.extract_decisions(full_text),
            "relevant_message_count": len(relevant),
            "total_message_count":   len(messages),
        }
