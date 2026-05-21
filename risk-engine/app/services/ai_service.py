"""
AI service — Claude Sonnet 4.6 primary, Ollama (llama3.2) local fallback.
"""
import httpx
import anthropic
from app.config import get_settings
from app.models.fair import FAIRResult

settings = get_settings()

SYSTEM_PROMPT = """You are a CISO-level security risk advisor. You analyse FAIR (Factor Analysis of Information Risk)
Monte Carlo simulation results and produce concise, actionable executive summaries.

Output format — strictly return JSON:
{
  "headline": "<one sentence summary>",
  "risk_rating": "CRITICAL|HIGH|MEDIUM|LOW",
  "key_findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "recommended_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "insurance_note": "<one sentence on cyber insurance implications>",
  "confidence": "HIGH|MEDIUM|LOW"
}"""


def _build_user_message(result: FAIRResult, context: str = "") -> str:
    return f"""Analyse this FAIR Monte Carlo risk simulation result:

Scenario: {result.scenario_name}
ALE (Mean Annual Loss): ${result.ale:,.0f}
ALE Std Dev: ${result.ale_stddev:,.0f}
P10 (low tail): ${result.percentiles.p10:,.0f}
P50 (median): ${result.percentiles.p50:,.0f}
P90 (high tail): ${result.percentiles.p90:,.0f}
P99 (extreme tail): ${result.percentiles.p99:,.0f}
Simulations run: {result.simulations:,}

{f'Additional context: {context}' if context else ''}

Provide a board-ready risk analysis in the exact JSON format specified."""


async def analyse_with_claude(result: FAIRResult, context: str = "") -> dict:
    """Primary: Claude Sonnet 4.6."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_user_message(result, context)}],
    )
    import json
    text = message.content[0].text  # type: ignore[union-attr]
    # Strip markdown code fences if present
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


async def analyse_with_ollama(result: FAIRResult, context: str = "") -> dict:
    """Fallback: local Ollama."""
    prompt = f"{SYSTEM_PROMPT}\n\nUser: {_build_user_message(result, context)}\n\nAssistant:"
    async with httpx.AsyncClient(timeout=120) as client:
        res = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            },
        )
        res.raise_for_status()
        import json
        return json.loads(res.json()["response"])


async def get_risk_analysis(result: FAIRResult, context: str = "") -> dict:
    """Try Claude first, fall back to Ollama, then return a structured placeholder."""
    if settings.anthropic_api_key:
        try:
            return await analyse_with_claude(result, context)
        except Exception as e:
            print(f"⚠️  Claude API failed: {e} — trying Ollama")

    try:
        return await analyse_with_ollama(result, context)
    except Exception as e:
        print(f"⚠️  Ollama failed: {e} — returning placeholder analysis")

    # Structured fallback when no AI is available
    risk_rating = (
        "CRITICAL" if result.ale > 5_000_000
        else "HIGH" if result.ale > 1_000_000
        else "MEDIUM" if result.ale > 100_000
        else "LOW"
    )
    return {
        "headline": f"Annualised loss exposure of ${result.ale:,.0f} with P90 tail risk at ${result.percentiles.p90:,.0f}.",
        "risk_rating": risk_rating,
        "key_findings": [
            f"ALE is ${result.ale:,.0f} with high uncertainty (σ=${result.ale_stddev:,.0f})",
            f"P90 tail scenario reaches ${result.percentiles.p90:,.0f}",
            f"P99 extreme scenario reaches ${result.percentiles.p99:,.0f}",
        ],
        "recommended_actions": [
            "Review risk treatment options against cost of controls",
            "Validate cyber insurance coverage against P90 exposure",
            "Prioritise controls that reduce threat frequency and vulnerability",
        ],
        "insurance_note": f"P90 exposure of ${result.percentiles.p90:,.0f} should be compared against current policy limits.",
        "confidence": "LOW",
    }
