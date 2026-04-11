import time
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

from models import RunRequest, RunResult
from orchestrator import run_pipeline

app = FastAPI(title="LUNA Trust Engine", version="0.6.0")

# ── CORS — allows frontend to talk to backend ───────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ────────────────────────────────────────────────────
@app.get("/health")
async def health():
    from config import MODELS
    return {
        "status": "ok",
        "version": "0.6.0",
        "provider": "openrouter",
        "models": list(MODELS.keys()),
    }

# ── Main run endpoint ───────────────────────────────────────────────
@app.post("/run", response_model=RunResult)
async def run(request: RunRequest):
    start = time.time()
    try:
        result = await run_pipeline(
            prompt=request.prompt,
            model_a=request.model_a,
            model_b=request.model_b,
            judge_model=request.judge_model,
            web_search=request.web_search,
        )
        result.latency = int((time.time() - start) * 1000)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))