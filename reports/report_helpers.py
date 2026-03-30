"""
Shared helpers for report generation — loads data and builds risk reason text.
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dashboard", "public", "data")
REPORTS_DIR = os.path.dirname(os.path.abspath(__file__))

# IEEE C57.104-2019 thresholds for reference text
IEEE_THRESHOLDS = {
    "H2": (100, 200), "CH4": (120, 400), "C2H6": (65, 100),
    "C2H4": (50, 200), "C2H2": (1, 9), "CO": (350, 570),
    "CO2": (2500, 4000), "TDCG": (720, 1920),
}
OIL_THRESHOLDS = {
    "BDV": {"good": 60, "fair": 50, "poor": 40, "unit": "kV", "direction": "higher"},
    "MOISTURE": {"good": 10, "fair": 20, "poor": 30, "unit": "ppm", "direction": "lower"},
    "ACIDITY": {"good": 0.05, "fair": 0.10, "poor": 0.20, "unit": "mgKOH/g", "direction": "lower"},
    "TAN_DELTA": {"good": 0.10, "fair": 0.50, "poor": 1.00, "unit": "", "direction": "lower"},
}


def load_data():
    """Load all dashboard JSON data."""
    def _load(name):
        with open(os.path.join(DATA_DIR, name)) as f:
            return json.load(f)
    return {
        "fleet": _load("fleet_summary.json"),
        "transformers": _load("transformers.json"),
        "substations": _load("substations.json"),
        "models": _load("model_metrics.json"),
    }


def build_risk_reason(t):
    """
    Build a human-readable 'Reason for Risk Rating' string from a transformer's data.
    Returns a concise explanation of WHY this transformer has its current health rating.
    """
    reasons = []

    # 0. Condition Group override (CIGRE TB 761)
    if t.get("condition_override"):
        fault = t.get("fault_label", "Unknown")
        reasons.append(f"Risk adjusted by {fault} fault diagnosis (CIGRE TB 761 Condition Group)")

    # 0b. Rate-of-change penalty (Paper 5)
    penalty = t.get("dgaf_rate_penalty")
    if penalty is not None and penalty < 1.0:
        pct = (1.0 - penalty) * 100
        reasons.append(f"DGAF reduced by {pct:.0f}% due to rapid gas rate changes (Paper 5)")

    # 1. Gas alerts from risk_explanation
    exp = t.get("risk_explanation", {})
    for alert in exp.get("gas_alerts", []):
        gas = alert.get("gas", "")
        val = alert.get("value", "")
        threshold = alert.get("threshold", "")
        severity = alert.get("severity", "")
        th_info = IEEE_THRESHOLDS.get(gas, (None, None))

        if severity == "high":
            reasons.append(f"{gas} = {val} ppm (IEEE Status 3: exceeds {th_info[1]} ppm limit)")
        else:
            reasons.append(f"{gas} = {val} ppm (IEEE Status 2: exceeds {th_info[0]} ppm limit)")

    # 2. Oil quality alerts
    for alert in exp.get("oil_alerts", []):
        param = alert.get("param", "")
        val = alert.get("value", "")
        severity = alert.get("severity", "")
        oil_info = OIL_THRESHOLDS.get(param, {})
        unit = oil_info.get("unit", "")
        direction = oil_info.get("direction", "lower")

        if param == "MOISTURE":
            reasons.append(f"Moisture = {val} ppm (limit: {oil_info.get('poor', 30)} ppm per IEC 60422)")
        elif param == "BDV":
            reasons.append(f"BDV = {val} kV (minimum: {oil_info.get('poor', 40)} kV per IEC 60422)")
        elif param == "ACIDITY":
            reasons.append(f"Acidity = {val} mgKOH/g (limit: {oil_info.get('poor', 0.20)} per IEC 60422)")
        elif param == "TAN_DELTA":
            reasons.append(f"Tan Delta = {val} (limit: {oil_info.get('poor', 1.0)} per IEC 60422)")
        else:
            reasons.append(alert.get("msg", f"{param} = {val}"))

    # 3. Remaining insulation life (furan / DP)
    dp = t.get("dp_estimated")
    rul = t.get("remaining_life_pct")
    ins_cond = t.get("insulation_condition")
    if dp is not None and rul is not None and ins_cond not in (None, "Excellent", "Good"):
        reasons.append(f"Insulation DP ≈ {int(dp)} ({ins_cond} — {rul:.0f}% remaining life, Chendong/CIGRE WG A2.18)")

    # 4. If no alerts but still not Excellent, note the contributing factors
    if not reasons:
        chi = t.get("chi")
        risk = t.get("risk_level", "")
        if risk == "Excellent":
            return "All parameters within normal limits"
        elif risk == "Good":
            return "Minor parameter deviations; within acceptable range"
        else:
            # Check for missing data contributing to lower score
            gases = t.get("gases", {})
            oil = t.get("oil_quality", {})
            missing_gas = sum(1 for g in ["H2", "CH4", "C2H6", "C2H4", "C2H2", "CO", "CO2"] if gases.get(g) is None)
            missing_oil = sum(1 for o in ["BDV", "MOISTURE", "ACIDITY", "TAN_DELTA"] if oil.get(o) is None)
            parts = []
            if missing_gas > 3:
                parts.append(f"{missing_gas}/7 gas values missing")
            if missing_oil > 2:
                parts.append(f"{missing_oil}/4 oil quality values missing")
            if parts:
                return "Incomplete test data: " + "; ".join(parts)
            return "Marginal values across multiple parameters"

    return "; ".join(reasons)


def build_short_reason(t):
    """Shorter version for table columns (max ~60 chars)."""
    full = build_risk_reason(t)
    if len(full) <= 80:
        return full
    # Take first reason only
    parts = full.split(";")
    first = parts[0].strip()
    if len(parts) > 1:
        return first + f" (+{len(parts)-1} more)"
    return first[:77] + "..."
