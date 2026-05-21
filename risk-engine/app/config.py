from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    risk_engine_port: int = 5001
    node_backend_url: str = "http://localhost:4000"
    node_backend_secret: str = "internal_secret_for_service_to_service"

    anthropic_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    fair_simulations: int = 100_000

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
