"""
Prepare dashboard data: Convert DGA pipeline outputs into optimized JSON files.

Reads dga_labeled.csv, recomputes health index (not in CSV), and generates
pre-aggregated JSON files for the React dashboard.
"""

import os
import sys
import json
import numpy as np
import pandas as pd

# Add project root to path so we can import existing pipeline code
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

from dga_config import (
    PROCESSED_DIR, MODELS_DIR, DGA_GASES, IEEE_THRESHOLDS, FAULT_TYPES,
)
from dga_pipeline.health_index_calculator import compute_composite_health_index

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")

GAS_COLS = ["H2", "CH4", "C2H6", "C2H4", "C2H2", "CO", "CO2"]
OIL_COLS = ["BDV", "MOISTURE", "RESISTIVITY", "TAN_DELTA", "ACIDITY"]
METHOD_COLS = [
    "method_duval_triangle", "method_duval_pentagon",
    "method_iec_ratio", "method_rogers", "method_key_gas",
]


def _risk_order(level):
    order = {"Critical": 0, "Poor": 1, "Fair": 2, "Good": 3, "Excellent": 4}
    return order.get(level, 5)


def _round(val, decimals=2):
    if isinstance(val, float) and not np.isnan(val):
        return round(val, decimals)
    return None if isinstance(val, float) and np.isnan(val) else val


def _safe_json(obj):
    """Convert numpy/pandas types for JSON serialization."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) else round(float(obj), 2)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()[:10]
    if pd.isna(obj):
        return None
    return obj


def load_and_prepare():
    """Load CSV and recompute health index."""
    csv_path = os.path.join(PROCESSED_DIR, "dga_labeled.csv")
    print(f"Loading {csv_path}...")
    df = pd.read_csv(csv_path)
    df["Sample dt"] = pd.to_datetime(df["Sample dt"], errors="coerce")
    print(f"  {len(df):,} rows x {df.shape[1]} columns")

    # Recompute health index with fault-aware enhancements
    # Pass df as labels_df since it already has fault_label and consensus_confidence
    health_df = compute_composite_health_index(df, labels_df=df)
    df["dgaf"] = health_df["dgaf"].values
    df["chi"] = health_df["chi"].values
    df["dgaf_rate_penalty"] = health_df["dgaf_rate_penalty"].values
    df["condition_override"] = health_df["condition_override"].values
    # Convert Categorical to plain strings to avoid 0-count category issues
    risk_series = health_df["risk_level"]
    df["risk_level"] = risk_series.astype(str).where(risk_series.notna(), other=None)

    # Map fault codes to names
    df["fault_name"] = df["fault_code"].map(FAULT_TYPES)

    # Parse voltage from Functional Location (SS-132KV-XXX -> 132)
    if "Voltage" in df.columns:
        df["voltage_class"] = pd.to_numeric(df["Voltage"], errors="coerce")
    elif "Functional Location" in df.columns:
        df["voltage_class"] = df["Functional Location"].str.extract(r"SS-(\d+)KV", expand=False).astype(float)

    return df


def build_fleet_summary(df):
    """Top-level KPIs."""
    # Use latest sample per transformer for current state
    latest_per_equip = df.sort_values("Sample dt").groupby("Equipment No").tail(1).set_index("Equipment No")

    risk_raw = latest_per_equip["risk_level"].value_counts().to_dict()
    risk_dist = {str(k): int(v) for k, v in risk_raw.items() if pd.notna(k) and k is not None and str(k) != 'None' and v > 0}

    fault_raw = latest_per_equip["fault_name"].value_counts().to_dict()
    fault_dist = {str(k): int(v) for k, v in fault_raw.items() if pd.notna(k) and k is not None and str(k) != 'None' and v > 0}

    return {
        "total_transformers": int(df["Equipment No"].nunique()),
        "total_samples": len(df),
        "total_substations": int(df["Functional Location"].nunique()) if "Functional Location" in df.columns else 0,
        "risk_distribution": risk_dist,
        "fault_distribution": fault_dist,
        "voltage_distribution": {str(k): int(v) for k, v in latest_per_equip["voltage_class"].dropna().astype(int).value_counts().to_dict().items()},
        "avg_chi": _round(latest_per_equip["chi"].mean()),
        "avg_age_years": _round(df.drop_duplicates("Equipment No")["age_years"].mean()),
        "date_range": {
            "min": df["Sample dt"].min().isoformat()[:10] if pd.notna(df["Sample dt"].min()) else None,
            "max": df["Sample dt"].max().isoformat()[:10] if pd.notna(df["Sample dt"].max()) else None,
        },
    }


def build_substations(df):
    """Per-substation aggregates."""
    if "Functional Location" not in df.columns:
        return []

    substations = []
    for fl, group in df.groupby("Functional Location"):
        latest_per_equip = group.sort_values("Sample dt").groupby("Equipment No").last()

        # Filter out 0-count and NaN entries from distributions
        risk_raw = latest_per_equip["risk_level"].value_counts().to_dict()
        risk_dist = {str(k): int(v) for k, v in risk_raw.items() if pd.notna(k) and k is not None and str(k) != 'None' and v > 0}

        fault_raw = latest_per_equip["fault_name"].value_counts().to_dict()
        fault_dist = {str(k): int(v) for k, v in fault_raw.items() if pd.notna(k) and k is not None and str(k) != 'None' and v > 0}

        # Worst risk = the most severe risk level that actually has transformers
        risk_levels_present = [r for r in risk_dist.keys() if r in ("Critical", "Poor", "Fair", "Good", "Excellent")]
        worst_risk = min(risk_levels_present, key=_risk_order) if risk_levels_present else "Good"

        desc = group["Description of functional location"].iloc[0] if "Description of functional location" in group.columns else str(fl)

        substations.append({
            "id": str(fl),
            "name": str(desc) if pd.notna(desc) else str(fl),
            "voltage_class": int(latest_per_equip["voltage_class"].iloc[0]) if "voltage_class" in latest_per_equip.columns and pd.notna(latest_per_equip["voltage_class"].iloc[0]) else None,
            "transformer_count": int(latest_per_equip.shape[0]),
            "risk_distribution": risk_dist,
            "fault_distribution": fault_dist,
            "worst_risk": worst_risk,
            "avg_chi": _round(latest_per_equip["chi"].mean()),
            "latest_sample_date": group["Sample dt"].max().isoformat()[:10] if pd.notna(group["Sample dt"].max()) else None,
        })

    substations.sort(key=lambda s: _risk_order(s["worst_risk"]))
    return substations


def _gas_ieee_status(gas, value):
    """Return IEEE C57.104-2019 status for a gas value."""
    if value is None or pd.isna(value):
        return None
    th = IEEE_THRESHOLDS.get(gas)
    if not th:
        return None
    s1, s2 = th
    if value <= s1:
        return {"status": 1, "label": "Normal", "threshold": s1}
    elif value <= s2:
        return {"status": 2, "label": "Caution", "threshold": s2}
    else:
        return {"status": 3, "label": "Warning", "threshold": s2}


def _build_risk_explanation(row):
    """Build human-readable explanation of WHY the transformer has its risk level."""
    reasons = []
    gas_alerts = []

    for gas in GAS_COLS:
        val = row.get(gas)
        if pd.isna(val):
            continue
        th = IEEE_THRESHOLDS.get(gas)
        if not th:
            continue
        s1, s2 = th
        if val > s2:
            gas_alerts.append({"gas": gas, "value": _round(val), "threshold": s2, "severity": "high",
                               "msg": f"{gas} = {val:.1f} ppm exceeds IEEE Status 2 limit ({s2} ppm)"})
        elif val > s1:
            gas_alerts.append({"gas": gas, "value": _round(val), "threshold": s1, "severity": "medium",
                               "msg": f"{gas} = {val:.1f} ppm exceeds IEEE Status 1 limit ({s1} ppm)"})

    # Oil quality issues
    oil_alerts = []
    OIL_THRESHOLDS = {"BDV": (60, 50, 40, "higher"), "MOISTURE": (10, 20, 30, "lower"),
                       "ACIDITY": (0.05, 0.10, 0.20, "lower"), "TAN_DELTA": (0.10, 0.50, 1.00, "lower")}
    for param, (good, fair, poor, direction) in OIL_THRESHOLDS.items():
        val = row.get(param)
        if pd.isna(val):
            continue
        if direction == "higher":
            if val < poor:
                oil_alerts.append({"param": param, "value": _round(val), "severity": "high",
                                   "msg": f"{param} = {val:.1f} is below critical threshold ({poor})"})
            elif val < fair:
                oil_alerts.append({"param": param, "value": _round(val), "severity": "medium",
                                   "msg": f"{param} = {val:.1f} is below fair threshold ({fair})"})
        else:
            if val > poor:
                oil_alerts.append({"param": param, "value": _round(val), "severity": "high",
                                   "msg": f"{param} = {val:.1f} exceeds critical threshold ({poor})"})
            elif val > fair:
                oil_alerts.append({"param": param, "value": _round(val), "severity": "medium",
                                   "msg": f"{param} = {val:.1f} exceeds caution threshold ({fair})"})

    # Condition Group override info (CIGRE TB 761)
    override_info = None
    if row.get("condition_override"):
        fault = row.get("fault_name") or row.get("fault_label", "Unknown")
        override_info = {
            "active": True,
            "fault_label": str(fault),
            "msg": f"Risk level capped due to {fault} fault diagnosis (CIGRE TB 761 Condition Group)",
        }

    return {"gas_alerts": gas_alerts, "oil_alerts": oil_alerts, "condition_override": override_info}


def _build_method_detail(row):
    """Build detailed method results with data availability info."""
    methods = []
    gas_avail = {g: not pd.isna(row.get(g)) for g in GAS_COLS}
    gases_present = [g for g, avail in gas_avail.items() if avail]

    METHOD_REQUIREMENTS = {
        "duval_triangle": {"gases": ["CH4", "C2H4", "C2H2"], "name": "Duval Triangle 1",
                           "ref": "IEC 60599:2022"},
        "duval_pentagon": {"gases": ["H2", "CH4", "C2H6", "C2H4", "C2H2"], "name": "Duval Pentagon",
                           "ref": "CIGRE TB 771"},
        "iec_ratio": {"gases": ["H2", "CH4", "C2H6", "C2H4", "C2H2"], "name": "IEC 60599 Ratios",
                      "ref": "IEC 60599:2022 Table 1"},
        "rogers": {"gases": ["H2", "CH4", "C2H6", "C2H4", "C2H2"], "name": "Rogers Ratios",
                   "ref": "IEEE C57.104-2019"},
        "key_gas": {"gases": ["H2", "CH4", "C2H4", "C2H2", "CO"], "name": "Key Gas Method",
                    "ref": "IEEE C57.104-2019"},
    }

    for key, info in METHOD_REQUIREMENTS.items():
        col = f"method_{key}"
        result = row.get(col)
        result_val = None if pd.isna(result) else str(result)
        missing_gases = [g for g in info["gases"] if not gas_avail.get(g, False)]
        has_data = len(missing_gases) == 0

        methods.append({
            "key": key,
            "name": info["name"],
            "ref": info["ref"],
            "result": result_val,
            "has_required_gases": has_data,
            "required_gases": info["gases"],
            "missing_gases": missing_gases,
        })

    return methods


def build_transformers(df):
    """Latest state per transformer — uses actual last row, not last non-null."""
    transformers = []
    # tail(1) gives the actual last row per group (not last non-null like .last())
    latest = df.sort_values("Sample dt").groupby("Equipment No").tail(1)

    for _, row in latest.iterrows():
        gases = {g: _round(row.get(g)) for g in GAS_COLS}
        oil = {o: _round(row.get(o)) for o in OIL_COLS}

        # Gas IEEE status for each gas
        gas_status = {}
        for g in GAS_COLS:
            val = row.get(g)
            if not pd.isna(val):
                gas_status[g] = _gas_ieee_status(g, val)

        transformers.append({
            "equipment_no": str(row["Equipment No"]),
            "substation_id": _safe_json(row.get("Functional Location")),
            "substation_name": _safe_json(row.get("Description of functional location")),
            "description": _safe_json(row.get("Equipment description")),
            "object_type": _safe_json(row.get("Object Type")),
            "make": _safe_json(row.get("MAKE")),
            "voltage_class": int(row["voltage_class"]) if pd.notna(row.get("voltage_class")) else None,
            "capacity_mva": _round(row.get("capacity_mva")),
            "yom": int(row["YOM"]) if pd.notna(row.get("YOM")) else None,
            "age_years": _round(row.get("age_years")),
            "latest_sample_date": row["Sample dt"].isoformat()[:10] if pd.notna(row["Sample dt"]) else None,
            "fault_label": str(row.get("fault_name", "Unknown")),
            "fault_code": int(row["fault_code"]) if pd.notna(row.get("fault_code")) else None,
            "confidence": _round(row.get("consensus_confidence")),
            "chi": _round(row.get("chi")),
            "dgaf": _round(row.get("dgaf")),
            "risk_level": str(row.get("risk_level")) if pd.notna(row.get("risk_level")) else None,
            "gases": gases,
            "gas_status": gas_status,
            "oil_quality": oil,
            "tdcg": _round(row.get("TDCG")),
            "condition_override": bool(row.get("condition_override", False)),
            "dgaf_rate_penalty": _round(row.get("dgaf_rate_penalty", 1.0)),
            "sample_count": int(df[df["Equipment No"] == row["Equipment No"]].shape[0]),
            "methods": _build_method_detail(row),
            "risk_explanation": _build_risk_explanation(row),
        })

    return transformers


def build_transformer_history(df):
    """All samples per transformer for time-series views."""
    history = {}
    for equip_no, group in df.groupby("Equipment No"):
        samples = []
        for _, row in group.sort_values("Sample dt").iterrows():
            samples.append({
                "date": row["Sample dt"].isoformat()[:10] if pd.notna(row["Sample dt"]) else None,
                "fault_label": str(row.get("fault_name", "Unknown")),
                "confidence": _round(row.get("consensus_confidence")),
                "chi": _round(row.get("chi")),
                "risk_level": str(row.get("risk_level")) if pd.notna(row.get("risk_level")) else None,
                "condition_override": bool(row.get("condition_override", False)),
                "gases": {g: _round(row.get(g)) for g in GAS_COLS},
                "tdcg": _round(row.get("TDCG")),
                "oil": {o: _round(row.get(o)) for o in OIL_COLS},
            })
        history[str(equip_no)] = samples

    return history


def build_model_metrics():
    """Merge all 3 model metrics."""
    metrics = {}
    for name, filename in [
        ("fault_classifier", "fault_classifier_metrics.json"),
        ("health_index", "health_index_metrics.json"),
        ("failure_predictor", "failure_predictor_metrics.json"),
    ]:
        path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(path):
            with open(path) as f:
                metrics[name] = json.load(f)

    return metrics


def build_filters(df):
    """Unique values for filter dropdowns."""
    filters = {
        "voltage_classes": sorted(df["voltage_class"].dropna().astype(int).unique().tolist()),
        "risk_levels": ["Excellent", "Good", "Fair", "Poor", "Critical"],
        "fault_types": [FAULT_TYPES[i] for i in sorted(FAULT_TYPES.keys())],
    }

    if "Object Type" in df.columns:
        filters["object_types"] = sorted(df["Object Type"].dropna().unique().tolist())
    if "MAKE" in df.columns:
        filters["makes"] = sorted(df["MAKE"].dropna().unique().tolist())
    if "Functional Location" in df.columns:
        filters["substations"] = sorted(df["Functional Location"].dropna().unique().tolist())

    return filters


def write_json(data, filename):
    """Write JSON with custom serialization."""
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w") as f:
        json.dump(data, f, default=_safe_json, separators=(",", ":"))
    size_kb = os.path.getsize(path) / 1024
    print(f"  Wrote {filename} ({size_kb:.1f} KB)")


def main():
    print("=" * 60)
    print("  Preparing Dashboard Data")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    df = load_and_prepare()

    print("\nGenerating JSON files...")
    write_json(build_fleet_summary(df), "fleet_summary.json")
    write_json(build_substations(df), "substations.json")
    write_json(build_transformers(df), "transformers.json")
    write_json(build_transformer_history(df), "transformer_history.json")
    write_json(build_model_metrics(), "model_metrics.json")
    write_json(build_filters(df), "filters.json")

    print(f"\nAll files written to {OUTPUT_DIR}")
    print("Done!")


if __name__ == "__main__":
    main()
