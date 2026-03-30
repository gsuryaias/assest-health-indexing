"""
Time-Series Feature Generator for DGA Failure Prediction.

Computes temporal features from sequential DGA measurements:
  - Rate of change (ppm/day, %/day, acceleration)
  - Rolling statistics (mean, std, max, trend over 3 and 5 samples)
  - Lag features (previous 1/2/3 values and deltas)
  - Time features (days since last test, sample number, season)

Target variable: Will ANY gas exceed IEEE Status 3 at the NEXT test?

References:
  [5] "Modified Dissolved Gas Analysis Scoring Approach for Transformer
       Health Evaluation Considering Delta and Rate Values"
       MDPI Energies, 2024
       → Rate-of-change detects developing faults 3 weeks earlier than
         absolute threshold methods alone.

  [2] "Fault Classification in Power Transformers via DGA and ML"
       MDPI Applied Sciences, 2025
       → Section 3.4: time-series feature engineering for DGA
"""

import os
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dga_config import DGA_GASES, IEEE_THRESHOLDS


def compute_rate_of_change(group, gas):
    """
    Compute rate of change for a gas within a transformer's time series.

    Reference: [5] MDPI Energies, 2024
    Rate = (current - previous) / days_between_samples

    Returns:
        Series with rate_ppm_per_day, rate_pct_per_day, acceleration
    """
    values = group[gas]
    dates = group["Sample dt"]
    days_diff = dates.diff().dt.total_seconds() / 86400  # Convert to days

    # Absolute rate (ppm/day)
    rate = values.diff() / days_diff

    # Relative rate (%/day)
    prev_values = values.shift(1)
    rate_pct = np.where(prev_values > 0, rate / prev_values * 100, 0)

    # Acceleration (rate of rate change)
    accel = pd.Series(rate).diff() / days_diff

    return rate, pd.Series(rate_pct, index=group.index), accel


def compute_rolling_stats(group, gas, window):
    """
    Rolling statistics over a window of samples.

    Returns mean, std, max, and linear trend slope.
    """
    values = group[gas]

    roll = values.rolling(window=window, min_periods=2)
    roll_mean = roll.mean()
    roll_std = roll.std()
    roll_max = roll.max()

    # Linear trend (slope of last `window` values)
    def _slope(arr):
        arr = arr.dropna()
        if len(arr) < 2:
            return np.nan
        x = np.arange(len(arr))
        return np.polyfit(x, arr.values, 1)[0]

    roll_trend = values.rolling(window=window, min_periods=2).apply(_slope, raw=False)

    return roll_mean, roll_std, roll_max, roll_trend


def generate_time_series_features(wide_df):
    """
    Generate time-series features for failure prediction.

    Args:
        wide_df: Wide-format DataFrame sorted by (Equipment No, Sample dt)

    Returns:
        DataFrame with time-series features and failure target variable
    """
    print("Generating time-series features...")

    # Only process transformers with 2+ samples
    sample_counts = wide_df.groupby("Equipment No").size()
    multi_sample = sample_counts[sample_counts >= 2].index
    df = wide_df[wide_df["Equipment No"].isin(multi_sample)].copy()
    print(f"  Transformers with 2+ samples: {len(multi_sample):,}")
    print(f"  Total rows: {len(df):,}")

    all_features = []
    gas_cols = [g for g in DGA_GASES if g in df.columns]

    for equip_no, group in df.groupby("Equipment No"):
        group = group.sort_values("Sample dt").copy()
        feat = pd.DataFrame(index=group.index)

        # Time features
        feat["days_since_last"] = group["Sample dt"].diff().dt.total_seconds() / 86400
        feat["sample_number"] = range(len(group))
        feat["month"] = group["Sample dt"].dt.month

        for gas in gas_cols:
            if group[gas].isna().all():
                continue

            # Rate of change features [Paper 5]
            rate, rate_pct, accel = compute_rate_of_change(group, gas)
            feat[f"rate_{gas}_ppm_day"] = rate
            feat[f"rate_{gas}_pct_day"] = rate_pct
            feat[f"accel_{gas}"] = accel

            # Lag features (previous 1, 2, 3 values)
            for lag in [1, 2, 3]:
                feat[f"lag{lag}_{gas}"] = group[gas].shift(lag)
                feat[f"delta{lag}_{gas}"] = group[gas] - group[gas].shift(lag)

            # Rolling stats (window=3 and window=5)
            for w in [3, 5]:
                if len(group) >= w:
                    rmean, rstd, rmax, rtrend = compute_rolling_stats(group, gas, w)
                    feat[f"roll{w}_mean_{gas}"] = rmean
                    feat[f"roll{w}_std_{gas}"] = rstd
                    feat[f"roll{w}_max_{gas}"] = rmax
                    feat[f"roll{w}_trend_{gas}"] = rtrend

        # Derived features
        rate_cols = [c for c in feat.columns if c.startswith("rate_") and c.endswith("_ppm_day")]
        if rate_cols:
            feat["max_gas_rate"] = feat[rate_cols].abs().max(axis=1)
            feat["n_gases_increasing"] = (feat[rate_cols] > 0).sum(axis=1)

        all_features.append(feat)

    features_df = pd.concat(all_features)

    # Generate target: Will any gas exceed IEEE Status 3 at NEXT test?
    print("  Computing failure prediction target...")
    target = pd.Series(np.nan, index=df.index, name="target_failure")

    for equip_no, group in df.groupby("Equipment No"):
        group = group.sort_values("Sample dt")
        indices = group.index.tolist()

        for i in range(len(indices) - 1):
            current_idx = indices[i]
            next_idx = indices[i + 1]
            next_row = df.loc[next_idx]

            # Check if any gas exceeds Status 3 at next test
            exceeded = False
            for gas in gas_cols:
                if pd.isna(next_row.get(gas)):
                    continue
                _, s2_max = IEEE_THRESHOLDS.get(gas, (float("inf"), float("inf")))
                if next_row[gas] > s2_max:
                    exceeded = True
                    break

            target.loc[current_idx] = int(exceeded)

    features_df["target_failure"] = target

    # Summary
    valid_targets = features_df["target_failure"].dropna()
    n_pos = (valid_targets == 1).sum()
    n_neg = (valid_targets == 0).sum()
    print(f"\n--- Failure Prediction Target ---")
    print(f"  Positive (will exceed): {n_pos:,} ({n_pos/(n_pos+n_neg)*100:.1f}%)")
    print(f"  Negative (normal): {n_neg:,} ({n_neg/(n_pos+n_neg)*100:.1f}%)")
    print(f"  Unknown (last sample): {features_df['target_failure'].isna().sum():,}")
    print(f"  Total features: {features_df.shape[1]}")

    return features_df
