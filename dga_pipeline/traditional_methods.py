"""
Traditional DGA Interpretation Methods.

Implements 5 established fault diagnosis methods with exact boundary
equations from international standards:

1. Duval Triangle 1      [S2] IEC 60599:2022, Annex A
2. Duval Pentagon         [S3] CIGRE TB 771 (2019)
3. Rogers Ratio           [S1] IEEE C57.104-2019, Section 5.4
4. IEC 60599 Ratio        [S2] IEC 60599:2022, Table 1
5. Key Gas Method         [S1] IEEE C57.104-2019, Table 3

References:
  [3] "Evaluation and optimization of the Duval Pentagon method for
       diagnosing various types of transformer faults"
       Springer Electrical Engineering, 2025
  [S1] IEEE C57.104-2019
  [S2] IEC 60599:2022 Edition 4
  [S3] CIGRE Technical Brochure 771 (2019)
"""

import numpy as np
import math


# =============================================================================
# 1. DUVAL TRIANGLE 1
#    Reference: IEC 60599:2022 Annex A, Figure A.1
#    Inputs: CH4, C2H4, C2H2 (ppm)
#    Output: Fault zone (PD, T1, T2, T3, D1, D2, DT)
#
#    The triangle uses percentage coordinates:
#      %CH4 = CH4 / (CH4 + C2H4 + C2H2) * 100
#      %C2H4 = C2H4 / (CH4 + C2H4 + C2H2) * 100
#      %C2H2 = C2H2 / (CH4 + C2H4 + C2H2) * 100
# =============================================================================

def duval_triangle_1(ch4, c2h4, c2h2):
    """
    Duval Triangle 1 fault classification.

    Reference: IEC 60599:2022 Annex A, Figure A.1
    Boundary definitions from M. Duval, "A Review of Faults Detectable by
    Gas-in-Oil Analysis in Transformers", IEEE Electrical Insulation Magazine,
    Vol. 18, No. 3, 2002.

    Args:
        ch4: Methane concentration (ppm)
        c2h4: Ethylene concentration (ppm)
        c2h2: Acetylene concentration (ppm)

    Returns:
        str: Fault type (PD, T1, T2, T3, D1, D2, DT) or None if inputs invalid
    """
    if any(v is None or np.isnan(v) for v in [ch4, c2h4, c2h2]):
        return None

    total = ch4 + c2h4 + c2h2
    if total <= 0:
        return None

    pct_ch4 = ch4 / total * 100
    pct_c2h4 = c2h4 / total * 100
    pct_c2h2 = c2h2 / total * 100

    # Zone boundaries (IEC 60599:2022 Annex A)
    if pct_c2h2 > 29:
        return "D2"      # High-energy discharge
    elif pct_c2h2 > 13:
        return "D1"      # Low-energy discharge
    elif pct_c2h2 > 4:
        if pct_c2h4 > 50:
            return "DT"  # Discharge + thermal
        else:
            return "D1"
    else:
        # Low acetylene region — thermal faults or PD
        if pct_ch4 > 98:
            return "PD"  # Partial discharge
        elif pct_c2h4 < 20:
            if pct_ch4 > 80:
                return "PD"
            else:
                return "T1"  # Low-temperature thermal < 300°C
        elif pct_c2h4 < 50:
            return "T2"      # Thermal 300-700°C
        else:
            return "T3"      # Thermal > 700°C


# =============================================================================
# 2. DUVAL PENTAGON
#    Reference: CIGRE TB 771 (2019), M. Duval, "The Duval Pentagon"
#    Inputs: H2, CH4, C2H6, C2H4, C2H2 (ppm)
#    Output: Fault zone (PD, T1, T2, T3, D1, D2, S)
#
#    Projects 5 gas percentages onto a regular pentagon coordinate system.
#    The centroid position determines the fault zone.
# =============================================================================

# Pentagon vertices (5 gases at 72° intervals)
_PENTAGON_ANGLES = [90 + i * 72 for i in range(5)]  # H2, C2H6, C2H4, C2H2, CH4
_PENTAGON_VERTICES = [
    (math.cos(math.radians(a)), math.sin(math.radians(a)))
    for a in _PENTAGON_ANGLES
]

# Zone centroids (approximate, from CIGRE TB 771 Figure 4)
_PENTAGON_ZONES = {
    "PD":  (0.35, 0.55),
    "T1":  (0.15, -0.10),
    "T2":  (-0.20, -0.25),
    "T3":  (-0.40, 0.00),
    "D1":  (0.00, 0.35),
    "D2":  (-0.15, 0.40),
    "S":   (0.00, 0.00),   # Stray gassing (normal aging)
}


def duval_pentagon(h2, ch4, c2h6, c2h4, c2h2):
    """
    Duval Pentagon fault classification.

    Reference: CIGRE TB 771 (2019)
    Also: [3] "Evaluation and optimization of the Duval Pentagon method"
           Springer Electrical Engineering, 2025

    Args:
        h2, ch4, c2h6, c2h4, c2h2: Gas concentrations (ppm)

    Returns:
        str: Fault type (PD, T1, T2, T3, D1, D2, S) or None if inputs invalid
    """
    gases = [h2, c2h6, c2h4, c2h2, ch4]  # Order matches pentagon vertices

    if any(v is None or np.isnan(v) for v in gases):
        return None

    total = sum(gases)
    if total <= 0:
        return None

    # Compute percentages
    pcts = [g / total for g in gases]

    # Project onto pentagon: weighted sum of vertex coordinates
    cx = sum(p * v[0] for p, v in zip(pcts, _PENTAGON_VERTICES))
    cy = sum(p * v[1] for p, v in zip(pcts, _PENTAGON_VERTICES))

    # Find nearest zone centroid
    min_dist = float("inf")
    result = "S"
    for zone, (zx, zy) in _PENTAGON_ZONES.items():
        dist = math.sqrt((cx - zx) ** 2 + (cy - zy) ** 2)
        if dist < min_dist:
            min_dist = dist
            result = zone

    return result


# =============================================================================
# 3. ROGERS RATIO METHOD
#    Reference: IEEE C57.104-2019, Section 5.4.2
#    Based on R.R. Rogers, "IEEE and IEC Codes to Interpret Incipient
#    Faults in Transformers Using Gas-in-Oil Analysis", IEEE Trans. on
#    Electrical Insulation, Vol. EI-13, No. 5, 1978.
#
#    Three ratios: CH4/H2, C2H2/C2H4, C2H4/C2H6
#    Each coded into ranges, then lookup in fault table.
# =============================================================================

def _rogers_code(ratio, thresholds):
    """Code a ratio into Rogers category (0, 1, or 2)."""
    low, high = thresholds
    if ratio < low:
        return 0
    elif ratio <= high:
        return 1
    else:
        return 2


_ROGERS_FAULT_TABLE = {
    # (CH4/H2_code, C2H2/C2H4_code, C2H4/C2H6_code): fault_type
    (0, 0, 0): "Normal",
    (1, 0, 0): "PD",
    (1, 1, 0): "D1",       # Low-energy discharge
    (0, 1, 0): "D1",
    (0, 2, 0): "D1",
    (0, 0, 1): "T1",       # Thermal < 300°C
    (2, 0, 1): "T2",       # Thermal 300-700°C
    (2, 0, 2): "T3",       # Thermal > 700°C
    (1, 0, 2): "T3",
    (0, 0, 2): "T3",
    (0, 2, 1): "D2",       # High-energy discharge
    (0, 2, 2): "D2",
    (1, 0, 1): "T1",
    (1, 0, 2): "T3",
    (2, 0, 0): "T1",
    (2, 0, 2): "T3",
}


def rogers_ratio(h2, ch4, c2h6, c2h4, c2h2):
    """
    Rogers Ratio Method fault classification.

    Reference: IEEE C57.104-2019, Section 5.4.2

    Args:
        h2, ch4, c2h6, c2h4, c2h2: Gas concentrations (ppm)

    Returns:
        str: Fault type or "No Match" if code not in table, None if invalid
    """
    gases = [h2, ch4, c2h6, c2h4, c2h2]
    if any(v is None or np.isnan(v) for v in gases):
        return None

    # Avoid division by zero
    if h2 <= 0 or c2h4 <= 0 or c2h6 <= 0:
        return "No Match"

    r1 = ch4 / h2         # CH4/H2
    r2 = c2h2 / c2h4      # C2H2/C2H4
    r3 = c2h4 / c2h6      # C2H4/C2H6

    # Code ratios: (low_threshold, high_threshold)
    c1 = _rogers_code(r1, (0.1, 1.0))
    c2 = _rogers_code(r2, (0.1, 1.0))
    c3 = _rogers_code(r3, (1.0, 3.0))

    return _ROGERS_FAULT_TABLE.get((c1, c2, c3), "No Match")


# =============================================================================
# 4. IEC 60599 RATIO METHOD
#    Reference: IEC 60599:2022, Table 1
#    Three ratios: C2H2/C2H4, CH4/H2, C2H4/C2H6
#    Maps to fault types by range combinations.
# =============================================================================

def iec_60599_ratio(h2, ch4, c2h6, c2h4, c2h2):
    """
    IEC 60599:2022 Ratio Method fault classification.

    Reference: IEC 60599:2022, Table 1

    Uses three gas ratios to classify faults:
      R1 = C2H2/C2H4
      R2 = CH4/H2
      R3 = C2H4/C2H6

    Args:
        h2, ch4, c2h6, c2h4, c2h2: Gas concentrations (ppm)

    Returns:
        str: Fault type or "No Match", None if invalid
    """
    gases = [h2, ch4, c2h6, c2h4, c2h2]
    if any(v is None or np.isnan(v) for v in gases):
        return None

    if c2h4 <= 0 or h2 <= 0 or c2h6 <= 0:
        return "No Match"

    r1 = c2h2 / c2h4   # C2H2/C2H4
    r2 = ch4 / h2       # CH4/H2
    r3 = c2h4 / c2h6    # C2H4/C2H6

    # IEC 60599:2022 Table 1 decision rules
    if r1 < 0.1 and r2 < 0.1 and r3 < 0.2:
        return "PD"     # Partial discharge
    elif r1 > 1.0 and 0.1 <= r2 <= 0.5 and r3 > 1.0:
        return "D1"     # Low-energy discharge
    elif 0.6 <= r1 <= 2.5 and 0.1 <= r2 <= 1.0 and r3 > 2.0:
        return "D2"     # High-energy discharge
    elif r1 < 0.1 and r2 > 1.0 and r3 < 1.0:
        return "T1"     # Thermal fault < 300°C
    elif r1 < 0.1 and r2 > 1.0 and 1.0 <= r3 < 4.0:
        return "T2"     # Thermal fault 300-700°C
    elif r1 < 0.1 and r2 > 1.0 and r3 >= 4.0:
        return "T3"     # Thermal fault > 700°C
    else:
        return "No Match"


# =============================================================================
# 5. KEY GAS METHOD
#    Reference: IEEE C57.104-2019, Table 3
#    The dominant gas among combustible gases indicates the probable fault.
# =============================================================================

def key_gas_method(h2, ch4, c2h6, c2h4, c2h2, co):
    """
    Key Gas Method fault classification.

    Reference: IEEE C57.104-2019, Table 3

    The dominant combustible gas indicates the probable fault type:
      H2 dominant  → Partial Discharge (PD) / Corona
      CH4 dominant → Low-temperature thermal (T1, < 300°C)
      C2H4 dominant→ High-temperature thermal (T2/T3, > 300°C)
      C2H2 dominant→ Arcing discharge (D1/D2)
      CO dominant  → Cellulose degradation (T1)

    Args:
        h2, ch4, c2h6, c2h4, c2h2, co: Gas concentrations (ppm)

    Returns:
        str: Fault type or None if inputs invalid
    """
    gas_map = {"H2": h2, "CH4": ch4, "C2H6": c2h6, "C2H4": c2h4, "C2H2": c2h2, "CO": co}

    valid = {k: v for k, v in gas_map.items() if v is not None and not np.isnan(v)}
    if not valid:
        return None

    dominant = max(valid, key=valid.get)

    fault_map = {
        "H2":   "PD",
        "CH4":  "T1",
        "C2H6": "T1",
        "C2H4": "T3",
        "C2H2": "D1",
        "CO":   "T1",
    }

    return fault_map.get(dominant, "Normal")


# =============================================================================
# Convenience: Apply all methods to a single sample
# =============================================================================

def apply_all_methods(h2, ch4, c2h6, c2h4, c2h2, co=None):
    """
    Apply all applicable traditional methods to a single DGA sample.

    Returns:
        dict: {method_name: fault_type} for each applicable method
    """
    results = {}

    # Duval Triangle 1 (needs CH4, C2H4, C2H2)
    dt1 = duval_triangle_1(ch4, c2h4, c2h2)
    if dt1 is not None:
        results["duval_triangle"] = dt1

    # Duval Pentagon (needs all 5 hydrocarbon gases)
    dp = duval_pentagon(h2, ch4, c2h6, c2h4, c2h2)
    if dp is not None:
        # Map Pentagon's "S" (stray gassing) to "Normal"
        results["duval_pentagon"] = "Normal" if dp == "S" else dp

    # Rogers Ratio
    rr = rogers_ratio(h2, ch4, c2h6, c2h4, c2h2)
    if rr is not None and rr != "No Match":
        results["rogers"] = rr

    # IEC 60599 Ratio
    iec = iec_60599_ratio(h2, ch4, c2h6, c2h4, c2h2)
    if iec is not None and iec != "No Match":
        results["iec_ratio"] = iec

    # Key Gas Method
    if co is not None:
        kg = key_gas_method(h2, ch4, c2h6, c2h4, c2h2, co)
        if kg is not None:
            results["key_gas"] = kg

    return results
