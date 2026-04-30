# AI Context Continuity Engine

A Chrome Extension + FastAPI backend that solves the **session amnesia problem** in AI-assisted development.

**The problem:** You spend 3 hours coding with ChatGPT or Claude. The session expires or you open a new tab. The new AI has zero memory — you waste 20 minutes re-explaining your entire project, tech stack, errors, and where you left off.

**The solution:** Click one button. The extension scrapes your full conversation, sends it to the backend, an LLM extracts every important technical detail into a structured JSON, and you get a ready-to-paste **Resume Prompt** that brings any new AI session up to speed instantly.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Full Request Flow (Step by Step)](#full-request-flow)
3. [Chrome Extension — File by File](#chrome-extension)
4. [Backend — File by File](#backend)
5. [Data Models](#data-models)
6. [Database](#database)
7. [API Reference](#api-reference)
8. [Setup & Running](#setup--running)
9. [Environment Variables](#environment-variables)
10. [Tech Stack](#tech-stack)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER                               │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────────┐   │
│  │  popup.html  │    │  content.js  │    │   background.js     │   │
│  │  popup.js    │───▶│  scroller.js │    │  (service worker)   │   │
│  │  popup.css   │    │              │    │                     │   │
│  │              │◀───│  Scrapes DOM │    │  Calls backend API  │   │
│  │  User clicks │    │  ChatGPT /   │    │  over fetch()       │   │
│  │  "Extract"   │    │  Claude.ai   │    │                     │   │
│  └──────┬───────┘    └──────────────┘    └──────────┬──────────┘   │
│         │                  ▲                        │              │
│         │  sendMessage()   │  sendMessage()         │              │
│         └──────────────────┘                        │              │
│                                                     │              │
└─────────────────────────────────────────────────────┼─────────────-┘
                                                      │ HTTP POST
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND  :8000                          │
│                                                                     │
│  main.py ──▶ /api/v1/process                                        │
│                    │                                                │
│                    ▼                                                │
│             context.py (route)                                      │
│                    │                                                │
│          ┌─────────┴──────────┐                                     │
│          ▼                    ▼                                     │
│    LLMService          SemanticEngine                               │
│    (llm.py)            (semantic_engine.py)                         │
│          │                    │                                     │
│    Groq / Claude /    sentence-transformers                         │
│    OpenAI API         all-MiniLM-L6-v2                              │
│          │                                                          │
│          ▼                                                          │
│    StorageService ──▶ SQLite / PostgreSQL                           │
│    (storage.py)       (via SQLAlchemy)                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Full Request Flow

Here is the complete journey of one click on **"Extract Full Context"**, traced through every function.

### Step 1 — User clicks the button (`popup.js`)

**Function:** `extractBtn.addEventListener("click", async () => { ... })`

1. Hides previous results, shows loading spinner.
2. Queries Chrome for the currently active tab (`chrome.tabs.query`).
3. Checks the tab URL hostname — aborts with an error if it's not `chatgpt.com`, `openai.com`, or `claude.ai`.
4. If **Auto-scroll** is enabled, starts a status ticker that cycles through messages like "Scrolling to load full conversation…".
5. Sends a `{ action: "extract", scroll: true }` message to the **content script** running inside the conversation page.

---

### Step 2 — Scroll to load all messages (`scroller.js`)

Only runs if auto-scroll is enabled. ChatGPT uses **virtual DOM rendering** — messages outside the viewport are not in the DOM. Scrolling forces them to render.

**Function:** `scrollToLoadAll()`

1. Calls `findScrollContainer()` to locate the scrollable `<div>` (tries ChatGPT-specific selectors first, then generic overflow containers, then picks the div with the largest scrollable height as a last resort).
2. Every 500ms (`TICK_MS`), jumps `scrollTop = 0` to force lazy rendering of older messages.
3. After each jump, records `container.scrollHeight`.
4. If the height stays the same for 4 consecutive ticks (`MAX_STABLE`), the conversation is fully loaded — resolves the Promise.
5. Hard stops after 60 ticks (30 seconds) regardless.
6. Restores scroll position to the bottom before resolving.

**Function:** `findScrollContainer()`

Tries selectors in order: `div[class*="conversation"]` → `div[class*="overflow-y-auto"]` → `main` → `#__next` → fallback brute-force (the `div` with the largest `scrollHeight - clientHeight`).

---

### Step 3 — Scrape the conversation DOM (`content.js`)

**Function:** `extractMessages(shouldScroll)`

Top-level coordinator. Calls `detectSource()`, optionally awaits `scrollToLoadAll()`, then routes to the correct scraper.

---

**Function:** `detectSource()`

Returns `"chatgpt"`, `"claude"`, or `"unknown"` based on `window.location.hostname`.

---

**Function:** `inferProjectName()`

Reads `document.title` and strips the platform suffix (`"- ChatGPT"`, `"| Claude"`) to get a clean project name. Falls back to `"Unnamed Project"`.

---

**Function:** `scrapeChatGPT()`

ChatGPT marks each conversation turn with `<article data-testid="conversation-turn-N">`. Inside each article, a child element carries `data-message-author-role="user"` or `data-message-author-role="assistant"`.

- **Primary path:** Queries all `article[data-testid^="conversation-turn"]`, reads the role attribute, then picks the right inner element:
  - For `user`: targets `[class*="whitespace-pre-wrap"]` (pure text, excludes Copy/Edit buttons).
  - For `assistant`: targets `.markdown` or `[class*="prose"]` (the rendered markdown container).
- **Fallback:** If no `<article>` elements are found (ChatGPT may update its DOM), falls back to querying `[data-message-author-role]` directly across the whole page.
- Returns an array of `{ role, content }` objects in conversation order.

---

**Function:** `scrapeClaude()`

Claude.ai uses `[data-testid="user-message"]` for user turns. Assistant turns have no single guaranteed selector, so multiple are tried in order of likelihood:
1. `[data-testid="assistant-message"]`
2. `.font-claude-message`
3. `.assistant-message`
4. `.prose` (filtered to exclude elements inside user-message containers)

After collecting all elements:
1. Sorts them by actual DOM position using `compareDocumentPosition` (`beforeInDom()` helper).
2. Merges consecutive same-role blocks (happens when Claude regenerates a response — two assistant blocks appear back-to-back).
3. Returns `{ role, content }` array in order.

---

### Step 4 — Send to background service worker (`popup.js` → `background.js`)

**popup.js** cannot call the backend directly due to Chrome Extension Content Security Policy. It sends a message to the **background service worker** which runs in an unrestricted context.

```
popup.js ──chrome.runtime.sendMessage()──▶ background.js
```

Payload sent:
```json
{
  "action": "processContext",
  "messages": [...],
  "projectName": "My App",
  "source": "chatgpt",
  "backendUrl": "http://localhost:8000",
  "additionalContext": "Windows 11, focus on auth module"
}
```

---

### Step 5 — HTTP POST to backend (`background.js`)

**Function:** `chrome.runtime.onMessage.addListener` in `background.js`

Receives the message from `popup.js` and makes a `fetch()` POST to `{backendUrl}/api/v1/process`.

Request body (JSON):
```json
{
  "messages": [{ "role": "user", "content": "..." }, ...],
  "project_name": "My App",
  "source": "chatgpt",
  "additional_context": "..."
}
```

Returns `{ success: true, data: {...} }` or `{ success: false, error: "..." }` to `popup.js`.

---

### Step 6 — FastAPI receives the request (`main.py` → `context.py`)

**`main.py`** boots FastAPI, registers CORS middleware, and mounts two routers:
- `/api/v1` → `context.py` (the main extraction endpoint)
- `/api/v1` → `projects.py` (history/listing endpoints)

On startup (`lifespan()`), calls `init_db()` to create tables and run migrations.

**`context.py` — `process_conversation()` endpoint**

`POST /api/v1/process`

1. Validates the `ProcessRequest` (1–500 messages).
2. Calls `_llm.extract_context()` — the main intelligence step.
3. Maps the raw LLM dict to typed Pydantic models with safe defaults.
4. Handles the `"not"` key in decisions (Python keyword) → maps to `rejected` field.
5. Gracefully handles if `tech_stack` comes back as a flat list instead of an object.
6. Saves to database via `StorageService` (non-fatal — never fails the API if DB is unavailable).
7. Returns the `EnhancedContextResponse`.

---

### Step 7 — Semantic message filtering (`semantic_engine.py`)

Before sending messages to the LLM, `SemanticEngine` scores and ranks them so only the most technically relevant messages are passed — avoiding wasted tokens on small talk.

**`SemanticEngine.__init__()`**

Loads the `all-MiniLM-L6-v2` sentence-transformer model (~80 MB, CPU-friendly). Called once at startup.

---

**`SemanticEngine.find_most_relevant_messages(messages, top_k=20)`**

Scores every message with a weighted heuristic (no neural inference needed — fast):

| Signal | Score bonus |
|--------|-------------|
| Contains a code block (` ``` `) | +3.0 |
| Contains an error keyword (`error`, `exception`, `traceback`, `failed`, etc.) | +2.0 |
| Contains a decision keyword (`decided`, `using`, `installed`, `switched`, etc.) | +1.5 |
| Recency (last message = max bonus, first = 0) | 0.0 → +2.0 |
| Length (capped at 1000 chars) | 0.0 → +1.0 |

Returns the top-k messages **in their original conversation order** (preserves chronology for the LLM).

---

**`SemanticEngine.search_past_contexts(query, saved_contexts, top_k=3)`**

Used for semantic search across saved extractions. Embeds the query and each saved context (project name + context paragraph + decisions), computes cosine similarity, and returns the top-k matches with their relevance score. Example: query `"how did I set up JWT"` finds the project labelled `"token authentication"`.

---

**`SemanticEngine.detect_topic_shifts(messages)`**

Finds indices in the conversation where the topic changed significantly. Compares embedding similarity between sliding windows of 5 messages. If similarity drops below `0.3`, marks that index as a topic shift. Used for analysis — not in the main extraction flow.

---

**`SemanticEngine.embed(text)` / `embed_batch(texts)`**

Thin wrappers around `SentenceTransformer.encode()`. Returns a numpy array.

---

**`SemanticEngine.similarity(text1, text2)`**

Computes cosine similarity between two text strings. Returns a float `0.0–1.0`.

---

### Step 8 — Heuristic extraction (`engine.py`)

`ContextEngine` runs regex-based extractors over the semantically filtered messages. These run alongside (and in some cases as a quality check against) the LLM extraction.

**`ContextEngine.__init__()`**

Instantiates `SemanticEngine` (loads the model once).

---

**`ContextEngine.detect_goal(text)`**

Scans user messages for goal-stating patterns: `"I'm trying to build..."`, `"I want to..."`, `"The goal is..."`, `"Help me build..."`, `"We're building..."`. Returns the first match or `"Not mentioned in conversation"`.

---

**`ContextEngine.extract_progress(text)`**

Finds sentences describing completed work: `"I've completed..."`, `"Successfully set up..."`, `"Got X working"`, `"Fixed..."`. Deduplicates by normalised lowercase key (first 80 chars). Returns up to 10 items.

---

**`ContextEngine.detect_errors(text)`**

Matches Python exception class names (`TypeError`, `ValueError`, `AttributeError`, etc.), error-describing phrases (`"I'm getting an error..."`, `"The issue is..."`), tracebacks, and server connection failures. Returns up to 8 items (truncated to 200 chars each).

---

**`ContextEngine.extract_code(text)`**

Finds all fenced code blocks (` ```language\ncode``` `). Deduplicates by MD5 hash of the code content. Uses the first line of each block as its description. **Returns in reverse order** (most recent code block first, index 0). Returns up to 15 blocks.

---

**`ContextEngine.extract_decisions(text)`**

Matches decision phrases: `"I've decided to use..."`, `"Going with X because..."`, `"Chose X instead of Y"`, `"Will use X for..."`. Returns up to 8 items.

---

**`ContextEngine.extract_all(messages)`**

Main entry point. Calls `semantic.find_most_relevant_messages()` to filter to the 20 most relevant messages, then runs all extractors on that filtered set. Returns a dict with keys: `goal`, `progress`, `issues`, `code_blocks`, `decisions`, `relevant_message_count`, `total_message_count`.

---

### Step 9 — LLM deep extraction (`llm.py`)

This is the most important step. The LLM reads the full conversation and extracts structured JSON.

**`LLMService.__init__()`**

Reads API keys from environment variables (`GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). Only initialises clients for keys that are present and non-placeholder. Logs which providers are available.

---

**`LLMService._truncate(messages)`**

If the conversation has more than `MAX_MESSAGES` (default 200), keeps the first 20% (head) and last 80% (tail). Simple truncation — the semantic filter in `SemanticEngine` handles quality, this handles raw volume.

---

**`LLMService._format_conversation(messages)`**

Serialises messages into a plain text block:
```
[USER]: message content here

[ASSISTANT]: response content here
```

---

**`LLMService._call_groq(user_message)`** ← Primary provider

Calls the Groq API (`llama-3.3-70b-versatile` by default) with `response_format: json_object` to guarantee JSON output. `max_tokens=4096`.

---

**`LLMService._call_claude(user_message)`** ← Fallback #1

Calls `claude-sonnet-4-6`. Claude does not support `response_format`, so `_clean_json()` strips any markdown fences from the response.

---

**`LLMService._call_openai(user_message)`** ← Fallback #2

Calls `gpt-4o-mini` with `response_format: json_object`. `max_tokens=4096`.

---

**`LLMService._clean_json(text)`**

Strips markdown code fences that some models add despite instructions. Order:
1. Regex for ` ```json ... ``` `.
2. If not found, extracts from first `{` to last `}`.
3. Returns raw text as-is if neither matches.

---

**`LLMService.extract_context(messages, project_name, additional_context)`**

Main extraction method — orchestrates the full LLM pipeline:

1. Truncates messages via `_truncate()`.
2. Appends the developer's additional context (project path, OS, etc.) to the prompt.
3. Tries providers in order: `primary` (default Groq) → fallback #1 → fallback #2.
4. For each provider, validates that all `_REQUIRED_KEYS` are present in the returned JSON.
5. If a provider returns missing keys, logs a warning and tries the next.
6. If all providers fail, returns `_empty_result()`.

---

**`MASTER_PROMPT`**

The system prompt sent to every LLM. It instructs the model to output a single JSON object with these fields:

| Field | Description |
|-------|-------------|
| `project_name` | Name of the project |
| `active_file` | File being actively edited |
| `active_function` | Exact function/method/endpoint being written |
| `tech_stack` | Object: `language`, `framework`, `database`, `runtime`, `other[]` |
| `files_touched` | Array of `{ path, purpose }` objects |
| `last_code` | Verbatim last code block: `file`, `language`, `code`, `purpose` |
| `last_error` | `message`, `file`, `line`, `cause`, `fix`, `resolved` |
| `working` | List of things confirmed working |
| `broken` | List of things not working |
| `decisions` | Array of `{ chose, not, why }` — what was chosen vs rejected and why |
| `commands_run` | Terminal commands executed in the session |
| `next_action` | ONE ultra-specific next step (file + action) |
| `context_paragraph` | 200+ word dense paragraph with everything needed to resume |

Critical rules enforced in the prompt: never invent libraries, `last_code.code` must be verbatim (not a description), `context_paragraph` is mandatory and minimum 200 words.

---

**`_empty_result(project_name)`**

Fallback when all LLM providers fail. Returns a valid but empty `EnhancedContextResponse` dict so the API never crashes.

---

### Step 10 — Save to database (`storage.py` → `crud.py`)

**`StorageService.save_context(request, response)`**

1. Calls `crud.get_or_create_project()` — finds or creates a `Project` row by name.
2. Calls `crud.create_context_history()` with:
   - `next_step` ← `response.next_action`
   - `resume_prompt` ← `response.context_paragraph`
   - `message_count` ← number of messages
   - `raw_data` ← full `response.model_dump()` JSON blob

**`crud.get_or_create_project(db, name, source)`**

Queries `Project` table by name. If not found, creates and commits a new row.

**`crud.create_context_history(db, project_id, next_step, resume_prompt, message_count, raw_data)`**

Inserts a new `ContextHistory` row with a fresh UUID and current timestamp.

---

### Step 11 — Render results (`popup.js`)

**Function:** `render(data)`

Receives the `EnhancedContextResponse` JSON and populates the popup DOM in this order:

1. **Active bar** — shows `active_file` (blue) and `active_function` (purple pill). Hidden if neither is present.
2. **Tech stack bar** — renders language, framework, database, runtime as `.tag.tech` spans; other libraries as `.tag.lib` spans.
3. **Next Action** — `data.next_action` in green card.
4. **Active Error** — shows `message`, `file`, `line`, `cause`, `fix`, and an OPEN/RESOLVED badge. Hidden card replaced by a green "No errors" card if `message` is null.
5. **Last Code** — language badge, file path, purpose, and verbatim code in a scrollable `<pre>`. Hidden if no code.
6. **Working** — green check-list of `data.working`. Hidden if empty.
7. **Broken** — red ✗-list of `data.broken`. Hidden if empty.
8. **Technical Decisions** — each decision is a card with `chose` (title), `why` (green reason), `rejected` (red strikethrough).
9. **Context Paragraph** — the full 200+ word context in a summary card.
10. **Files Touched** — monospace list of `path — purpose`. Hidden if empty.
11. **Commands Run** — monospace list. Hidden if empty.
12. **Resume Prompt** — built by `buildResumePrompt(data)` and placed in a read-only textarea.

---

**Function:** `buildResumePrompt(data)`

Client-side fallback that assembles the resume prompt from extracted fields when the LLM-generated `context_paragraph` is unavailable. Combines: project name, tech stack, active file, files touched, working/broken lists, last error, decisions, commands, last code, context paragraph, and next action. Appends a closing instruction: `"Resume helping me from exactly where we left off. Do not ask me to re-explain anything."`

---

## Chrome Extension

```
extension/
├── manifest.json      Extension config — permissions, content script injection, service worker
├── popup.html         Extension popup UI (420px wide dark theme)
├── popup.css          Styles — dark theme, all component classes
├── popup.js           All UI logic — sends messages, receives data, renders results
├── content.js         Injected into ChatGPT/Claude — scrapes conversation DOM
├── scroller.js        Injected before content.js — forces lazy-loaded messages into DOM
├── background.js      MV3 service worker — calls the backend API
└── icons/             icon16.png, icon48.png, icon128.png
```

### Why separate scroller.js and content.js?

`manifest.json` loads content scripts in order: `["scroller.js", "content.js"]`. This guarantees `scrollToLoadAll()` is defined before `content.js` calls it. They could be merged but are split for clarity.

### Why background.js for the API call?

Chrome MV3 content scripts cannot make cross-origin `fetch()` calls to `localhost`. The background service worker runs outside any page sandbox and can freely call any URL.

---

## Backend

```
backend/
├── main.py                     FastAPI app — startup, CORS, router registration
├── requirements.txt            All Python dependencies
├── .env                        API keys and config (never committed — see .gitignore)
│
├── api/
│   ├── models/
│   │   └── schemas.py          Pydantic request/response models
│   └── routes/
│       ├── context.py          POST /api/v1/process — main extraction endpoint
│       └── projects.py         GET /api/v1/projects — history endpoints
│
├── core/
│   ├── engine.py               Regex-based heuristic extractors (goal, code, errors, decisions)
│   ├── semantic_engine.py      Sentence-transformer scoring + semantic search
│   └── token_manager.py        Legacy smart_truncate() — kept for reference
│
├── services/
│   ├── llm.py                  LLM orchestration — MASTER_PROMPT, Groq/Claude/OpenAI calls
│   └── storage.py              DB persistence — save and retrieve context history
│
└── db/
    ├── database.py             SQLAlchemy engine, session factory, auto-migration
    ├── models.py               ORM models — Project, ContextHistory
    └── crud.py                 Database operations — create, query
```

---

## Data Models

### Request (`ProcessRequest`)

```python
{
  "messages":           [{ "role": "user|assistant", "content": "..." }],
  "project_name":       "My App",           # optional, auto-detected by extension
  "source":             "chatgpt|claude",
  "additional_context": "Windows 11, auth module"   # optional developer hint
}
```

### Response (`EnhancedContextResponse`)

```python
{
  "project_name":      "My App",
  "source":            "chatgpt",
  "message_count":     47,

  "active_file":       "backend/services/llm.py",
  "active_function":   "extract_context",

  "tech_stack": {
    "language":  "Python 3.11",
    "framework": "FastAPI",
    "database":  "SQLite",
    "runtime":   "CPython 3.11",
    "other":     ["Pydantic v2", "sentence-transformers"]
  },

  "files_touched": [
    { "path": "backend/services/llm.py", "purpose": "LLM extraction service" }
  ],

  "last_code": {
    "file":     "backend/services/llm.py",
    "language": "python",
    "code":     "def extract_context(self, ...):\n    ...",
    "purpose":  "Main LLM orchestration method with provider fallback"
  },

  "last_error": {
    "message":  "json.JSONDecodeError: Expecting value: line 1 column 1",
    "file":     "backend/services/llm.py",
    "line":     "179",
    "cause":    "LLM returned markdown-fenced JSON instead of raw JSON",
    "fix":      "Added _clean_json() to strip fences before parsing",
    "resolved": true
  },

  "working":   ["FastAPI server starts", "Groq API returns JSON", "Extension scrapes ChatGPT"],
  "broken":    ["Claude scraper misses some assistant turns"],

  "decisions": [
    { "chose": "Groq llama-3.3-70b", "rejected": "GPT-4o", "why": "10x faster, free tier" }
  ],

  "commands_run":      ["pip install sentence-transformers", "uvicorn main:app --reload"],
  "next_action":       "Open extension/content.js, fix Claude assistant selector on line 108",
  "context_paragraph": "We are building an AI Context Continuity Engine..."
}
```

---

## Database

### Tables

**`projects`**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID string | Primary key |
| `name` | String(255) | Project name (unique key for upsert) |
| `source` | String(50) | `chatgpt` or `claude` |
| `created_at` | DateTime | When first seen |
| `updated_at` | DateTime | Last extraction time |

**`context_history`**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID string | Primary key |
| `project_id` | FK → projects.id | Which project |
| `next_step` | Text | Stores `next_action` from response |
| `resume_prompt` | Text | Stores `context_paragraph` from response |
| `message_count` | Integer | How many messages were processed |
| `extracted_at` | DateTime | Extraction timestamp |
| `raw_data` | JSON | Full `EnhancedContextResponse` as JSON blob |

### Auto-migration (`database.py`)

`_migrate()` runs on every startup. Uses SQLAlchemy `inspect()` to check which columns exist, then issues `ALTER TABLE ADD COLUMN` for any missing ones. This means you can add new columns to `models.py` and they appear in the DB on next restart — no Alembic migration files needed for development.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check, returns version info |
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/process` | Main extraction endpoint |
| `GET` | `/api/v1/projects` | List all projects (ordered by last updated) |
| `GET` | `/api/v1/projects/{id}` | Get a project with full extraction history |
| | `/docs` | Swagger UI (auto-generated) |
| | `/redoc` | ReDoc UI (auto-generated) |

---

## Setup & Running

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
GROQ_API_KEY=gsk_...
ANTHROPIC_API_KEY=sk-ant-...   # optional fallback
OPENAI_API_KEY=sk-...          # optional fallback
LLM_PROVIDER=groq              # primary provider: groq | claude | openai
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=sqlite:///./context_engine.db
MAX_MESSAGES=200
APP_PORT=8000
```

Start the server:
```bash
python main.py
# or
uvicorn main:app --reload --port 8000
```

The first startup downloads the `all-MiniLM-L6-v2` model (~80 MB). Subsequent starts load it from cache.

---

### 2. Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The "AI Context Engine" icon appears in your toolbar

**To use:**
1. Open a ChatGPT or Claude conversation
2. Click the extension icon
3. Optionally enter a project name and extra context
4. Click **Extract Full Context**
5. Copy the Resume Prompt and paste it into a new AI session

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | **Required.** Get free at [console.groq.com](https://console.groq.com) |
| `ANTHROPIC_API_KEY` | — | Optional. Claude fallback |
| `OPENAI_API_KEY` | — | Optional. GPT-4o-mini fallback |
| `LLM_PROVIDER` | `groq` | Which provider to try first |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model name |
| `DATABASE_URL` | `sqlite:///./context_engine.db` | SQLAlchemy DB URL |
| `MAX_MESSAGES` | `200` | Max messages sent to LLM |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `APP_PORT` | `8000` | Uvicorn port |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Extension | Chrome MV3 (Manifest V3) | Modern extension standard, required by Chrome Web Store |
| Extension UI | Vanilla JS + CSS | No build step needed, ships directly to browser |
| Backend | FastAPI (Python) | Async, auto-docs, Pydantic v2 native |
| LLM Primary | Groq `llama-3.3-70b-versatile` | ~10x faster than GPT-4, generous free tier |
| LLM Fallback 1 | Anthropic Claude `sonnet-4-6` | High quality, good at structured JSON |
| LLM Fallback 2 | OpenAI `gpt-4o-mini` | Widely available fallback |
| Semantic Scoring | `sentence-transformers` `all-MiniLM-L6-v2` | 80 MB, CPU-friendly, fast inference |
| Similarity | `scikit-learn` cosine_similarity | Lightweight vs full PyTorch ops |
| ORM | SQLAlchemy 2.0 | Async-compatible, works with SQLite and PostgreSQL |
| DB (dev) | SQLite | Zero setup |
| DB (prod) | PostgreSQL | via `DATABASE_URL` env var |
| Validation | Pydantic v2 | Schema validation + serialisation |
