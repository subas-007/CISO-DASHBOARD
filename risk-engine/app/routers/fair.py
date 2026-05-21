from fastapi import APIRouter, HTTPException, Query
from app.models.fair import FAIRInput, FAIRResult, RiskScenarioBatch
from app.services.fair_engine import run_fair
from app.services.ai_service import get_risk_analysis
from pydantic import BaseModel

router = APIRouter(prefix="/api/risk", tags=["FAIR Risk Engine"])


class AnalyseRequest(BaseModel):
    scenario: FAIRInput
    context: str = ""
    include_ai: bool = True


class AnalyseResponse(BaseModel):
    simulation: FAIRResult
    analysis: dict | None


@router.post("/simulate", response_model=FAIRResult)
def simulate(scenario: FAIRInput) -> FAIRResult:
    """Run a single FAIR Monte Carlo simulation."""
    return run_fair(scenario)


@router.post("/simulate/batch", response_model=list[FAIRResult])
def simulate_batch(batch: RiskScenarioBatch) -> list[FAIRResult]:
    """Run multiple FAIR scenarios and return all results."""
    if len(batch.scenarios) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 scenarios per batch request")
    return [run_fair(s) for s in batch.scenarios]


@router.post("/analyse", response_model=AnalyseResponse)
async def analyse(req: AnalyseRequest) -> AnalyseResponse:
    """Simulate + get AI analysis in one call."""
    result = run_fair(req.scenario)
    ai_analysis = await get_risk_analysis(result, req.context) if req.include_ai else None
    return AnalyseResponse(simulation=result, analysis=ai_analysis)


@router.get("/presets", summary="Return common FAIR scenario presets")
def get_presets() -> list[dict]:
    """Pre-built FAIR scenario presets for common banking/fintech risks."""
    return [
        {
            "name": "Ransomware Attack on Core Banking",
            "scenario": FAIRInput(
                scenario_name="Ransomware Attack on Core Banking",
                tef_min=0.1, tef_most_likely=0.5, tef_max=2.0,
                vuln_min=0.05, vuln_most_likely=0.2, vuln_max=0.5,
                plm_min=500_000, plm_most_likely=2_000_000, plm_max=8_000_000,
                slm_min=100_000, slm_most_likely=500_000, slm_max=2_000_000,
            ).model_dump(),
        },
        {
            "name": "Third-Party SaaS Data Breach",
            "scenario": FAIRInput(
                scenario_name="Third-Party SaaS Data Breach",
                tef_min=0.05, tef_most_likely=0.2, tef_max=1.0,
                vuln_min=0.1, vuln_most_likely=0.35, vuln_max=0.7,
                plm_min=200_000, plm_most_likely=800_000, plm_max=3_000_000,
                slm_min=50_000, slm_most_likely=300_000, slm_max=1_500_000,
            ).model_dump(),
        },
        {
            "name": "API Credential Exposure",
            "scenario": FAIRInput(
                scenario_name="API Credential Exposure",
                tef_min=0.5, tef_most_likely=2.0, tef_max=6.0,
                vuln_min=0.02, vuln_most_likely=0.1, vuln_max=0.3,
                plm_min=50_000, plm_most_likely=200_000, plm_max=1_000_000,
                slm_min=10_000, slm_most_likely=100_000, slm_max=500_000,
            ).model_dump(),
        },
        {
            "name": "Insider Threat — Privileged Access Abuse",
            "scenario": FAIRInput(
                scenario_name="Insider Threat — Privileged Access Abuse",
                tef_min=0.1, tef_most_likely=0.5, tef_max=2.0,
                vuln_min=0.15, vuln_most_likely=0.4, vuln_max=0.75,
                plm_min=100_000, plm_most_likely=500_000, plm_max=2_000_000,
                slm_min=50_000, slm_most_likely=250_000, slm_max=1_000_000,
            ).model_dump(),
        },
        {
            "name": "DDoS on Payment Processing",
            "scenario": FAIRInput(
                scenario_name="DDoS on Payment Processing",
                tef_min=1.0, tef_most_likely=3.0, tef_max=8.0,
                vuln_min=0.05, vuln_most_likely=0.15, vuln_max=0.4,
                plm_min=100_000, plm_most_likely=400_000, plm_max=1_500_000,
                slm_min=25_000, slm_most_likely=150_000, slm_max=600_000,
            ).model_dump(),
        },
    ]
