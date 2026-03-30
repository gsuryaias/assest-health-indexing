"""
Phase A: Local End-to-End DGA Pipeline.

Runs the complete pipeline on M4 Max locally:
  1. Data pipeline (Excel → clean → pivot)
  2. Traditional DGA methods (Duval, Rogers, IEC, Key Gas)
  3. Consensus fault labeling
  4. Feature engineering (~55+ features)
  5. Health index computation (DGAF + composite)
  6. Time-series feature generation
  7. Train Model 1: Fault Classification (XGBoost + SMOTE)
  8. Train Model 2: Health Index Regression
  9. Train Model 3: Failure Prediction

All research citations are documented in each module.
"""

import os
import sys
import time
import numpy as np
import pandas as pd

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dga_config import PROCESSED_DIR, MODELS_DIR, DGA_GASES


def main():
    start_time = time.time()
    print("=" * 70)
    print("  AP Transco DGA Analysis — Phase A (Local)")
    print("  Research-backed transformer fault diagnosis & health assessment")
    print("=" * 70)

    # =========================================================================
    # Step 1: Data Pipeline
    # =========================================================================
    print("\n" + "=" * 70)
    print("  STEP 1: Data Pipeline")
    print("=" * 70)
    from dga_pipeline.data_pipeline import run_pipeline
    wide_df, metadata = run_pipeline()

    # Sort by equipment and time for consistent rate-of-change computation
    if "Equipment No" in wide_df.columns and "Sample dt" in wide_df.columns:
        wide_df = wide_df.sort_values(["Equipment No", "Sample dt"]).reset_index(drop=True)

    # =========================================================================
    # Step 2-3: Traditional Methods + Consensus Labels
    # =========================================================================
    print("\n" + "=" * 70)
    print("  STEP 2-3: Traditional Methods + Consensus Labels")
    print("=" * 70)
    from dga_pipeline.label_generator import generate_labels
    labels_df = generate_labels(wide_df)

    # Attach labels to wide_df
    for col in labels_df.columns:
        wide_df[col] = labels_df[col].values

    # Save labeled data
    labeled_path = os.path.join(PROCESSED_DIR, "dga_labeled.csv")
    wide_df.to_csv(labeled_path, index=False)
    print(f"Saved labeled data: {labeled_path}")

    # =========================================================================
    # Step 4: Feature Engineering
    # =========================================================================
    print("\n" + "=" * 70)
    print("  STEP 4: Feature Engineering")
    print("=" * 70)
    from dga_pipeline.feature_engineering import build_feature_matrix
    feature_matrix = build_feature_matrix(wide_df, labels_df)

    # =========================================================================
    # Step 5: Health Index
    # =========================================================================
    print("\n" + "=" * 70)
    print("  STEP 5: Health Index Computation")
    print("=" * 70)
    from dga_pipeline.health_index_calculator import (
        compute_composite_health_index, compute_furan_rul,
    )
    health_df = compute_composite_health_index(wide_df, labels_df=labels_df)

    # Attach to wide_df
    for col in health_df.columns:
        wide_df[col] = health_df[col].values

    # Furan / DP-based Remaining Insulation Life
    furan_df = compute_furan_rul(wide_df)
    for col in furan_df.columns:
        wide_df[col] = furan_df[col].values

    # Re-save labeled data with health index + RUL columns
    wide_df.to_csv(labeled_path, index=False)
    print(f"Re-saved with health index + furan RUL: {labeled_path}")

    # =========================================================================
    # Step 6: Time-Series Features
    # =========================================================================
    print("\n" + "=" * 70)
    print("  STEP 6: Time-Series Features")
    print("=" * 70)
    from dga_pipeline.time_series_features import generate_time_series_features
    ts_features_df = generate_time_series_features(wide_df)

    # =========================================================================
    # Step 7: Train Model 1 — Fault Classification
    # =========================================================================
    print("\n" + "=" * 70)
    print("  STEP 7: Train Fault Classification Model")
    print("=" * 70)

    # Use samples with 5+ gases for reliable consensus labels
    fault_mask = wide_df["has_5plus_gases"]
    fault_features = feature_matrix[fault_mask].reset_index(drop=True)
    fault_labels = labels_df[fault_mask].reset_index(drop=True)
    print(f"Using {len(fault_features)} samples with 5+ DGA gases")

    from dga_training.train_fault_classifier import train_fault_model
    fault_model, fault_metrics, _, _ = train_fault_model(fault_features, fault_labels)

    # =========================================================================
    # Step 8: Train Model 2 — Health Index
    # =========================================================================
    print("\n" + "=" * 70)
    print("  STEP 8: Train Health Index Model")
    print("=" * 70)

    from dga_training.train_health_index import train_health_model
    health_model, health_metrics = train_health_model(feature_matrix, health_df)

    # =========================================================================
    # Step 9: Train Model 3 — Failure Prediction
    # =========================================================================
    print("\n" + "=" * 70)
    print("  STEP 9: Train Failure Prediction Model")
    print("=" * 70)

    from dga_training.train_failure_predictor import train_failure_model
    failure_model, failure_metrics = train_failure_model(ts_features_df, wide_df)

    # =========================================================================
    # Summary
    # =========================================================================
    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print("  PHASE A COMPLETE — Summary")
    print("=" * 70)
    print(f"\n  Total time: {elapsed:.0f} seconds ({elapsed/60:.1f} minutes)")
    print(f"\n  Data:")
    print(f"    Transformers: {wide_df['Equipment No'].nunique():,}")
    print(f"    Samples: {len(wide_df):,}")
    print(f"    Features: {feature_matrix.shape[1]}")

    print(f"\n  Model 1 — Fault Classification:")
    print(f"    Accuracy: {fault_metrics['accuracy']:.4f}")
    print(f"    Weighted F1: {fault_metrics['weighted_f1']:.4f}")

    print(f"\n  Model 2 — Health Index:")
    print(f"    R²: {health_metrics['r2']:.4f}")
    print(f"    MAE: {health_metrics['mae']:.2f}")
    print(f"    Risk Level Accuracy: {health_metrics['risk_level_accuracy']:.4f}")

    print(f"\n  Model 3 — Failure Prediction:")
    print(f"    Accuracy: {failure_metrics['accuracy']:.4f}")
    if failure_metrics.get("auc_roc"):
        print(f"    AUC-ROC: {failure_metrics['auc_roc']:.4f}")
        print(f"    AUC-PR: {failure_metrics['auc_pr']:.4f}")

    print(f"\n  Models saved to: {MODELS_DIR}")
    print(f"  Processed data: {PROCESSED_DIR}")
    print(f"\n  Done!")


if __name__ == "__main__":
    main()
