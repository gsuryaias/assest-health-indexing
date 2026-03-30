"""
Data Pipeline: Excel ingestion, cleaning, and pivoting for DGA analysis.

Reads AP Transco's long-format oil test data (315,419 rows) and produces
a wide-format DataFrame where each row = one transformer on one sample date,
with columns for each test value.

References:
  [S1] IEEE C57.104-2019 for gas naming conventions
  [S2] IEC 60599:2022 for test parameter standardization
"""

import os
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dga_config import (
    EXCEL_PATH, PROCESSED_DIR, TEST_NAME_MAP, METADATA_COLS, DGA_GASES,
)


def load_raw_data(excel_path=EXCEL_PATH):
    """Load the raw Excel file."""
    print(f"Loading Excel: {os.path.basename(excel_path)} ...")
    df = pd.read_excel(excel_path, sheet_name="OTL")
    print(f"  Loaded {len(df):,} rows, {df.shape[1]} columns")
    return df


def clean_and_standardize(df):
    """Clean data and standardize test names to canonical form."""
    print("Cleaning and standardizing...")

    # Keep only tests we care about
    df = df[df["Test Name"].isin(TEST_NAME_MAP.keys())].copy()
    df["canonical_test"] = df["Test Name"].map(TEST_NAME_MAP)
    print(f"  Filtered to {len(df):,} rows ({df['canonical_test'].nunique()} test types)")

    # Convert test values to numeric
    df["test_value"] = pd.to_numeric(df["Test Value"], errors="coerce")

    # Flag negative gas values (physically impossible for dissolved gases)
    gas_mask = df["canonical_test"].isin(DGA_GASES)
    neg_mask = gas_mask & (df["test_value"] < 0)
    n_neg = neg_mask.sum()
    if n_neg > 0:
        print(f"  WARNING: {n_neg} negative gas values set to NaN")
        df.loc[neg_mask, "test_value"] = np.nan

    # Ensure dates are datetime
    df["Sample dt"] = pd.to_datetime(df["Sample dt"], errors="coerce")

    # Drop rows with no date or equipment number
    before = len(df)
    df = df.dropna(subset=["Sample dt", "Equipment No"])
    dropped = before - len(df)
    if dropped > 0:
        print(f"  Dropped {dropped} rows with missing date/equipment")

    return df


def extract_metadata(df):
    """Extract transformer metadata (one row per equipment)."""
    print("Extracting transformer metadata...")

    # Take first non-null value for each metadata column per equipment
    available_cols = [c for c in METADATA_COLS if c in df.columns and c != "Equipment No"]
    meta = df.groupby("Equipment No")[available_cols].first().reset_index()

    # Parse year of manufacture and date of commissioning
    if "YOM" in meta.columns:
        meta["YOM"] = pd.to_numeric(meta["YOM"], errors="coerce")
    if "DOC" in meta.columns:
        meta["DOC"] = pd.to_datetime(meta["DOC"], errors="coerce")

    # Compute equipment age in years (from commissioning or YOM)
    if "DOC" in meta.columns:
        meta["age_years"] = (pd.Timestamp.now() - meta["DOC"]).dt.days / 365.25
    elif "YOM" in meta.columns:
        meta["age_years"] = pd.Timestamp.now().year - meta["YOM"]

    # Parse capacity to numeric
    if "CAP" in meta.columns:
        meta["capacity_mva"] = pd.to_numeric(
            meta["CAP"].astype(str).str.extract(r"([\d.]+)", expand=False),
            errors="coerce",
        )

    print(f"  {len(meta):,} unique transformers")
    return meta


def pivot_to_wide(df):
    """Pivot long-format to wide: (equipment, date) × test_values."""
    print("Pivoting to wide format...")

    wide = df.pivot_table(
        index=["Equipment No", "Sample dt"],
        columns="canonical_test",
        values="test_value",
        aggfunc="mean",  # Average if multiple readings of same test on same date
    ).reset_index()

    # Flatten column names
    wide.columns.name = None

    # Add gas completeness flags
    gas_cols = [g for g in DGA_GASES if g in wide.columns]
    wide["dga_gas_count"] = wide[gas_cols].notna().sum(axis=1)
    wide["has_5plus_gases"] = wide["dga_gas_count"] >= 5
    wide["has_all_7_gases"] = wide["dga_gas_count"] == 7
    wide["has_duval_gases"] = wide[["CH4", "C2H4", "C2H2"]].notna().all(axis=1) \
        if all(g in wide.columns for g in ["CH4", "C2H4", "C2H2"]) else False

    # Compute TDCG if not already present
    combustible = [g for g in ["H2", "CH4", "C2H6", "C2H4", "C2H2", "CO"] if g in wide.columns]
    if "TDCG" not in wide.columns and combustible:
        wide["TDCG"] = wide[combustible].sum(axis=1, min_count=1)

    print(f"  Wide format: {len(wide):,} rows × {wide.shape[1]} columns")
    print(f"  Samples with 5+ gases: {wide['has_5plus_gases'].sum():,}")
    print(f"  Samples with all 7 gases: {wide['has_all_7_gases'].sum():,}")

    return wide


def run_pipeline():
    """Execute the full data pipeline."""
    print("=" * 60)
    print("  DGA Data Pipeline")
    print("=" * 60)

    # Step 1: Load
    raw_df = load_raw_data()

    # Step 2: Clean and standardize
    clean_df = clean_and_standardize(raw_df)

    # Step 3: Extract metadata
    metadata = extract_metadata(raw_df)

    # Step 4: Pivot to wide
    wide_df = pivot_to_wide(clean_df)

    # Step 5: Merge metadata
    print("Merging metadata...")
    wide_df = wide_df.merge(metadata, on="Equipment No", how="left")

    # Step 6: Sort by equipment and date (important for time-series)
    wide_df = wide_df.sort_values(["Equipment No", "Sample dt"]).reset_index(drop=True)

    # Step 7: Save
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    out_path = os.path.join(PROCESSED_DIR, "dga_wide_format.csv")
    wide_df.to_csv(out_path, index=False)
    print(f"\nSaved: {out_path}")
    print(f"  Shape: {wide_df.shape}")

    # Summary statistics
    print("\n--- Gas Completeness ---")
    for gas in DGA_GASES:
        if gas in wide_df.columns:
            n = wide_df[gas].notna().sum()
            pct = n / len(wide_df) * 100
            print(f"  {gas:6s}: {n:6,} samples ({pct:.1f}%)")

    return wide_df, metadata


if __name__ == "__main__":
    wide_df, metadata = run_pipeline()
