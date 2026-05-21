from fastapi import APIRouter
from datetime import datetime, timezone
from app.config import get_settings

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ciso-risk-engine",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_provider": "claude" if settings.anthropic_api_key else "ollama_fallback",
        "fair_simulations_default": settings.fair_simulations,
    }
