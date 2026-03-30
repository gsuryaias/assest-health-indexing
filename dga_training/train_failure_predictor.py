"""
Model 3: Failure Prediction — XGBoost Binary Classification.

Predicts whether any DGA gas will exceed IEEE C57.104-2019 Status 3
threshold at the next sampling event.

Uses temporal train/test split (not random) to prevent data leakage —
the model only sees past data when predicting.

References:
  [5] "Modified DGA Scoring with Delta and Rate Values" - MDPI Energies, 2024
      → Rate-of-change features detect faults 3 weeks earlier
  [2] "Fault Classification via DGA and ML" - MDPI Applied Sciences, 2025
      → XGBoost matches deep learning for tabular DGA data
  [S1] IEEE C57.104-2019 — Status 3 thresholds (95th percentile)
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import (
    classification_report, accuracy_score, precision_recall_curve,
    roc_auc_score, average_precision_score,
)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dga_config import XGBOOST_FAILURE_PARAMS, RANDOM_STATE, MODELS_DIR


def train_failure_model(ts_features_df, wide_df, save_dir=MODELS_DIR):
    """
    Train failure prediction model with temporal split.

    Args:
        ts_features_df: DataFrame with time-series features and target_failure column
        wide_df: Original wide-format data (for temporal ordering)

    Returns:
        tuple: (model, metrics_dict)
    """
    print("=" * 60)
    print("  Model 3: Failure Prediction (XGBoost Binary)")
    print("=" * 60)

    # Merge dates for temporal splitting
    df = ts_features_df.join(wide_df[["Equipment No", "Sample dt"]], how="inner")

    # Drop rows with no target
    df = df.dropna(subset=["target_failure"])
    y = df["target_failure"].astype(int).values

    # Feature columns (exclude metadata and target)
    exclude_cols = ["target_failure", "Equipment No", "Sample dt"]
    feature_cols = [c for c in df.columns if c not in exclude_cols and df[c].dtype in [np.float64, np.int64, np.float32]]
    X = df[feature_cols].replace([np.inf, -np.inf], np.nan)

    print(f"\nDataset: {X.shape[0]} samples × {X.shape[1]} features")
    n_pos = y.sum()
    n_neg = len(y) - n_pos
    print(f"Class balance: {n_pos} positive ({n_pos/len(y)*100:.1f}%), "
          f"{n_neg} negative ({n_neg/len(y)*100:.1f}%)")

    # TEMPORAL SPLIT — Critical: no random split for time series!
    # Train on first 80% of each transformer's timeline, test on last 20%
    print("\nApplying temporal train/test split (no data leakage)...")
    train_mask = pd.Series(False, index=df.index)
    test_mask = pd.Series(False, index=df.index)

    for equip_no, group in df.groupby("Equipment No"):
        group = group.sort_values("Sample dt")
        n = len(group)
        split_idx = int(n * 0.8)
        if split_idx == 0:
            split_idx = 1
        train_indices = group.index[:split_idx]
        test_indices = group.index[split_idx:]
        train_mask.loc[train_indices] = True
        test_mask.loc[test_indices] = True

    X_train, X_test = X[train_mask], X[test_mask]
    y_train, y_test = y[train_mask.values], y[test_mask.values]
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    if len(X_test) == 0 or y_test.sum() == 0:
        print("WARNING: Not enough positive samples in test set for meaningful evaluation")

    # Handle class imbalance with scale_pos_weight
    scale_pos_weight = n_neg / max(n_pos, 1)
    params = XGBOOST_FAILURE_PARAMS.copy()
    params["scale_pos_weight"] = scale_pos_weight
    params.pop("eval_metric", None)

    # Train
    print(f"\nTraining XGBoost (scale_pos_weight={scale_pos_weight:.1f})...")
    model = XGBClassifier(**params, use_label_encoder=False, verbosity=0)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n--- Results ---")
    print(f"  Accuracy: {accuracy:.4f}")

    if len(np.unique(y_test)) > 1:
        auc_roc = roc_auc_score(y_test, y_prob)
        auc_pr = average_precision_score(y_test, y_prob)
        print(f"  AUC-ROC: {auc_roc:.4f}")
        print(f"  AUC-PR:  {auc_pr:.4f}")
    else:
        auc_roc = auc_pr = None
        print("  AUC: N/A (single class in test set)")

    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Normal", "Failure"], zero_division=0))

    # Evaluate at multiple thresholds
    if auc_roc is not None:
        print("Threshold analysis:")
        for threshold in [0.1, 0.2, 0.3, 0.5]:
            y_at_t = (y_prob >= threshold).astype(int)
            tp = ((y_at_t == 1) & (y_test == 1)).sum()
            fp = ((y_at_t == 1) & (y_test == 0)).sum()
            fn = ((y_at_t == 0) & (y_test == 1)).sum()
            recall = tp / max(tp + fn, 1)
            precision = tp / max(tp + fp, 1)
            print(f"  t={threshold:.1f}: precision={precision:.3f}, recall={recall:.3f}, "
                  f"TP={tp}, FP={fp}, FN={fn}")

    # Urgency mapping
    print(f"\n  Urgency Level Mapping:")
    print(f"    P < 0.10 → Low Risk")
    print(f"    P < 0.30 → Moderate")
    print(f"    P < 0.50 → High")
    print(f"    P >= 0.50 → Critical")

    # Feature importance
    importance = dict(zip(feature_cols, model.feature_importances_))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:15]
    print(f"\n  Top 15 features:")
    for feat, imp in top_features:
        print(f"    {feat:35s}: {imp:.4f}")

    # Save
    os.makedirs(save_dir, exist_ok=True)
    model_path = os.path.join(save_dir, "failure_predictor.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    metrics = {
        "accuracy": accuracy,
        "auc_roc": auc_roc,
        "auc_pr": auc_pr,
        "top_features": top_features,
        "n_train": len(X_train), "n_test": len(X_test),
        "scale_pos_weight": scale_pos_weight,
    }
    metrics_path = os.path.join(save_dir, "failure_predictor_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2, default=str)

    print(f"\nModel saved: {model_path}")
    return model, metrics
