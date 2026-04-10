import os
import anthropic
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# Claude — Model A (user picks)
anthropic_client = anthropic.AsyncAnthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
)

# Groq Llama — Model B (user picks) FREE!
groq_client = AsyncOpenAI(
    api_key=os.environ.get("GROQ_API_KEY", ""),
    base_url="https://api.groq.com/openai/v1",
)

# GPT-4o — Secret Judge (hidden from user)
openai_client = AsyncOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY", ""),
)

# Model names
CLAUDE_SONNET = "claude-sonnet-4-6"
CLAUDE_HAIKU = "claude-haiku-4-5-20251001"
LLAMA_LARGE = "llama-3.3-70b-versatile"
LLAMA_SMALL = "llama-3.1-8b-instant"
GPT4O = "gpt-4o"

# Secret judge
JUDGE_MODEL = GPT4O
JUDGE_CLIENT = openai_client

# Cost per 1K tokens
MODEL_COSTS = {
    CLAUDE_SONNET: 0.003,
    CLAUDE_HAIKU: 0.0008,
    LLAMA_LARGE: 0.0,
    LLAMA_SMALL: 0.0,
    GPT4O: 0.005,
}