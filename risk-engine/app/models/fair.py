from pydantic import BaseModel, Field
from typing import Optional


class FAIRInput(BaseModel):
    """FAIR risk scenario definition."""
    scenario_name: str = Field(..., description="Human-readable name for this risk scenario")

    # Threat Event Frequency (TEF)
    tef_min: float = Field(..., ge=0, description="Min threat events per year")
    tef_most_likely: float = Field(..., ge=0)
    tef_max: float = Field(..., ge=0)

    # Vulnerability (probability threat succeeds given contact)
    vuln_min: float = Field(..., ge=0, le=1)
    vuln_most_likely: float = Field(..., ge=0, le=1)
    vuln_max: float = Field(..., ge=0, le=1)

    # Primary Loss Magnitude (USD)
    plm_min: float = Field(..., ge=0)
    plm_most_likely: float = Field(..., ge=0)
    plm_max: float = Field(..., ge=0)

    # Secondary Loss Magnitude (reputational, regulatory — optional)
    slm_min: float = Field(0, ge=0)
    slm_most_likely: float = Field(0, ge=0)
    slm_max: float = Field(0, ge=0)

    simulations: Optional[int] = Field(None, ge=1000, le=1_000_000)


class FAIRPercentiles(BaseModel):
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    p95: float
    p99: float


class FAIRResult(BaseModel):
    scenario_name: str
    ale: float             # Annualised Loss Expectancy (mean)
    ale_stddev: float
    min_loss: float
    max_loss: float
    percentiles: FAIRPercentiles
    histogram: list[dict]  # [{bucket_min, bucket_max, probability}]
    simulations: int


class RiskScenarioBatch(BaseModel):
    scenarios: list[FAIRInput]
