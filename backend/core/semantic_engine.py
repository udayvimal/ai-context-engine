import logging
from typing import Dict, List

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

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


class SemanticEngine:
    """
    Scores and filters conversation messages by technical relevance
    so the LLM receives only the most information-dense content.

    Why semantic not keyword:
    - "JWT auth" matches "token authentication"
    - "database error" matches "PostgreSQL connection failed"
    Keyword search misses these; embedding similarity catches them.
    """

    def __init__(self) -> None:
        logger.info("Loading sentence-transformer model…")
        # all-MiniLM-L6-v2: ~80 MB, CPU-friendly, fast
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Semantic engine ready.")

    def embed(self, text: str) -> np.ndarray:
        return self.model.encode([text])[0]

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        return self.model.encode(texts)

    def similarity(self, text1: str, text2: str) -> float:
        e1 = self.embed(text1)
        e2 = self.embed(text2)
        return float(cosine_similarity([e1], [e2])[0][0])

    def find_most_relevant_messages(
        self,
        messages: List[Dict],
        top_k: int = 20,
    ) -> List[Dict]:
        """
        Score every message and return the top_k most technically
        relevant ones, preserving original conversation order.

        Scoring weights:
          +3.0  contains a code block
          +2.0  contains an error / exception keyword
          +1.5  contains a decision keyword
          +2.0  recency bonus (scaled 0→1 by position)
          +1.0  length bonus (capped at 1000 chars)
        """
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

            # Recency: last message = 1.0 bonus, first = 0.0
            score += (i / total) * 2.0

            # Length bonus (up to +1.0)
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
        """
        Semantic search across saved project extractions.
        e.g. query="how did I set up JWT" returns the auth
        project even if it was labelled "token authentication".
        """
        if not saved_contexts:
            return []

        q_emb = self.embed(query)
        results = []

        for ctx in saved_contexts:
            ctx_text = " ".join(filter(None, [
                ctx.get("project_name", ""),
                ctx.get("context_paragraph", ""),
                " ".join(ctx.get("working", [])),
                " ".join(
                    d.get("chose", "") for d in ctx.get("decisions", [])
                ),
            ]))
            c_emb = self.embed(ctx_text)
            sim   = float(cosine_similarity([q_emb], [c_emb])[0][0])
            results.append((sim, ctx))

        results.sort(key=lambda x: x[0], reverse=True)
        return [
            {**ctx, "relevance_score": round(sim, 3)}
            for sim, ctx in results[:top_k]
        ]

    def detect_topic_shifts(self, messages: List[Dict]) -> List[int]:
        """
        Return indices where conversation topic shifted significantly
        (cosine similarity between adjacent windows drops below 0.3).
        """
        if len(messages) < 10:
            return []

        window  = 5
        shifts  = []

        for i in range(window, len(messages) - window):
            before = " ".join(m.get("content", "") for m in messages[i - window: i])
            after  = " ".join(m.get("content", "") for m in messages[i: i + window])
            if self.similarity(before, after) < 0.3:
                shifts.append(i)

        return shifts
