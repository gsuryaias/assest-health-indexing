"""
DGA Configuration - Central constants, thresholds, and settings.

All thresholds and parameters are sourced from:
  [S1] IEEE C57.104-2019: Guide for Interpretation of Gases Generated in
       Mineral Oil-Immersed Transformers
  [S2] IEC 60599:2022: Mineral oil-filled electrical equipment in service -
       Guidance on the interpretation of dissolved and free gases analysis
  [S3] CIGRE Technical Brochure 771 (2019): Transformer Reliability Survey
  [4]  "Review of Transformer Health Index" - MDPI Electronics, 2023
"""

import os

# =============================================================================
# Paths
# =============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
MODELS_DIR = os.path.join(DATA_DIR, "models")
EXCEL_PATH = "/Users/praveenchand/Documents/Python experiments/PTR-DGA/PTR OIL SAPMLE TEST RESULTS DATA 23.03.2026 Final.xlsx"

# =============================================================================
# DGA Gas Names (canonical)
# =============================================================================
DGA_GASES = ["H2", "CH4", "C2H6", "C2H4", "C2H2", "CO", "CO2"]
COMBUSTIBLE_GASES = ["H2", "CH4", "C2H6", "C2H4", "C2H2", "CO"]

# Mapping from raw Excel test names to canonical names
TEST_NAME_MAP = {
    "Hydrogen (H2)": "H2",
    "Methane(CH4)": "CH4",
    "Ethane(C2H6)": "C2H6",
    "Ethylene(C2H4)": "C2H4",
    "Acetylene(C2H2)": "C2H2",
    "Carbon Monoxide (CO)": "CO",
    "Carbon Dioxide(CO2)": "CO2",
    "Total Dissolved Combustuible Gas (TDCG)": "TDCG",
    # Oil quality tests
    "B.D.V": "BDV",
    "Water content": "MOISTURE",
    "Resistivity  @ 90 °C": "RESISTIVITY",
    "Tan Delta @ 90 °C, 55Hz": "TAN_DELTA",
    "Acidity": "ACIDITY",
    "Inter Facial Tension": "IFT",
    # Furan compounds
    "2-furfuryl (2FAL)": "FURAN_2FAL",
    "Total Furon": "FURAN_TOTAL",
}

# Transformer metadata columns to retain
METADATA_COLS = [
    "Equipment No", "Equipment description", "Object Type", "MAKE",
    "Manufacturer Serial Number", "YOM", "DOC", "Voltage", "CAP",
    "PTR OIL CAPACITY", "Functional Location",
    "Description of functional location",
]

# =============================================================================
# IEEE C57.104-2019 Gas Concentration Thresholds (ppm)
# Table 1 (90th percentile) and Table 2 (95th percentile)
# Reference: [S1] IEEE C57.104-2019, Tables 1-2
#
# Status 1: Normal operation (below 90th percentile)
# Status 2: Possible gassing (90th to 95th percentile)
# Status 3: Probable active gassing (above 95th percentile)
# =============================================================================
IEEE_THRESHOLDS = {
    # Gas:  (Status1_max, Status2_max)  -- above Status2_max = Status 3
    "H2":   (100, 200),
    "CH4":  (120, 400),
    "C2H6": (65, 100),
    "C2H4": (50, 200),
    "C2H2": (1, 9),
    "CO":   (350, 570),
    "CO2":  (2500, 4000),
    "TDCG": (720, 1920),
}

# =============================================================================
# IEEE C57.104-2019 Rate of Change Thresholds (ppm/year)
# Table 4: 95th percentile rate analysis values
# Reference: [S1] IEEE C57.104-2019, Table 4
# =============================================================================
IEEE_RATE_THRESHOLDS = {
    "H2":   35,
    "CH4":  25,
    "C2H6": 15,
    "C2H4": 15,
    "C2H2": 2,
    "CO":   70,
    "CO2":  700,
}

# =============================================================================
# Fault Classification Taxonomy
# Unified labels from IEC 60599:2022 and IEEE C57.104-2019
# Reference: [S2] IEC 60599:2022, Table 1
# =============================================================================
FAULT_TYPES = {
    0: "Normal",
    1: "PD",    # Partial Discharge (corona)
    2: "D1",    # Low-energy discharge (sparking)
    3: "D2",    # High-energy discharge (arcing)
    4: "T1",    # Thermal fault < 300°C
    5: "T2",    # Thermal fault 300-700°C
    6: "T3",    # Thermal fault > 700°C
    7: "DT",    # Mixed discharge + thermal
}
FAULT_TYPE_NAMES = {v: k for k, v in FAULT_TYPES.items()}

# =============================================================================
# Health Index Weights
# Reference: [4] "Review of Transformer Health Index" - MDPI Electronics, 2023
#
# DGA Factor weights: Acetylene (C2H2) gets highest weight (5) because it
# indicates the most severe faults (arcing). CO/CO2 get lowest (1) as they
# indicate cellulose degradation, less immediately critical.
# =============================================================================
DGAF_WEIGHTS = {
    "H2":   2,
    "CH4":  3,
    "C2H6": 3,
    "C2H4": 3,
    "C2H2": 5,
    "CO":   1,
    "CO2":  1,
}

# Composite Health Index component weights
# DGA gets 50% as it is the most diagnostic [Paper 4]
CHI_WEIGHTS = {
    "DGAF":       0.50,
    "BDV":        0.15,
    "MOISTURE":   0.15,
    "ACIDITY":    0.10,
    "TAN_DELTA":  0.10,
}

# =============================================================================
# Oil Quality Thresholds
# Reference: [S1] IEEE C57.104-2019, IEC 60422:2013
# =============================================================================
OIL_QUALITY_THRESHOLDS = {
    # (Good, Fair, Poor) -- above Poor = Critical
    "BDV":        (60, 50, 40),       # kV: >60=Good, 50-60=Fair, 40-50=Poor, <40=Critical
    "MOISTURE":   (10, 20, 30),       # ppm: <10=Good, 10-20=Fair, 20-30=Poor, >30=Critical
    "ACIDITY":    (0.05, 0.10, 0.20), # mgKOH/g: <0.05=Good, 0.05-0.1=Fair, 0.1-0.2=Poor, >0.2=Critical
    "TAN_DELTA":  (0.10, 0.50, 1.00), # <0.1=Good, 0.1-0.5=Fair, 0.5-1.0=Poor, >1.0=Critical
}

# Risk levels for Composite Health Index (0-100 scale)
RISK_LEVELS = {
    "Excellent": (80, 100),
    "Good":      (60, 80),
    "Fair":      (40, 60),
    "Poor":      (20, 40),
    "Critical":  (0, 20),
}

# =============================================================================
# CIGRE TB 761 Condition Group — Fault Severity Ceiling
# Reference: CIGRE Technical Brochure 761 (2019) two-component model
#            IEC 60599:2022 fault severity hierarchy
#
# The Condition Group caps the risk level based on diagnosed fault type,
# regardless of the aggregate CHI score. This prevents severe faults
# (thermal >700°C, arcing) from being masked by low absolute gas levels.
# =============================================================================
FAULT_SEVERITY_CAP = {
    "Normal": "Excellent",   # No fault → no cap
    "PD":     "Good",        # Partial discharge (corona) — low energy
    "T1":     "Good",        # Thermal < 300°C — early-stage
    "D1":     "Fair",        # Low-energy discharge (sparking)
    "T2":     "Fair",        # Thermal 300-700°C — moderate overheating
    "DT":     "Poor",        # Combined discharge + thermal
    "D2":     "Poor",        # High-energy discharge (arcing)
    "T3":     "Poor",        # Thermal > 700°C — severe overheating
}

# Minimum consensus confidence (0-1) required before applying the fault-based
# ceiling. 0.6 = at least 6 of 10 weighted method votes must agree.
# Reference: CIGRE TB 761, §4.3 — confidence-gated condition assessment
CONDITION_CONFIDENCE_THRESHOLD = 0.6

# =============================================================================
# Rate-of-Change DGAF Penalty
# Reference: [5] "Modified Dissolved Gas Analysis Scoring Approach for
#            Transformer Health Evaluation Considering Delta and Rate Values"
#            MDPI Energies, 2024
#
# Per-gas penalty factor applied to DGAF when gas rates exceed IEEE C57.104-2019
# Table 4 rate thresholds. Maximum penalty = 35% DGAF reduction.
# =============================================================================
RATE_PENALTY_FACTOR = 0.05  # DGAF reduction per gas exceeding rate threshold

# =============================================================================
# Furan / Degree of Polymerization — Remaining Insulation Life (RUL)
# Reference: Chendong (1996) "Estimating the Age of Power Transformers by
#            Furan Concentration in Oil" — the standard 2-FAL/DP equation
# Reference: CIGRE WG A2.18 (2017) — end-of-life and condition criteria for DP
# Reference: IEC 60450:2004 — measurement of mean viscometric DP of cellulose
# Reference: IEEE C57.91-2011 §8.2 — furan analysis for aging assessment
#
# The Chendong equation correlates 2-FAL furan concentration in transformer
# oil to the Degree of Polymerization (DP) of the solid cellulose insulation.
# DP is the direct physical measure of cellulose chain integrity. Mechanical
# strength falls critically below DP 200, which is the accepted end-of-life.
#
#   Equation: log10(2FAL_ppb) = CHENDONG_A - CHENDONG_B × DP
#   Inverted: DP = (CHENDONG_A - log10(2FAL_ppb)) / CHENDONG_B
#
#   Remaining life % = (DP_current - DP_EOL) / (DP_new - DP_EOL) × 100
# =============================================================================
# Original Chendong equation uses 2-FAL in μg/g (ppm):  log10([μg/g]) = 1.51 - 0.0035×DP
# Our data column FURAN_2FAL is in ppb (μg/kg ≈ μg/L for transformer oil).
# Unit conversion: log10(ppb) = log10(μg/g) + log10(1000) = log10(μg/g) + 3
# → Adjusted A for ppb input: A = 1.51 + 3 = 4.51
FURAN_CHENDONG_A = 4.51    # Chendong A adjusted for ppb input (original 1.51 is for μg/g)
FURAN_CHENDONG_B = 0.0035  # Chendong constant B (unchanged)

FURAN_DP_NEW = 1000   # DP of new Kraft paper (typical range 1000–1100)
FURAN_DP_EOL = 200    # End-of-life threshold: DP ≤ 200 (CIGRE WG A2.18)

# DP condition thresholds → insulation condition label (CIGRE WG A2.18 Table 1)
# Key: minimum DP for that label (DP below threshold → next worse label)
FURAN_DP_THRESHOLDS = {
    "Excellent": 800,   # DP ≥ 800: new-like insulation, no concern
    "Good":      600,   # DP 600–800: moderate aging, normal monitoring
    "Fair":      400,   # DP 400–600: significant aging, increase test frequency
    "Poor":      300,   # DP 300–400: advanced aging, plan refurbishment
    # DP < 300: Critical — near end-of-life, urgent action required
}

# =============================================================================
# Model Training Parameters
# =============================================================================
RANDOM_STATE = 42
TEST_SIZE = 0.2

# XGBoost defaults for fault classification [Paper 2]
XGBOOST_FAULT_PARAMS = {
    "objective": "multi:softprob",
    "num_class": 8,
    "n_estimators": 300,
    "max_depth": 6,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "eval_metric": "mlogloss",
    "random_state": RANDOM_STATE,
    "n_jobs": -1,
}

# XGBoost defaults for health index regression
XGBOOST_HEALTH_PARAMS = {
    "objective": "reg:squarederror",
    "n_estimators": 300,
    "max_depth": 5,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "random_state": RANDOM_STATE,
    "n_jobs": -1,
}

# XGBoost defaults for failure prediction
XGBOOST_FAILURE_PARAMS = {
    "objective": "binary:logistic",
    "n_estimators": 300,
    "max_depth": 5,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "eval_metric": "aucpr",
    "random_state": RANDOM_STATE,
    "n_jobs": -1,
}
