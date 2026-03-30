"""
Model 2: Health Index Prediction — XGBoost Regression.

Trains an XGBoost regressor to predict Composite Health Index (CHI)
from raw DGA and oil quality features.

Why ML on top of a deterministic formula?
  - ML handles missing data natively (XGBoost NaN support)
  - Captures non-linear interactions the formula misses
  - Works with partial gas data where the formula cannot
  - Significant divergence between ML and formula flags anomalies

References:
  [4] "Review of Transformer Health Index" - MDPI Electronics, 2023
      → Composite health index outperforms DGA-only assessment
  [5] "Modified DGA Scoring with Delta and Rate Values" - MDPI Energies, 2024
      → Rate-of-change improves health index accuracy by 12%
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dga_config import XGBOOST_HEALTH_PARAMS, RANDOM_STATE, TEST_SIZE, MODELS_DIR, RISK_LEVELS


def train_health_model(feature_matrix, health_df, save_dir=MODELS_DIR):
    """
    Train health index regression model.

    Args:
        feature_matrix: DataFrame with computed features
        health_df: DataFrame with 'chi' column (target)

    Returns:
        tuple: (model, metrics_dict)
    """
    print("=" * 60)
    print("  Model 2: Health Index (XGBoost Regression)")
    print("=" * 60)

    # Target: Composite Health Index (0-100)
    y = health_df["chi"].values
    X = feature_matrix.select_dtypes(include=[np.number]).copy()
    X = X.replace([np.inf, -np.inf], np.nan)

    # Drop rows where target is NaN
    valid_mask = ~np.isnan(y)
    X = X[valid_mask]
    y = y[valid_mask]

    print(f"\nDataset: {X.shape[0]} samples × {X.shape[1]} features")
    print(f"Target (CHI): mean={np.mean(y):.1f}, std={np.std(y):.1f}, "
          f"min={np.min(y):.1f}, max={np.max(y):.1f}")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE,
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # Train XGBoost regressor
    print("\nTraining XGBoost regressor...")
    model = XGBRegressor(**XGBOOST_HEALTH_PARAMS, verbosity=0)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    # Clip predictions to 0-100 range
    y_pred = np.clip(y_pred, 0, 100)

    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"\n--- Results ---")
    print(f"  RMSE: {rmse:.2f}")
    print(f"  MAE:  {mae:.2f}")
    print(f"  R²:   {r2:.4f}")

    # Risk level accuracy
    def _to_risk(chi):
        if chi >= 80: return "Excellent"
        elif chi >= 60: return "Good"
        elif chi >= 40: return "Fair"
        elif chi >= 20: return "Poor"
        else: return "Critical"

    actual_risk = [_to_risk(v) for v in y_test]
    pred_risk = [_to_risk(v) for v in y_pred]
    risk_accuracy = sum(a == p for a, p in zip(actual_risk, pred_risk)) / len(y_test)
    print(f"  Risk level accuracy: {risk_accuracy:.4f}")

    # Predicted risk distribution
    print(f"\n  Predicted risk distribution:")
    from collections import Counter
    risk_counts = Counter(pred_risk)
    for level in ["Excellent", "Good", "Fair", "Poor", "Critical"]:
        count = risk_counts.get(level, 0)
        print(f"    {level:10s}: {count:5,} ({count/len(y_test)*100:.1f}%)")

    # Feature importance (top 15)
    importance = dict(zip(X.columns, model.feature_importances_))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:15]
    print(f"\n  Top 15 features:")
    for feat, imp in top_features:
        print(f"    {feat:35s}: {imp:.4f}")

    # Save
    os.makedirs(save_dir, exist_ok=True)
    model_path = os.path.join(save_dir, "health_index.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    metrics = {
        "rmse": rmse, "mae": mae, "r2": r2,
        "risk_level_accuracy": risk_accuracy,
        "top_features": top_features,
        "n_train": len(X_train), "n_test": len(X_test),
    }
    metrics_path = os.path.join(save_dir, "health_index_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2, default=str)

    print(f"\nModel saved: {model_path}")
    return model, metrics
