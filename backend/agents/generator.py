from typing import Optional
from config import (
    anthropic_client, groq_client,
    CLAUDE_SONNET, LLAMA_LARGE, MODEL_COSTS
)

SYSTEM_PROMPT = """You are a knowledgeable assistant. Respond with a comprehensive, factual answer.

Rules:
- Include concrete facts, numbers, named examples where relevant
- Make clear factual statements that can be verified
- Use bullet points or numbered lists for structure
- Aim for 150-300 words
- State facts directly, no hedging"""

CORRECTION_PROMPT = """You are performing a correction pass on your previous response.
Rewrite correcting ONLY the identified issues.
Keep accurate content unchanged. Do not lengthen the response."""


async def generate_response(
    prompt: str,
    model_name: str = CLAUDE_SONNET,
    correction_signal: Optional[str] = None,
    original_output: Optional[str] = None,
) -> tuple:
    """Returns (text, cost, reasoning)"""

    if correction_signal and original_output:
        user_content = (
            f"Original prompt: {prompt}\n\n"
            f"Previous response:\n{original_output}\n\n"
            f"Correction signal:\n{correction_signal}\n\n"
            f"Corrected response:"
        )
        system = CORRECTION_PROMPT
    else:
        user_content = prompt
        system = SYSTEM_PROMPT

    reasoning = f"Generating with {model_name}."

    # Claude — Anthropic SDK
    if "claude" in model_name.lower():
        response = await anthropic_client.messages.create(
            model=model_name,
            max_tokens=600,
            system=system,
            messages=[
                {"role": "user", "content": user_content}
            ],
        )
        text = response.content[0].text if response.content else ""
        tokens = response.usage.input_tokens + response.usage.output_tokens
        cost = (tokens / 1000) * MODEL_COSTS.get(model_name, 0.003)

    # Groq Llama — OpenAI compatible SDK (no errors!)
    else:
        response = await groq_client.chat.completions.create(
            model=LLAMA_LARGE,
            max_tokens=600,
            temperature=0.3,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
        )
        text = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if response.usage else 500
        cost = 0.0

    reasoning += f" Generated {len(text.split())} words."
    return text, cost, reasoning