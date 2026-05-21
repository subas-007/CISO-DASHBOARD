"""
FAIR (Factor Analysis of Information Risk) Monte Carlo engine.

Uses PERT distributions (beta-PERT) for bounded three-point estimates,
which is standard in OpenFAIR methodology.
"""
import numpy as np
from numpy.random import default_rng
from app.models.fair import FAIRInput, FAIRResult, FAIRPercentiles


def _pert_sample(rng: np.random.Generator, low: float, mode: float, high: float, n: int, lam: float = 4.0) -> np.ndarray:
    """Draw n samples from a PERT distribution."""
    if high == low:
        return np.full(n, low)

    alpha = 1.0 + lam * (mode - low) / (high - low)
    beta = 1.0 + lam * (high - mode) / (high - low)
    raw = rng.beta(alpha, beta, n)
    return low + raw * (high - low)


def run_fair(scenario: FAIRInput) -> FAIRResult:
    n = scenario.simulations or 100_000
    rng = default_rng()

    # Contact Frequency — how often threat actor makes contact (TEF)
    tef = _pert_sample(rng, scenario.tef_min, scenario.tef_most_likely, scenario.tef_max, n)
    tef = np.maximum(tef, 0)

    # Vulnerability — probability threat succeeds given contact
    vuln = _pert_sample(rng, scenario.vuln_min, scenario.vuln_most_likely, scenario.vuln_max, n)
    vuln = np.clip(vuln, 0, 1)

    # Loss Event Frequency = TEF × Vulnerability
    lef = tef * vuln

    # Primary + Secondary Loss Magnitude
    plm = _pert_sample(rng, scenario.plm_min, scenario.plm_most_likely, scenario.plm_max, n)
    slm = _pert_sample(rng, scenario.slm_min, scenario.slm_most_likely, scenario.slm_max, n)
    plm = np.maximum(plm, 0)
    slm = np.maximum(slm, 0)

    # Total Loss per event
    loss_per_event = plm + slm

    # Annualised loss (per simulation trial: events/year × loss/event)
    annual_loss = lef * loss_per_event

    ale = float(np.mean(annual_loss))
    stddev = float(np.std(annual_loss))

    percentile_values = np.percentile(annual_loss, [10, 25, 50, 75, 90, 95, 99])

    # Build histogram with 20 buckets
    hist_counts, bin_edges = np.histogram(annual_loss, bins=20)
    total = float(np.sum(hist_counts))
    histogram = [
        {
            "bucket_min": float(bin_edges[i]),
            "bucket_max": float(bin_edges[i + 1]),
            "probability": float(hist_counts[i]) / total if total > 0 else 0.0,
        }
        for i in range(len(hist_counts))
    ]

    return FAIRResult(
        scenario_name=scenario.scenario_name,
        ale=ale,
        ale_stddev=stddev,
        min_loss=float(np.min(annual_loss)),
        max_loss=float(np.max(annual_loss)),
        percentiles=FAIRPercentiles(
            p10=float(percentile_values[0]),
            p25=float(percentile_values[1]),
            p50=float(percentile_values[2]),
            p75=float(percentile_values[3]),
            p90=float(percentile_values[4]),
            p95=float(percentile_values[5]),
            p99=float(percentile_values[6]),
        ),
        histogram=histogram,
        simulations=n,
    )
