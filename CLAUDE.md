# AP Transco DGA Transformer Health Assessment System

## Project Overview

A research-backed (2023-2026 papers) Dissolved Gas Analysis (DGA) system for AP Transco's power transformer fleet. Three ML models trained locally on M4 Max, with a React dashboard for decision-making and Python scripts for report generation.

**Owner**: Praveen Chand (AP Transco)
**Data**: 315,419 oil test records from 1,260 transformers across 357 substations (2018-2026)
**Standards**: IEEE C57.104-2019, IEC 60599:2022, CIGRE TB 771, IEC 60422

---

## Project Root

```
/Users/praveenchand/Documents/Python experiments/PTR-DGA/
```

## Directory Structure

```
PTR-DGA/
├── pyproject.toml                 # Python deps (uv): pandas, openpyxl, python-docx, xgboost, scikit-learn, imbalanced-learn
├── .venv/                         # Python 3.13 venv managed by uv
├── dga_config.py                  # Central config: IEEE thresholds, gas weights, model params, paths
├── run_phase_a.py                 # Master script: runs full pipeline end-to-end
│
├── dga_pipeline/                  # Data processing pipeline
│   ├── data_pipeline.py           # Excel → clean → pivot (315K rows → 11,932 wide-format)
│   ├── traditional_methods.py     # 5 DGA methods: Duval Triangle/Pentagon, IEC ratio, Rogers, Key Gas
│   ├── label_generator.py         # Consensus fault labeling (weighted voting from 5 methods)
│   ├── feature_engineering.py     # 58 features in 7 groups (A-G)
│   ├── health_index_calculator.py # DGAF + Composite Health Index (CHI 0-100)
│   └── time_series_features.py    # 125 temporal features for failure prediction
│
├── dga_training/                  # ML model training
│   ├── train_fault_classifier.py  # Model 1: XGBoost 8-class + SMOTE (99.6% acc)
│   ├── train_health_index.py      # Model 2: XGBoost regression (R²=0.992)
│   └── train_failure_predictor.py # Model 3: XGBoost binary temporal (93.4% acc, AUC 0.86)
│
├── data/
│   ├── processed/
│   │   ├── dga_labeled.csv        # 11,932 rows × 45 columns (main dataset)
│   │   └── dga_wide_format.csv    # Intermediate wide-format
│   └── models/
│       ├── fault_classifier.pkl / _metrics.json / _features.json
│       ├── health_index.pkl / _metrics.json
│       └── failure_predictor.pkl / _metrics.json
│
├── dashboard/                     # React + Tailwind dashboard
│   ├── package.json               # Deps: react, recharts, react-router-dom, tailwindcss, lucide-react
│   ├── vite.config.js             # Vite + React + Tailwind
│   ├── public/data/               # Pre-generated JSON (from prepare_dashboard_data.py)
│   │   ├── fleet_summary.json     # KPIs
│   │   ├── substations.json       # 357 substations with risk/fault distribution
│   │   ├── transformers.json      # 1,260 transformers with gas_status, risk_explanation, methods
│   │   ├── transformer_history.json # Time-series per equipment (lazy-loaded, ~3.4 MB)
│   │   ├── model_metrics.json     # Merged model performance
│   │   └── filters.json           # Dropdown options
│   ├── scripts/
│   │   └── prepare_dashboard_data.py  # CSV → JSON preprocessing (recomputes health index)
│   └── src/
│       ├── App.jsx                # Routes: /, /substation/:id, /transformer/:id, /models, /methodology, /analytics, /report/:id, /fleet-report
│       ├── context/DashboardContext.jsx  # Global state: fleet, substations, transformers, models, filters, history, activeFilters, error
│       ├── pages/
│       │   ├── FleetOverview.jsx      # KPIs + risk bar + charts + Substations/Transformers toggle + filters
│       │   ├── SubstationView.jsx     # Drill-down: substation → transformer list
│       │   ├── TransformerDetail.jsx  # Full diagnostic: CHI, fault, DGAF, risk explanation, gas trends, oil quality, methods, history
│       │   ├── Analytics.jsx          # Manufacturer/voltage/age analysis with drill-down panels
│       │   ├── ModelPerformance.jsx   # Per-class metrics, feature importance charts
│       │   ├── Methodology.jsx        # 10-section docs: glossary, pipeline, labeling, features, CHI, models, papers, standards
│       │   ├── Report.jsx             # Printable single-transformer report (window.print())
│       │   └── FleetReport.jsx        # Printable fleet summary report
│       ├── components/
│       │   ├── layout/   Sidebar.jsx, TopBar.jsx (breadcrumbs)
│       │   ├── cards/    KPICard.jsx (onClick, active support)
│       │   ├── charts/   FaultDonutChart.jsx (legend toggle, drill-down), RiskDistributionBar.jsx, AgeHealthScatter.jsx (click→navigate), GasTrendChart.jsx (IEEE thresholds), FeatureImportanceChart.jsx
│       │   ├── tables/   SubstationTable.jsx, TransformerTable.jsx (with Substation + Reason columns, CSV export)
│       │   ├── filters/  FilterBar.jsx (search, voltage, risk, fault + active pills + match count)
│       │   └── shared/   RiskBadge.jsx, FaultBadge.jsx, LoadingSpinner.jsx, TransformerListPanel.jsx (reusable drill-down)
│       ├── constants/    colors.js (risk/fault/gas colors), thresholds.js (IEEE thresholds, fault descriptions)
│       └── utils/        formatters.js, exportCsv.js, riskReason.js (buildShortReason, buildRiskReason)
│
├── reports/                       # Report generation scripts
│   ├── generate_docx.py           # DOCX report with risk reasons
│   ├── generate_xlsx.py           # 5-sheet XLSX annexure with risk reasons
│   └── report_helpers.py          # Shared: build_risk_reason(), load data
│
├── aptransco-dga-dashboard.zip    # Distributable static build (772 KB)
│
└── PTR OIL SAPMLE TEST RESULTS DATA 23.03.2026 Final.xlsx  # Raw source data (46 MB)
```

---

## How to Run

### Python pipeline (uses uv)
```bash
cd "/Users/praveenchand/Documents/Python experiments/PTR-DGA"
uv run run_phase_a.py                              # Full ML pipeline
uv run dashboard/scripts/prepare_dashboard_data.py  # Regenerate dashboard JSON
uv run reports/generate_xlsx.py                     # Generate Excel report
uv run reports/generate_docx.py                     # Generate Word report
```

### Dashboard (React)
```bash
cd "/Users/praveenchand/Documents/Python experiments/PTR-DGA/dashboard"
npm run dev          # Dev server at http://localhost:5174
npm run build        # Production build → dist/
```

### Preview server config (Claude Code)
The launch.json is at the sage-maket-test working directory:
```
/Users/praveenchand/Documents/Python experiments/training/sage-maket-test/.claude/launch.json
```
Config: `npm run dev --prefix /Users/praveenchand/Documents/Python experiments/PTR-DGA/dashboard` on port 5174.

---

## Three ML Models

| Model | Type | Target | Accuracy | Key Detail |
|-------|------|--------|----------|------------|
| 1. Fault Classifier | XGBoost multi-class | 8 fault types (IEC 60599) | 99.6% weighted F1 | SMOTE for class imbalance, 58 features, only 5+ gas samples |
| 2. Health Index | XGBoost regression | CHI score (0-100) | R²=0.992, MAE=0.48 | Deterministic target from DGAF + oil quality formula |
| 3. Failure Predictor | XGBoost binary | Will gas exceed IEEE Status 3? | 93.4% acc, AUC 0.86 | Temporal train/test split (no leakage), 125 temporal features |

## Composite Health Index (CHI) Formula

```
CHI = 50% × DGAF + 15% × BDV + 15% × Moisture + 10% × Acidity + 10% × Tan Delta
```
- DGAF: Weighted gas scoring (C2H2×5, CH4/C2H6/C2H4×3, H2×2, CO/CO2×1) normalized 0-10
- Risk levels: 80-100 Excellent, 60-80 Good, 40-60 Fair, 20-40 Poor, 0-20 Critical

## IEEE C57.104-2019 Gas Thresholds

```
H2: 100/200, CH4: 120/400, C2H6: 65/100, C2H4: 50/200,
C2H2: 1/9, CO: 350/570, CO2: 2500/4000, TDCG: 720/1920
```
Format: Status1_max / Status2_max (ppm). Above Status2 = Status 3 (warning).

## IEC 60599:2022 Fault Types

Normal, PD (Partial Discharge), D1 (Low-energy Discharge), D2 (High-energy Discharge),
T1 (Thermal <300°C), T2 (Thermal 300-700°C), T3 (Thermal >700°C), DT (Discharge+Thermal)

---

## Dashboard Features

- **Fleet Overview**: KPIs, risk distribution bar, fault donut (with legend toggle), age-health scatter (click→transformer), Substations/Transformers view toggle, unified search + filters with active pills
- **Drill-down everywhere**: Substation→Transformer→Detail, chart segments→inline TransformerListPanel, manufacturer bars→transformer list, voltage cards→transformer list, age buckets→transformer list
- **Transformer Detail**: CHI card, fault diagnosis with confidence, DGAF, risk explanation ("Why is this rated Poor?"), diagnosis methods (5/5 applied with missing gas explanations), gas trend chart with IEEE threshold lines, oil quality, sample history
- **Analytics**: Manufacturer performance (sortable by fleet size/health/fault rate/poor count), voltage class comparison, age-based degradation, worst performers table
- **Model Performance**: Per-class precision/recall/F1, feature importance charts for all 3 models
- **Methodology**: 10 sections with hyperlinked technical terms (XGBoost, SMOTE, R², AUC-ROC→papers/Wikipedia), fault type glossary, CHI formula, research paper DOI links, IEEE/IEC standard links
- **Reports**: Print-optimized Report.jsx (single transformer) and FleetReport.jsx (fleet summary), both with window.print()
- **Export**: CSV export on all tables (top-right button), DOCX/XLSX report generation scripts

## Risk Explanation

Each transformer has `risk_explanation` in the JSON with `gas_alerts` and `oil_alerts` arrays. Each alert has `msg` (human-readable), `severity` (high/medium), `value`, `threshold`. The `riskReason.js` utility builds short/full reason strings for display and export. Most Poor transformers are due to high moisture (>30 ppm per IEC 60422).

---

## Known Issues / Pending Work

1. **Data freshness**: No staleness indicator — a transformer sampled in 2021 still shows current risk. IEEE recommends Status 3 units be re-tested monthly. Need to add freshness badge and flag overdue transformers.
2. **Phase B (SageMaker)**: Training scripts not yet ported to AWS SageMaker. User has credentials (eu-north-1, account 511192439009, role arn:aws:iam::511192439009:role/SageMakerExecutionRole).
3. **Oil quality thresholds**: Custom values for AP Transco, not directly from IEC 60422. Documented in Methodology but could be made configurable.
4. **Distributable build**: `aptransco-dga-dashboard.zip` (772 KB) exists but needs `npx serve dist/` for SPA routing. React Router hash-mode would simplify static deployment.

## Research Papers Cited

1. ML-based multi-method DGA interpretation (PMC/ScienceDirect, 2024)
2. Fault Classification via DGA and ML: Systematic Review (MDPI Applied Sciences, 2025)
3. Duval Pentagon evaluation (Springer Electrical Engineering, 2025)
4. Transformer Health Index review (MDPI Electronics, 2023)
5. Modified DGA Scoring with rate values (MDPI Energies, 2024)
6. SHAP + LGBM for DGA (Energy Informatics/Springer, 2025)
7. SMOTE + GBDT Hybrid for DGA (Arabian J. Sci. Eng., 2025)

Standards: [S1] IEEE C57.104-2019, [S2] IEC 60599:2022, [S3] CIGRE TB 771 (2019)
