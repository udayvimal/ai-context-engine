import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# load_dotenv MUST run before any module that reads env vars is imported
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from db.database import init_db

    logger.info("Initialising database (create tables + run migrations)…")
    init_db()
    logger.info("Database ready.")

    yield

    # Shutdown
    logger.info("Shutting down AI Context Continuity Engine.")


app = FastAPI(
    title="AI Context Continuity Engine",
    description=(
        "Extract structured project intelligence (goal, progress, issues, "
        "decisions, next step) from ChatGPT and Claude conversation exports."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Import after load_dotenv() so LLMService reads keys at construction time
from api.routes import context as context_router  # noqa: E402
from api.routes import projects as projects_router  # noqa: E402

app.include_router(context_router.router, prefix="/api/v1")
app.include_router(projects_router.router, prefix="/api/v1")


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "AI Context Continuity Engine",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
