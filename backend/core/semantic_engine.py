import logging
import math
from typing import Dict, List

logger = logging.getLogger(__name__)

_ERROR_WORDS = {
    "error", "exception", "traceback", "failed", "typeerror",
    "valueerror", "attributeerror", "importerror", "syntaxerror",
    "cannot", "undefined", "null", "none", "crash", "bug",
}
_DECISION_WORDS = {
    "decided", "using", "instead", "chose", "going with",
    "installed", "added", "switched", "replaced", "picked",
}


def _word_set(text: str) -> set:
    return set(text.lower().split())


def _cosine(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    return inter / math.sqrt(len(a) * len(b))


class SemanticEngine:
    """
    Pure-Python relevance scoring — no ML dependencies.
    Uses keyword heuristics + TF overlap for similarity.
    """

    def __init__(self) -> None:
        logger.info("SemanticEngine ready (pure-Python mode).")

    def find_most_relevant_messages(
        self,
        messages: List[Dict],
        top_k: int = 20,
    ) -> List[Dict]:
        if len(messages) <= top_k:
            return messages

        total = len(messages)
        scored: List[tuple] = []

        for i, msg in enumerate(messages):
            content = msg.get("content", "")
            lower   = content.lower()
            score   = 0.0

            if "```" in content:
                score += 3.0
            if any(w in lower for w in _ERROR_WORDS):
                score += 2.0
            if any(w in lower for w in _DECISION_WORDS):
                score += 1.5
            score += (i / total) * 2.0
            score += min(len(content) / 1000.0, 1.0)

            scored.append((score, i, msg))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_indices = sorted(x[1] for x in scored[:top_k])
        return [messages[i] for i in top_indices]

    def search_past_contexts(
        self,
        query: str,
        saved_contexts: List[Dict],
        top_k: int = 3,
    ) -> List[Dict]:
        if not saved_contexts:
            return []

        q_words = _word_set(query)
        results = []

        for ctx in saved_contexts:
            ctx_text = " ".join(filter(None, [
                ctx.get("project_name", ""),
                ctx.get("context_paragraph", ""),
                " ".join(ctx.get("working", [])),
                " ".join(d.get("chose", "") for d in ctx.get("decisions", [])),
            ]))
            sim = _cosine(q_words, _word_set(ctx_text))
            results.append((sim, ctx))

        results.sort(key=lambda x: x[0], reverse=True)
        return [
            {**ctx, "relevance_score": round(sim, 3)}
            for sim, ctx in results[:top_k]
        ]

    def detect_topic_shifts(self, messages: List[Dict]) -> List[int]:
        if len(messages) < 10:
            return []

        window = 5
        shifts = []

        for i in range(window, len(messages) - window):
            before = " ".join(m.get("content", "") for m in messages[i - window: i])
            after  = " ".join(m.get("content", "") for m in messages[i: i + window])
            if _cosine(_word_set(before), _word_set(after)) < 0.3:
                shifts.append(i)

        return shifts
