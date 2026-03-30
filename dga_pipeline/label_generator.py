"""
Consensus Label Generator for DGA Fault Classification.

Generates fault labels by combining outputs from 5 traditional DGA
interpretation methods using weighted voting. This hybrid approach is
based on:

  [1] "Machine learning based multi-method interpretation to enhance
       dissolved gas analysis for power transformer fault diagnosis"
       PMC/ScienceDirect, 2024 — achieved 99.17% accuracy using
       multi-method consensus combined with ML.

Methodology:
  1. Run all applicable methods on each sample
  2. Map each method's output to unified taxonomy (8 classes)
  3. Weighted voting: Duval Triangle(3), Pentagon(3), IEC(2), Rogers(1), Key Gas(1)
  4. Override: If ALL gases below IEEE Status 1 → classify as Normal
  5. Output: fault label + confidence score

Reference taxonomy from IEC 60599:2022:
  0=Normal, 1=PD, 2=D1, 3=D2, 4=T1, 5=T2, 6=T3, 7=DT
"""

import os
import sys
import numpy as np
import pandas as pd
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dga_config import FAULT_TYPES, FAULT_TYPE_NAMES, IEEE_THRESHOLDS, DGA_GASES
from dga_pipeline.traditional_methods import apply_all_methods


# Method weights — Duval methods have highest validated accuracy [Paper 3]
METHOD_WEIGHTS = {
    "duval_triangle": 3,
    "duval_pentagon":  3,
    "iec_ratio":       2,
    "rogers":          1,
    "key_gas":         1,
}


def _is_below_ieee_status1(row):
    """Check if ALL gas concentrations are below IEEE C57.104-2019 Status 1."""
    for gas in DGA_GASES:
        if gas in row and not np.isnan(row.get(gas, np.nan)):
            threshold = IEEE_THRESHOLDS.get(gas, (float("inf"),))[0]
            if row[gas] > threshold:
                return False
    return True


def _consensus_vote(method_results):
    """
    Weighted majority vote across methods.

    Returns:
        tuple: (fault_label_str, confidence_score)
    """
    if not method_results:
        return "Normal", 0.0

    # Weighted vote counting
    vote_counts = Counter()
    total_weight = 0

    for method, fault in method_results.items():
        weight = METHOD_WEIGHTS.get(method, 1)
        vote_counts[fault] += weight
        total_weight += weight

    if total_weight == 0:
        return "Normal", 0.0

    # Winner = highest weighted votes; ties broken by first in dict order
    winner = vote_counts.most_common(1)[0]
    confidence = winner[1] / total_weight

    return winner[0], confidence


def generate_labels(wide_df):
    """
    Generate consensus fault labels for all samples.

    Args:
        wide_df: Wide-format DataFrame with gas columns (H2, CH4, etc.)

    Returns:
        DataFrame with added columns: fault_label, fault_code, consensus_confidence,
        n_methods_applied, n_methods_agreeing, and per-method results.
    """
    print("Generating consensus fault labels...")
    print(f"  Using {len(METHOD_WEIGHTS)} methods with weights: {METHOD_WEIGHTS}")

    results = []

    for idx, row in wide_df.iterrows():
        # Extract gas values (use NaN-safe access)
        h2 = row.get("H2", np.nan)
        ch4 = row.get("CH4", np.nan)
        c2h6 = row.get("C2H6", np.nan)
        c2h4 = row.get("C2H4", np.nan)
        c2h2 = row.get("C2H2", np.nan)
        co = row.get("CO", np.nan)

        # Convert NaN-like values
        h2 = np.nan if pd.isna(h2) else float(h2)
        ch4 = np.nan if pd.isna(ch4) else float(ch4)
        c2h6 = np.nan if pd.isna(c2h6) else float(c2h6)
        c2h4 = np.nan if pd.isna(c2h4) else float(c2h4)
        c2h2 = np.nan if pd.isna(c2h2) else float(c2h2)
        co = np.nan if pd.isna(co) else float(co)

        # Apply all methods
        method_results = apply_all_methods(h2, ch4, c2h6, c2h4, c2h2, co)

        # Override: If all gases below IEEE Status 1, force Normal
        # (gas ratios are unreliable at very low concentrations)
        if _is_below_ieee_status1(row):
            fault_label = "Normal"
            confidence = 1.0
        else:
            fault_label, confidence = _consensus_vote(method_results)

        # Count agreement
        n_methods = len(method_results)
        n_agreeing = sum(1 for f in method_results.values() if f == fault_label)

        result = {
            "fault_label": fault_label,
            "fault_code": FAULT_TYPE_NAMES.get(fault_label, 0),
            "consensus_confidence": round(confidence, 3),
            "n_methods_applied": n_methods,
            "n_methods_agreeing": n_agreeing,
        }
        # Store per-method results for transparency
        for method in METHOD_WEIGHTS:
            result[f"method_{method}"] = method_results.get(method, None)

        results.append(result)

    labels_df = pd.DataFrame(results)

    # Print summary
    print(f"\n--- Fault Label Distribution ---")
    dist = labels_df["fault_label"].value_counts()
    for fault, count in dist.items():
        pct = count / len(labels_df) * 100
        print(f"  {fault:8s}: {count:6,} ({pct:.1f}%)")
    print(f"\n  Mean confidence: {labels_df['consensus_confidence'].mean():.3f}")
    print(f"  Mean methods applied: {labels_df['n_methods_applied'].mean():.1f}")

    return labels_df


if __name__ == "__main__":
    from dga_pipeline.data_pipeline import run_pipeline
    wide_df, _ = run_pipeline()
    labels = generate_labels(wide_df)
