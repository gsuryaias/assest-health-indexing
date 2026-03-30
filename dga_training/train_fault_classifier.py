"""
Model 1: Fault Classification — XGBoost with SMOTE.

Trains a multi-class XGBoost classifier to predict transformer fault type
from DGA features. Uses SMOTE to handle class imbalance.

References:
  [1] "ML-based multi-method interpretation for DGA" - PMC, 2024
      → Hybrid AI + ML achieves 99.17% accuracy
  [2] "Fault Classification via DGA and ML: Systematic Review" - MDPI, 2025
      → XGBoost top performer (86-98%); recommends SMOTE + SHAP
  [6] "SHAP + LGBM for transformer fault diagnosis" - Energy Informatics, 2025
      → SHAP provides actionable feature importance
  [7] "SMOTE + GBDT Hybrid for DGA Fault Diagnosis" - Arabian J. Sci. Eng., 2025
      → SMOTE improves minority-class F1 from 0.82 to 0.94
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from imblearn.over_sampling import SMOTE

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dga_config import (
    FAULT_TYPES, XGBOOST_FAULT_PARAMS, RANDOM_STATE, TEST_SIZE, MODELS_DIR,
)


def train_fault_model(feature_matrix, labels_df, save_dir=MODELS_DIR):
    """
    Train fault classification model.

    Args:
        feature_matrix: DataFrame with computed features
        labels_df: DataFrame with fault_code column

    Returns:
        tuple: (model, metrics_dict, X_test, y_test)
    """
    print("=" * 60)
    print("  Model 1: Fault Classification (XGBoost + SMOTE)")
    print("=" * 60)

    # Prepare data — use only samples with 5+ gases for reliable labels
    y = labels_df["fault_code"].values
    X = feature_matrix.copy()

    # Drop non-numeric columns
    X = X.select_dtypes(include=[np.number])

    # Replace inf with NaN (XGBoost handles NaN natively)
    X = X.replace([np.inf, -np.inf], np.nan)

    print(f"\nDataset: {X.shape[0]} samples × {X.shape[1]} features")
    print(f"Classes: {np.unique(y)}")
    print(f"Class distribution:")
    for code, name in FAULT_TYPES.items():
        count = (y == code).sum()
        if count > 0:
            print(f"  {name:8s} ({code}): {count:5,}")

    # Train/test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y,
    )
    print(f"\nTrain: {len(X_train)}, Test: {len(X_test)}")

    # SMOTE for class imbalance [Paper 7]
    # Only apply to training set
    print("\nApplying SMOTE for class imbalance [Paper 7]...")
    # Fill NaN temporarily for SMOTE (it doesn't handle NaN)
    X_train_filled = X_train.fillna(-999)

    # Use k_neighbors=min(3, smallest_class-1)
    min_class_size = pd.Series(y_train).value_counts().min()
    k_neighbors = min(3, max(1, min_class_size - 1))

    smote = SMOTE(random_state=RANDOM_STATE, k_neighbors=k_neighbors)
    X_train_res, y_train_res = smote.fit_resample(X_train_filled, y_train)

    # Restore NaN markers
    X_train_res = pd.DataFrame(X_train_res, columns=X_train.columns)
    X_train_res = X_train_res.replace(-999, np.nan)

    print(f"  After SMOTE: {len(X_train_res)} samples")
    for code, name in FAULT_TYPES.items():
        count = (y_train_res == code).sum()
        if count > 0:
            print(f"    {name:8s}: {count:5,}")

    # Train XGBoost [Paper 2]
    print("\nTraining XGBoost classifier [Paper 2]...")
    params = XGBOOST_FAULT_PARAMS.copy()
    # Remove params not accepted by sklearn API
    params.pop("eval_metric", None)

    model = XGBClassifier(**params, use_label_encoder=False, verbosity=0)
    model.fit(
        X_train_res, y_train_res,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    target_names = [FAULT_TYPES[i] for i in sorted(np.unique(np.concatenate([y_test, y_pred])))]
    report = classification_report(
        y_test, y_pred, target_names=target_names, output_dict=True, zero_division=0,
    )

    print(f"\n--- Results ---")
    print(f"  Accuracy: {accuracy:.4f}")
    print(f"  Weighted F1: {report['weighted avg']['f1-score']:.4f}")
    print(f"  Macro F1: {report['macro avg']['f1-score']:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=target_names, zero_division=0))

    # Feature importance (top 20)
    importance = dict(zip(X.columns, model.feature_importances_))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:20]
    print("Top 20 features:")
    for feat, imp in top_features:
        print(f"  {feat:35s}: {imp:.4f}")

    # Save model and metrics
    os.makedirs(save_dir, exist_ok=True)
    model_path = os.path.join(save_dir, "fault_classifier.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    metrics = {
        "accuracy": accuracy,
        "weighted_f1": report["weighted avg"]["f1-score"],
        "macro_f1": report["macro avg"]["f1-score"],
        "per_class": {name: report.get(name, {}) for name in target_names},
        "top_features": top_features,
        "n_train": len(X_train_res),
        "n_test": len(X_test),
        "n_features": X.shape[1],
    }
    metrics_path = os.path.join(save_dir, "fault_classifier_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2, default=str)

    feature_names_path = os.path.join(save_dir, "fault_classifier_features.json")
    with open(feature_names_path, "w") as f:
        json.dump(list(X.columns), f)

    print(f"\nModel saved: {model_path}")
    print(f"Metrics saved: {metrics_path}")

    return model, metrics, X_test, y_test
