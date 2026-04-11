import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# ── Single unified client via OpenRouter ─────────────────────────
client = AsyncOpenAI(
    api_key=os.environ.get("OPENROUTER_API_KEY", ""),
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": os.environ.get("APP_URL", "http://localhost:5173"),
        "X-Title": "LUNA Trust Engine",
    },
)

# ── Model catalog ────────────────────────────────────────────────
# All models accessible through OpenRouter's unified API.
# IDs use OpenRouter's provider/model format.

MODELS = {
    # Anthropic
    "anthropic/claude-sonnet-4.6": {"name": "Claude Sonnet 4.6", "provider": "Anthropic", "cost_per_1k": 0.003},
    "anthropic/claude-sonnet-4": {"name": "Claude Sonnet 4", "provider": "Anthropic", "cost_per_1k": 0.003},
    "anthropic/claude-haiku-4.5": {"name": "Claude Haiku 4.5", "provider": "Anthropic", "cost_per_1k": 0.001},
    # OpenAI
    "openai/gpt-4o": {"name": "GPT-4o", "provider": "OpenAI", "cost_per_1k": 0.005},
    "openai/gpt-4o-mini": {"name": "GPT-4o Mini", "provider": "OpenAI", "cost_per_1k": 0.0003},
    # Meta (free on OpenRouter)
    "meta-llama/llama-3.3-70b-instruct": {"name": "Llama 3.3 70B", "provider": "Meta", "cost_per_1k": 0.0},
    "meta-llama/llama-3.1-8b-instruct:free": {"name": "Llama 3.1 8B", "provider": "Meta", "cost_per_1k": 0.0},
    # Google
    "google/gemini-2.0-flash-001": {"name": "Gemini 2.0 Flash", "provider": "Google", "cost_per_1k": 0.0001},
}

# ── Defaults ─────────────────────────────────────────────────────
DEFAULT_GENERATOR = "anthropic/claude-sonnet-4.6"
DEFAULT_JUDGE = "openai/gpt-4o"

def get_cost_per_1k(model_id: str) -> float:
    return MODELS.get(model_id, {}).get("cost_per_1k", 0.003)
