# Changelog

Every change to this project is recorded here.
When you make a change — add an entry at the **top** of this file under today's date.

## How to add an entry

```
## [YYYY-MM-DD] — Your Name
### Files Changed
- `path/to/file.py` — what you changed and why (one line per file)

### What Was Added
- bullet point description

### What Was Fixed
- bullet point description

### What Was Removed / Replaced
- bullet point description
```

Keep entries in **newest-first** order. One block per work session is fine.

---

---

## [2026-05-01] — Ayush (udayvimal)

### Files Changed
- `backend/services/llm.py` — replaced MASTER_PROMPT with new flat schema; removed smart_truncate import; added inline `_truncate()`
- `backend/api/models/schemas.py` — complete rewrite with new Pydantic models for new JSON structure
- `backend/api/routes/context.py` — updated mapping for new LLM output; handles `"not"` Python keyword → `rejected`; handles tech_stack as list fallback
- `backend/services/storage.py` — updated to use `response.next_action` and `response.context_paragraph` instead of old field names
- `backend/requirements.txt` — added `sentence-transformers==2.7.0`, `scikit-learn==1.4.0`, `numpy==1.26.4`
- `backend/core/semantic_engine.py` — **NEW FILE** — semantic message scoring and search using sentence-transformers
- `backend/core/engine.py` — integrated SemanticEngine; fixed `extract_code()` to return most recent code first (reversed)
- `extension/popup.html` — completely rewritten with new section order and new DOM elements
- `extension/popup.css` — added styles for `.active-bar`, `.tech-bar`, `.broken-card`, `.broken-list`
- `extension/popup.js` — rewrote `render()` and `buildResumePrompt()` for new schema field names
- `README.md` — **NEW FILE** — full architecture, flow, and function-by-function documentation

### What Was Added

**Backend:**
- `SemanticEngine` class in `core/semantic_engine.py`
  - `find_most_relevant_messages()` — scores messages (+3 code, +2 error, +1.5 decision, +2 recency, +1 length) and returns top-20 in original order
  - `search_past_contexts()` — semantic cosine-similarity search across saved extractions
  - `detect_topic_shifts()` — finds indices where conversation topic changed (similarity < 0.3)
  - `embed()`, `embed_batch()`, `similarity()` — thin wrappers around sentence-transformer model
- New MASTER_PROMPT fields: `active_file`, `active_function`, `tech_stack` (nested object), `files_touched`, `last_code`, `last_error.cause`, `last_error.fix`, `working`, `broken`, `decisions` (chose/not/why), `commands_run`, `next_action`, `context_paragraph`
- New Pydantic models: `TechStack`, `FileTouched`, `LastCode`, `Decision`

**Extension:**
- Active file/function bar (blue filename + purple function pill) at top of results
- Tech stack tag bar (language, framework, database, runtime as `.tag.tech`; other libraries as `.tag.lib`)
- **Working** section — green check-list
- **Broken** section — red ✗-list with red left-border card
- Files Touched section — monospace list of `path — purpose`
- Commands Run section — monospace list of terminal commands

### What Was Fixed
- `extract_code()` was returning first code block at index 0 — now returns LAST (most recent) code block at index 0 via `list(reversed(results))`
- Old schema had `project_structure`, `what_was_being_built`, `already_done`, `technical_decisions`, `last_code_written` — replaced with simpler flat structure
- `storage.py` was referencing `response.next_step` and `response.resume_prompt` which no longer exist — now correctly uses `response.next_action` and `response.context_paragraph`

### What Was Replaced
- `MASTER_PROMPT` nested structure → flat structure (fewer levels, easier for LLM to fill correctly)
- `smart_truncate()` from `token_manager.py` → inline `_truncate()` in `LLMService` (simpler, no external dependency)
- Old popup sections (Summary, What Was Being Built, Already Done) → new section order: Next Action → Active Error → Last Code → Working → Broken → Decisions → Context Paragraph
- `ProjectStructure`, `WhatWasBeingBuilt`, `LastError` (old), `TechnicalDecision`, `LastCodeWritten` models → `TechStack`, `FileTouched`, `LastCode`, `LastError` (new with cause/fix), `Decision`

---

## [2026-04-30] — Ayush (udayvimal)

### Files Changed
- `extension/background.js` — added `additional_context` field to backend POST body (was missing, causing empty context hints)
- `backend/services/llm.py` — raised `max_tokens` from 1024 → 4096 for all three providers; added `_clean_json()` to strip markdown fences; added `_REQUIRED_KEYS` validation with per-provider logging
- `backend/db/database.py` — added `_migrate()` auto-migration so columns are added on startup without deleting the DB
- `extension/popup.html` — added "Extra context" textarea (`additionalContext`), Copy to Clipboard button
- `extension/popup.js` — added `buildResumePrompt()` client-side fallback; added copy button handler; added scroll ticker with step messages

### What Was Added
- `_clean_json()` utility in `llm.py` — strips ` ```json ` fences LLMs add despite instructions
- `_REQUIRED_KEYS` set in `llm.py` — validates every required key is present before accepting LLM response
- Auto-migration in `database.py` — `_migrate()` uses `inspect()` + `ALTER TABLE ADD COLUMN` instead of requiring DB deletion
- Client-side `buildResumePrompt()` in `popup.js` — builds resume prompt from extracted fields when LLM `context_paragraph` is empty
- Scroll status ticker in `popup.js` — cycles "Scrolling…", "Loading older messages…", "Long conversation…", "Almost there…"
- Additional context textarea in popup — developer can hint: project path, OS, focus module

### What Was Fixed
- `max_tokens=1024` was truncating the LLM JSON mid-object — raised to 4096
- LLM wrapping JSON in ` ```json ``` ` fences — fixed by `_clean_json()` before `json.loads()`
- `background.js` was not passing `additional_context` to the backend — fixed by destructuring it from the message
- DB locked error when trying to delete and recreate — fixed by `_migrate()` pattern (adds columns, never deletes)
- All popup fields showing empty — root cause was LLM returning `{}` for nested objects when `max_tokens` was too low

---

## [2026-04-29] — Ayush (udayvimal)

### Files Changed
- `extension/content.js` — rewrote `scrapeChatGPT()` to use `article[data-testid^="conversation-turn"]` as primary selector; rewrote `scrapeClaude()` with multi-selector fallback and DOM-order sort
- `extension/scroller.js` — **NEW FILE** — `scrollToLoadAll()` and `findScrollContainer()`
- `extension/manifest.json` — added `scroller.js` before `content.js` in content_scripts order
- `backend/services/llm.py` — initial MASTER_PROMPT with nested structure; Groq as primary, Claude + OpenAI as fallbacks
- `backend/core/engine.py` — initial heuristic extractors (goal, progress, errors, code, decisions)
- `backend/api/models/schemas.py` — initial Pydantic models
- `backend/api/routes/context.py` — initial route
- `backend/db/database.py` — initial SQLAlchemy setup
- `backend/db/models.py` — `Project` and `ContextHistory` ORM models
- `backend/db/crud.py` — `get_or_create_project()`, `create_context_history()`
- `backend/main.py` — FastAPI app with CORS, lifespan, router registration
- `backend/requirements.txt` — initial dependencies
- `.gitignore` — **NEW FILE**

### What Was Added
- Full project structure created from scratch
- FastAPI backend with SQLite storage
- Chrome Extension MV3 with popup, content script, background service worker
- ChatGPT DOM scraper using `article[data-testid^="conversation-turn"]` + `data-message-author-role`
- Claude.ai DOM scraper using `[data-testid="user-message"]` + assistant selector fallback chain
- `scrollToLoadAll()` — forces ChatGPT's virtualised conversation into the DOM by repeatedly scrolling to top
- LLM extraction pipeline: Groq primary → Claude fallback → OpenAI fallback
- SQLAlchemy ORM with auto-table creation on startup
- Pydantic v2 request/response models

### What Was Fixed
- ChatGPT scraper was picking up button text ("Copy", "Edit") — fixed by targeting `[class*="whitespace-pre-wrap"]` specifically for user messages
- Claude scraper was missing messages when multiple assistant blocks existed — fixed with DOM-position sort + consecutive-block merging
- Only 14 messages being scraped from long ChatGPT threads — fixed by `scroller.js` forcing lazy-rendered messages into DOM

---

<!-- ── Add new entries ABOVE this line ── -->
