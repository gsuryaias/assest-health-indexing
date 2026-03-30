"""
Composite Health Index Calculator for Power Transformers.

Computes a 0-100 health index combining DGA gas analysis with oil quality
parameters using a weighted scoring approach.

Methodology:
  Step 1: DGAF (DGA Factor) — weighted gas condition scoring
  Step 2: Modified DGAF with rate-of-change penalty [Paper 5]
  Step 3: Oil quality sub-indices (BDV, moisture, acidity, tan delta)
  Step 4: Composite Health Index = weighted combination
  Step 5: Risk level classification
  Step 6: Condition Group override — fault severity ceiling [CIGRE TB 761]

References:
  [4] "Review of Transformer Health Index from the Perspective of
       Survivability and Condition Assessment" - MDPI Electronics, 2023
       → Defines DGAF weights and composite approach

  [5] "Modified Dissolved Gas Analysis Scoring Approach for Transformer
       Health Evaluation Considering Delta and Rate Values"
       MDPI Energies, 2024
       → Rate-of-change penalty improves early fault detection by 3 weeks

  [S1] IEEE C57.104-2019, Tables 1-2 for gas thresholds, Table 4 for rates
  [S4] CIGRE Technical Brochure 761 (2019) — two-component condition model
"""

import os
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dga_config import (
    DGA_GASES, IEEE_THRESHOLDS, IEEE_RATE_THRESHOLDS,
    DGAF_WEIGHTS, CHI_WEIGHTS, OIL_QUALITY_THRESHOLDS, RISK_LEVELS,
    FAULT_SEVERITY_CAP, CONDITION_CONFIDENCE_THRESHOLD, RATE_PENALTY_FACTOR,
    FURAN_CHENDONG_A, FURAN_CHENDONG_B, FURAN_DP_NEW, FURAN_DP_EOL,
    FURAN_DP_THRESHOLDS,
)

# Risk level ordering (lower = more severe)
_RISK_ORDER = {"Critical": 0, "Poor": 1, "Fair": 2, "Good": 3, "Excellent": 4}

# Precompute IEEE rate thresholds in ppm/day (source is ppm/year)
_RATE_THRESHOLDS_PER_DAY = {gas: rate / 365.25 for gas, rate in IEEE_RATE_THRESHOLDS.items()}


def _gas_condition_score(value, gas):
    """
    Score a gas concentration on a 4-point scale per IEEE C57.104-2019.

    Reference: [S1] IEEE C57.104-2019, Tables 1-2
      4 = Good (below 90th percentile / Status 1)
      3 = Fair (between 90th and 95th percentile / Status 2)
      2 = Poor (above 95th percentile / Status 3)
      1 = Critical (more than 2× Status 3 threshold)

    Returns:
        int: 1-4 score, or NaN if value is missing
    """
    if pd.isna(value):
        return np.nan

    thresholds = IEEE_THRESHOLDS.get(gas)
    if not thresholds:
        return np.nan

    s1_max, s2_max = thresholds
    critical = s2_max * 2  # 2× the Status 3 boundary

    if value <= s1_max:
        return 4  # Good
    elif value <= s2_max:
        return 3  # Fair
    elif value <= critical:
        return 2  # Poor
    else:
        return 1  # Critical


def compute_dgaf(row):
    """
    Compute DGA Factor (DGAF) for a single sample.

    Reference: [4] MDPI Electronics, 2023
    DGAF = Σ(weight_i × score_i) / Σ(weight_i) for available gases
    Normalized to 0-10 scale (10 = healthy).

    Args:
        row: Series or dict with gas concentration values

    Returns:
        float: DGAF score (0-10), NaN if no gas data
    """
    weighted_sum = 0.0
    total_weight = 0.0

    for gas in DGA_GASES:
        value = row.get(gas, np.nan)
        if pd.isna(value):
            continue
        score = _gas_condition_score(value, gas)
        if pd.isna(score):
            continue
        weight = DGAF_WEIGHTS[gas]
        weighted_sum += weight * score
        total_weight += weight

    if total_weight == 0:
        return np.nan

    # Normalize: max possible = 4 * total_weight, we scale to 0-10
    return (weighted_sum / total_weight) * 2.5  # 4*2.5 = 10


def _compute_rate_penalty(current_row, prev_row, days_between):
    """
    Compute rate-of-change penalty for DGAF.

    Reference: [5] MDPI Energies, 2024 — Modified DGAF with rate values
    Reference: [S1] IEEE C57.104-2019, Table 4 — rate thresholds (ppm/year)

    For each gas, if the absolute rate of change exceeds the IEEE threshold,
    the gas is counted as "exceeding". The DGAF penalty is:
        penalty = max(0.65, 1.0 - RATE_PENALTY_FACTOR × n_exceeding)

    Args:
        current_row: Current sample (dict-like with gas values)
        prev_row: Previous sample for the same transformer
        days_between: Days between the two samples

    Returns:
        float: Multiplicative penalty factor (0.65 to 1.0)
    """
    if days_between <= 0:
        return 1.0

    n_exceeding = 0
    for gas in DGA_GASES:
        curr_val = current_row.get(gas, np.nan)
        prev_val = prev_row.get(gas, np.nan)
        if pd.isna(curr_val) or pd.isna(prev_val):
            continue

        rate_ppm_day = abs(curr_val - prev_val) / days_between
        threshold = _RATE_THRESHOLDS_PER_DAY.get(gas)
        if threshold and rate_ppm_day > threshold:
            n_exceeding += 1

    return max(0.65, 1.0 - RATE_PENALTY_FACTOR * n_exceeding)


def _apply_condition_group(fault_label, confidence, chi_risk_level):
    """
    Apply CIGRE TB 761 Condition Group override.

    The two-component model uses:
      1. Overall Health Index (CHI-based risk level)
      2. Condition Group (worst-case fault severity ceiling)

    The final risk level is the more severe of the two.

    Reference: [S4] CIGRE TB 761 (2019) — two-component condition assessment
    Reference: [S2] IEC 60599:2022 — fault severity hierarchy

    Args:
        fault_label: Diagnosed fault type (str, e.g., "T3", "Normal")
        confidence: Consensus confidence (0-1)
        chi_risk_level: Risk level from CHI calculation

    Returns:
        tuple: (adjusted_risk_level, condition_override_bool)
    """
    if pd.isna(confidence) or confidence < CONDITION_CONFIDENCE_THRESHOLD:
        return chi_risk_level, False

    if pd.isna(fault_label) or fault_label not in FAULT_SEVERITY_CAP:
        return chi_risk_level, False

    fault_cap = FAULT_SEVERITY_CAP[fault_label]
    chi_order = _RISK_ORDER.get(chi_risk_level, 4)
    cap_order = _RISK_ORDER.get(fault_cap, 4)

    if cap_order < chi_order:
        # Fault-based cap is more severe → override
        return fault_cap, True

    return chi_risk_level, False


def _oil_quality_score(value, param):
    """
    Score an oil quality parameter on a 4-point scale.

    Reference: IEC 60422:2013, IEEE C57.106
      4 = Good, 3 = Fair, 2 = Poor, 1 = Critical
    """
    if pd.isna(value):
        return np.nan

    thresholds = OIL_QUALITY_THRESHOLDS.get(param)
    if not thresholds:
        return np.nan

    good, fair, poor = thresholds

    if param == "BDV":
        # BDV: higher is better
        if value >= good:
            return 4
        elif value >= fair:
            return 3
        elif value >= poor:
            return 2
        else:
            return 1
    else:
        # Moisture, acidity, tan delta: lower is better
        if value <= good:
            return 4
        elif value <= fair:
            return 3
        elif value <= poor:
            return 2
        else:
            return 1


def compute_composite_health_index(df, labels_df=None):
    """
    Compute Composite Health Index (CHI) for all samples.

    Reference: [4] MDPI Electronics, 2023
    CHI = 0.50×DGAF + 0.15×BDV + 0.15×MOISTURE + 0.10×ACIDITY + 0.10×TAN_DELTA
    All sub-indices normalized to 0-100 scale.

    Enhancements:
      - [5] Rate-of-change penalty on DGAF (MDPI Energies, 2024)
      - [S4] CIGRE TB 761 Condition Group override (fault severity ceiling)

    Args:
        df: Wide-format DataFrame with gas and oil quality columns.
            Must have 'Equipment No' and 'Sample dt' for rate penalty.
        labels_df: DataFrame with 'fault_label' and 'consensus_confidence'
            columns (optional). When provided, enables Condition Group override.

    Returns:
        DataFrame with health index columns including:
          dgaf, dgaf_normalized, dgaf_rate_penalty, chi, risk_level,
          condition_override, bdv_score, moisture_score, acidity_score,
          tan_delta_score
    """
    print("Computing Composite Health Index...")

    result = pd.DataFrame(index=df.index)

    # Step 1: DGAF (base score, before rate penalty)
    result["dgaf"] = df.apply(compute_dgaf, axis=1)

    # Step 2: Rate-of-change penalty on DGAF [Paper 5]
    has_time_info = "Equipment No" in df.columns and "Sample dt" in df.columns
    if has_time_info:
        print("  Applying rate-of-change penalty [Paper 5]...")
        penalties = np.ones(len(df))
        df_sorted = df.sort_values(["Equipment No", "Sample dt"]).reset_index(drop=True)

        prev_equip = None
        prev_row = None
        prev_date = None

        for idx in range(len(df_sorted)):
            row = df_sorted.iloc[idx]
            equip = row["Equipment No"]
            sample_date = row["Sample dt"]

            if equip == prev_equip and prev_row is not None and pd.notna(sample_date) and pd.notna(prev_date):
                days = (sample_date - prev_date).total_seconds() / 86400
                if days > 0:
                    orig_idx = df_sorted.index[idx]
                    penalties[orig_idx] = _compute_rate_penalty(row, prev_row, days)

            prev_equip = equip
            prev_row = row
            prev_date = sample_date

        # Map penalties back to original df index order
        result["dgaf_rate_penalty"] = penalties
        result["dgaf"] = result["dgaf"] * result["dgaf_rate_penalty"]

        n_penalized = (penalties < 1.0).sum()
        mean_penalty = penalties[penalties < 1.0].mean() if n_penalized > 0 else 1.0
        print(f"  Rate penalty applied to {n_penalized:,} samples "
              f"(mean penalty: {mean_penalty:.3f})")
    else:
        result["dgaf_rate_penalty"] = 1.0

    result["dgaf_normalized"] = result["dgaf"] / 10 * 100  # Scale to 0-100

    # Step 3: Oil quality sub-indices (each 0-100)
    for param in ["BDV", "MOISTURE", "ACIDITY", "TAN_DELTA"]:
        if param in df.columns:
            scores = df[param].apply(lambda v: _oil_quality_score(v, param))
            result[f"{param.lower()}_score"] = scores / 4 * 100  # Scale to 0-100
        else:
            result[f"{param.lower()}_score"] = np.nan

    # Step 4: Composite Health Index (weighted combination)
    chi = np.zeros(len(df))
    total_weight = 0.0

    component_map = {
        "DGAF": "dgaf_normalized",
        "BDV": "bdv_score",
        "MOISTURE": "moisture_score",
        "ACIDITY": "acidity_score",
        "TAN_DELTA": "tan_delta_score",
    }

    for component, col in component_map.items():
        weight = CHI_WEIGHTS[component]
        if col in result.columns:
            valid = result[col].notna()
            chi = np.where(valid, chi + weight * result[col].fillna(0), chi)
            total_weight_per_row = np.where(valid, total_weight + weight, total_weight)
            total_weight = total_weight_per_row
        # If component missing, redistribute weight proportionally

    # Normalize by actual weight used (handles missing oil quality data)
    result["chi"] = np.where(total_weight > 0, chi / total_weight, np.nan)

    # Step 5: Risk levels (from CHI score)
    result["risk_level"] = pd.cut(
        result["chi"],
        bins=[0, 20, 40, 60, 80, 100],
        labels=["Critical", "Poor", "Fair", "Good", "Excellent"],
        include_lowest=True,
    )

    # Step 6: Condition Group override [CIGRE TB 761]
    has_labels = (labels_df is not None
                  and "fault_label" in labels_df.columns
                  and "consensus_confidence" in labels_df.columns)

    if has_labels:
        print("  Applying Condition Group override [CIGRE TB 761]...")
        adjusted_levels = []
        overrides = []

        for idx in result.index:
            chi_risk = str(result.loc[idx, "risk_level"])
            fault = labels_df.loc[idx, "fault_label"] if idx in labels_df.index else np.nan
            conf = labels_df.loc[idx, "consensus_confidence"] if idx in labels_df.index else np.nan

            adj_level, was_overridden = _apply_condition_group(fault, conf, chi_risk)
            adjusted_levels.append(adj_level)
            overrides.append(was_overridden)

        result["risk_level"] = pd.Categorical(
            adjusted_levels,
            categories=["Critical", "Poor", "Fair", "Good", "Excellent"],
            ordered=True,
        )
        result["condition_override"] = overrides

        n_overridden = sum(overrides)
        print(f"  Condition Group overrode {n_overridden:,} samples")
    else:
        result["condition_override"] = False

    # Summary
    print(f"\n--- Health Index Distribution ---")
    print(f"  Mean CHI: {result['chi'].mean():.1f}")
    print(f"  Median CHI: {result['chi'].median():.1f}")
    risk_dist = result["risk_level"].value_counts()
    for level in ["Excellent", "Good", "Fair", "Poor", "Critical"]:
        count = risk_dist.get(level, 0)
        pct = count / len(result) * 100
        print(f"  {level:10s}: {count:6,} ({pct:.1f}%)")

    if has_labels:
        n_overridden = result["condition_override"].sum()
        print(f"\n  Condition Group overrides: {n_overridden:,} samples")

    return result


def compute_furan_rul(df):
    """
    Estimate remaining insulation life (RUL) from furan (2-FAL) oil analysis.

    Uses the Chendong equation — the industry standard for 2-FAL/DP correlation,
    validated over 30+ years and referenced by IEEE C57.91-2011 §8.2 and CIGRE.

    Reference: Chendong (1996) "Estimating the Age of Power Transformers by
               Furan Concentration in Oil" — IEEE/CIGRE most widely used equation
    Reference: CIGRE WG A2.18 (2017) — end-of-life criteria: DP ≤ 200
    Reference: IEC 60450:2004 — DP measurement methodology
    Reference: IEEE C57.91-2011 §8.2 — furan analysis for thermal aging

    Equation:
        log10(2FAL_ppb) = 1.51 - 0.0035 × DP        (Chendong 1996)
        DP = (1.51 - log10(2FAL_ppb)) / 0.0035       (inverted)
        remaining_life_% = (DP_current - DP_EOL) / (DP_new - DP_EOL) × 100

    DP condition thresholds (CIGRE WG A2.18, Table 1):
        ≥ 800: Excellent — new-like insulation, no concern
        600–800: Good — moderate aging, normal monitoring
        400–600: Fair — significant aging, increase test frequency
        300–400: Poor — advanced aging, plan refurbishment
        < 300: Critical — near end-of-life, urgent action

    Args:
        df: DataFrame with 'FURAN_2FAL' column (ppb). Rows where FURAN_2FAL
            is missing, zero, or negative will produce NaN outputs.

    Returns:
        DataFrame indexed same as df, with columns:
            dp_estimated: Estimated DP from Chendong equation (NaN if no 2-FAL)
            remaining_life_pct: Remaining insulation life (0–100%), clamped
            insulation_life_used_pct: Life consumed = 100 - remaining_life_pct
            insulation_condition: Condition label (Excellent/Good/Fair/Poor/Critical)
    """
    FURAN_COL = "FURAN_2FAL"
    result = pd.DataFrame(index=df.index)

    if FURAN_COL not in df.columns:
        print(f"  compute_furan_rul: '{FURAN_COL}' column not found — skipping")
        result["dp_estimated"] = np.nan
        result["remaining_life_pct"] = np.nan
        result["insulation_life_used_pct"] = np.nan
        result["insulation_condition"] = np.nan
        return result

    two_fal = pd.to_numeric(df[FURAN_COL], errors="coerce")
    valid = two_fal > 0  # log10 requires strictly positive

    # Chendong equation: DP = (A - log10(2FAL)) / B
    dp = np.where(
        valid,
        (FURAN_CHENDONG_A - np.log10(two_fal.where(valid, 1.0))) / FURAN_CHENDONG_B,
        np.nan,
    )
    result["dp_estimated"] = np.round(dp, 0)

    # Remaining life %: clamp to [0, 100]
    rul_raw = (dp - FURAN_DP_EOL) / (FURAN_DP_NEW - FURAN_DP_EOL) * 100
    result["remaining_life_pct"] = np.clip(np.where(valid, rul_raw, np.nan), 0.0, 100.0).round(1)
    result["insulation_life_used_pct"] = (100.0 - result["remaining_life_pct"]).round(1)

    # Insulation condition label (CIGRE WG A2.18)
    def _dp_condition(dp_val):
        if pd.isna(dp_val):
            return np.nan
        if dp_val >= FURAN_DP_THRESHOLDS["Excellent"]:
            return "Excellent"
        elif dp_val >= FURAN_DP_THRESHOLDS["Good"]:
            return "Good"
        elif dp_val >= FURAN_DP_THRESHOLDS["Fair"]:
            return "Fair"
        elif dp_val >= FURAN_DP_THRESHOLDS["Poor"]:
            return "Poor"
        else:
            return "Critical"

    result["insulation_condition"] = pd.array(
        [_dp_condition(v) for v in result["dp_estimated"]], dtype=object
    )

    # Summary
    n_valid = int(valid.sum())
    print(f"\n--- Furan RUL (Chendong equation) ---")
    print(f"  Transformers with 2-FAL data: {n_valid:,} / {len(df):,} samples")
    if n_valid > 0:
        dp_series = result["dp_estimated"].dropna()
        rul_series = result["remaining_life_pct"].dropna()
        print(f"  DP range: {dp_series.min():.0f} – {dp_series.max():.0f}")
        print(f"  Mean DP: {dp_series.mean():.0f}  |  Median: {dp_series.median():.0f}")
        print(f"  Mean remaining life: {rul_series.mean():.1f}%")
        cond_dist = result["insulation_condition"].value_counts()
        for label in ["Excellent", "Good", "Fair", "Poor", "Critical"]:
            n = cond_dist.get(label, 0)
            if n > 0:
                print(f"  {label:10s}: {n:4d} samples")

    return result
