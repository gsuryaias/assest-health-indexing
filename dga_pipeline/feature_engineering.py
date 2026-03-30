"""
Feature Engineering for DGA Models.

Computes ~55+ features across 7 groups for transformer fault diagnosis
and health assessment.

Feature Groups:
  A. Raw gas concentrations (7)
  B. Gas ratios and TDCG (12)
  C. Gas percentages (7)
  D. Traditional method outputs as ordinal features (10) [Paper 1]
  E. IEEE C57.104-2019 status levels (8)  [S1]
  F. Log transforms (7)  [Paper 2]
  G. Oil quality parameters (4)

References:
  [1] "ML-based multi-method interpretation for DGA" - PMC, 2024
  [2] "Fault Classification via DGA and ML: Systematic Review" - MDPI, 2025
  [S1] IEEE C57.104-2019
"""

import os
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dga_config import DGA_GASES, IEEE_THRESHOLDS, FAULT_TYPE_NAMES


def _safe_ratio(numerator, denominator, default=0.0):
    """Compute ratio safely, returning default if denominator is 0 or NaN."""
    if pd.isna(numerator) or pd.isna(denominator) or denominator == 0:
        return default
    return numerator / denominator


def compute_gas_ratios(df):
    """
    Group B: Gas ratios used by IEC 60599 and Rogers methods.

    Reference: [S2] IEC 60599:2022, Table 1
    """
    features = pd.DataFrame(index=df.index)

    # IEC 60599 ratios
    features["ratio_C2H2_C2H4"] = df.apply(
        lambda r: _safe_ratio(r.get("C2H2"), r.get("C2H4")), axis=1)
    features["ratio_CH4_H2"] = df.apply(
        lambda r: _safe_ratio(r.get("CH4"), r.get("H2")), axis=1)
    features["ratio_C2H4_C2H6"] = df.apply(
        lambda r: _safe_ratio(r.get("C2H4"), r.get("C2H6")), axis=1)

    # CO2/CO ratio (cellulose degradation indicator)
    # Normal: 3-10, abnormal if <3 or >10 [IEEE C57.104-2019]
    features["ratio_CO2_CO"] = df.apply(
        lambda r: _safe_ratio(r.get("CO2"), r.get("CO")), axis=1)

    # C2H2 as fraction of total combustible (arcing severity)
    combustible_cols = [g for g in ["H2", "CH4", "C2H6", "C2H4", "C2H2", "CO"] if g in df.columns]
    if combustible_cols:
        tdcg = df[combustible_cols].sum(axis=1, min_count=1)
        features["ratio_C2H2_TDCG"] = df.apply(
            lambda r: _safe_ratio(r.get("C2H2"), tdcg.get(r.name, 0)), axis=1)
        features["TDCG"] = tdcg

    # Additional diagnostic ratios
    features["ratio_C2H6_CH4"] = df.apply(
        lambda r: _safe_ratio(r.get("C2H6"), r.get("CH4")), axis=1)
    features["ratio_H2_CH4"] = df.apply(
        lambda r: _safe_ratio(r.get("H2"), r.get("CH4")), axis=1)
    features["ratio_C2H2_H2"] = df.apply(
        lambda r: _safe_ratio(r.get("C2H2"), r.get("H2")), axis=1)
    features["ratio_C2H4_H2"] = df.apply(
        lambda r: _safe_ratio(r.get("C2H4"), r.get("H2")), axis=1)

    return features


def compute_gas_percentages(df):
    """
    Group C: Each gas as percentage of TDCG.

    Used internally by Duval Triangle for zone determination.
    Reference: IEC 60599:2022 Annex A
    """
    features = pd.DataFrame(index=df.index)

    combustible_cols = [g for g in ["H2", "CH4", "C2H6", "C2H4", "C2H2", "CO"] if g in df.columns]
    tdcg = df[combustible_cols].sum(axis=1, min_count=1)

    for gas in combustible_cols:
        features[f"pct_{gas}"] = df[gas] / tdcg * 100

    # Duval Triangle percentages (3-gas normalization)
    duval_gases = ["CH4", "C2H4", "C2H2"]
    if all(g in df.columns for g in duval_gases):
        duval_total = df[duval_gases].sum(axis=1, min_count=1)
        features["duval_pct_CH4"] = df["CH4"] / duval_total * 100
        features["duval_pct_C2H4"] = df["C2H4"] / duval_total * 100
        features["duval_pct_C2H2"] = df["C2H2"] / duval_total * 100

    return features


def compute_ieee_status(df):
    """
    Group E: IEEE C57.104-2019 status level per gas.

    Reference: [S1] IEEE C57.104-2019, Tables 1-2
    Status 1 = Normal, Status 2 = Caution, Status 3 = Warning/Critical
    """
    features = pd.DataFrame(index=df.index)

    for gas in DGA_GASES:
        if gas not in df.columns:
            continue
        s1_max, s2_max = IEEE_THRESHOLDS.get(gas, (float("inf"), float("inf")))
        features[f"ieee_status_{gas}"] = np.where(
            df[gas] <= s1_max, 1,
            np.where(df[gas] <= s2_max, 2, 3)
        )

    # Max status across all gases (overall severity)
    status_cols = [c for c in features.columns if c.startswith("ieee_status_")]
    if status_cols:
        features["ieee_max_status"] = features[status_cols].max(axis=1)

    return features


def compute_log_transforms(df):
    """
    Group F: Log transforms for right-skewed gas distributions.

    Reference: [2] "Fault Classification via DGA and ML" - MDPI, 2025
    Log transforms reduce the impact of extreme outliers while
    preserving relative ordering.
    """
    features = pd.DataFrame(index=df.index)
    for gas in DGA_GASES:
        if gas in df.columns:
            features[f"log_{gas}"] = np.log1p(df[gas])
    return features


def compute_oil_quality_features(df):
    """Group G: Oil quality parameters (BDV, moisture, resistivity, tan delta)."""
    features = pd.DataFrame(index=df.index)
    oil_cols = ["BDV", "MOISTURE", "RESISTIVITY", "TAN_DELTA"]
    for col in oil_cols:
        if col in df.columns:
            features[col] = df[col]
            features[f"has_{col}"] = df[col].notna().astype(int)
    return features


def encode_method_outputs(labels_df):
    """
    Group D: Traditional method outputs as ordinal features.

    Reference: [1] "ML-based multi-method interpretation for DGA" - PMC, 2024
    Encoding traditional method outputs as features for ML significantly
    boosts accuracy by combining domain knowledge with data-driven learning.
    """
    features = pd.DataFrame(index=labels_df.index)

    method_cols = [c for c in labels_df.columns if c.startswith("method_")]
    for col in method_cols:
        # Ordinal encode: map fault type strings to numeric codes
        features[f"feat_{col}"] = labels_df[col].map(
            lambda x: FAULT_TYPE_NAMES.get(x, -1) if pd.notna(x) else -1
        )

    # Consensus features
    features["consensus_confidence"] = labels_df["consensus_confidence"]
    features["n_methods_applied"] = labels_df["n_methods_applied"]
    features["n_methods_agreeing"] = labels_df["n_methods_agreeing"]

    # Method agreement ratio
    features["agreement_ratio"] = (
        labels_df["n_methods_agreeing"] / labels_df["n_methods_applied"].replace(0, 1)
    )

    return features


def build_feature_matrix(wide_df, labels_df):
    """
    Build the complete feature matrix combining all groups.

    Args:
        wide_df: Wide-format DataFrame with gas values
        labels_df: DataFrame with consensus labels and per-method results

    Returns:
        DataFrame with all computed features
    """
    print("Building feature matrix...")

    parts = []

    # Group A: Raw gas concentrations
    gas_cols = [g for g in DGA_GASES if g in wide_df.columns]
    parts.append(wide_df[gas_cols])
    print(f"  Group A (raw gases): {len(gas_cols)} features")

    # Group B: Gas ratios
    ratios = compute_gas_ratios(wide_df)
    parts.append(ratios)
    print(f"  Group B (ratios): {ratios.shape[1]} features")

    # Group C: Gas percentages
    pcts = compute_gas_percentages(wide_df)
    parts.append(pcts)
    print(f"  Group C (percentages): {pcts.shape[1]} features")

    # Group D: Traditional method outputs
    method_feats = encode_method_outputs(labels_df)
    parts.append(method_feats)
    print(f"  Group D (method outputs): {method_feats.shape[1]} features")

    # Group E: IEEE status levels
    ieee = compute_ieee_status(wide_df)
    parts.append(ieee)
    print(f"  Group E (IEEE status): {ieee.shape[1]} features")

    # Group F: Log transforms
    logs = compute_log_transforms(wide_df)
    parts.append(logs)
    print(f"  Group F (log transforms): {logs.shape[1]} features")

    # Group G: Oil quality
    oil = compute_oil_quality_features(wide_df)
    parts.append(oil)
    print(f"  Group G (oil quality): {oil.shape[1]} features")

    feature_matrix = pd.concat(parts, axis=1)
    print(f"\n  Total features: {feature_matrix.shape[1]}")

    return feature_matrix
