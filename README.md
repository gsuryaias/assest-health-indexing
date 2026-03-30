# AP Transco DGA — Transformer Health Assessment System

A research-backed Dissolved Gas Analysis (DGA) system for AP Transco's power transformer fleet. Three XGBoost models trained on 315,419 oil test records from 1,260 transformers across 357 substations (2018–2026), with a React dashboard for operational decision-making.

**Author:** [Surya Praveenchand, IAS — JMD AP Transco](https://www.linkedin.com/in/praveenchandgss)

---

## Key Capabilities

- **Fault Classification** — 8-class XGBoost classifier (99.6% accuracy) using consensus voting from 5 traditional DGA methods (Duval Triangle, Duval Pentagon, IEC 60599 Ratios, Rogers Ratios, Key Gas)
- **Composite Health Index** — Weighted scoring (CHI 0–100) combining DGAF gas scoring with oil quality parameters, enhanced with rate-of-change penalty and CIGRE TB 761 fault-severity ceiling
- **Failure Prediction** — Binary temporal model (93.4% accuracy, AUC-ROC 0.86) predicting whether gases will exceed IEEE Status 3 at the next test
- **Interactive Dashboard** — React + Tailwind dashboard with fleet overview, drill-down from substations to individual transformers, gas trend charts with IEEE threshold lines, and printable reports

## Standards & Research

| Standard / Paper | Usage |
|-----------------|-------|
| IEEE C57.104-2019 | Gas thresholds (Status 1/2/3), rate-of-change limits, Rogers ratios |
| IEC 60599:2022 | Fault taxonomy (PD/D1/D2/T1/T2/T3/DT), Duval Triangle zones, IEC ratios |
| CIGRE TB 771 (2019) | Duval Pentagon centroid-based classification |
| CIGRE TB 761 (2019) | Two-component health model — fault severity ceiling on risk level |
| Paper 4 — MDPI Electronics 2023 | DGAF weighting scheme and CHI composite formula |
| Paper 5 — MDPI Energies 2024 | Rate-of-change DGAF penalty for early fault detection |
| Paper 7 — Arabian J. Sci. Eng. 2025 | SMOTE + gradient boosting for imbalanced DGA datasets |

---

## Project Structure

```
PTR-DGA/
├── pyproject.toml                 # Python dependencies (managed by uv)
├── dga_config.py                  # Central config: IEEE thresholds, gas weights, model params
├── run_phase_a.py                 # Master script: runs full pipeline end-to-end
│
├── dga_pipeline/                  # Data processing pipeline
│   ├── data_pipeline.py           # Excel → clean → pivot (315K rows → 11,932 wide-format)
│   ├── traditional_methods.py     # 5 DGA methods: Duval Triangle/Pentagon, IEC, Rogers, Key Gas
│   ├── label_generator.py         # Consensus fault labeling (weighted voting from 5 methods)
│   ├── feature_engineering.py     # 58 features in 7 groups (A–G)
│   ├── health_index_calculator.py # DGAF + CHI + rate penalty + CIGRE condition group
│   └── time_series_features.py    # 125 temporal features for failure prediction
│
├── dga_training/                  # ML model training
│   ├── train_fault_classifier.py  # Model 1: XGBoost 8-class + SMOTE
│   ├── train_health_index.py      # Model 2: XGBoost regression
│   └── train_failure_predictor.py # Model 3: XGBoost binary temporal
│
├── data/
│   ├── processed/
│   │   └── dga_labeled.csv        # 11,932 rows × 55 columns (main dataset)
│   └── models/                    # Trained model .pkl files + metrics JSON
│
├── dashboard/                     # React + Tailwind dashboard
│   ├── package.json               # React 19, Recharts, React Router, Tailwind 4
│   ├── vite.config.js             # Vite build configuration
│   ├── public/data/               # Pre-generated JSON (from prepare_dashboard_data.py)
│   ├── scripts/
│   │   └── prepare_dashboard_data.py  # CSV → JSON preprocessing
│   └── src/
│       ├── App.jsx                # Routes and layout
│       ├── pages/                 # FleetOverview, TransformerDetail, Analytics, etc.
│       ├── components/            # Charts, tables, filters, shared UI
│       └── constants/             # IEEE thresholds, colors, fault descriptions
│
├── reports/                       # Report generation scripts
│   ├── generate_docx.py           # Word report with risk reasons
│   ├── generate_xlsx.py           # 5-sheet Excel annexure
│   └── report_helpers.py          # Shared utilities
│
└── PTR OIL SAMPLE TEST RESULTS DATA 23.03.2026 Final.xlsx  # Raw source data
```

---

## Prerequisites

- **Python 3.13+** with [uv](https://docs.astral.sh/uv/) package manager
- **Node.js 18+** with npm

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd PTR-DGA
```

### 2. Install Python dependencies

```bash
uv sync
```

This installs all dependencies from `pyproject.toml` into a local `.venv/`:
pandas, openpyxl, python-docx, xgboost, scikit-learn, imbalanced-learn

### 3. Install dashboard dependencies

```bash
cd dashboard
npm install
cd ..
```

---

## Running the Pipeline

### Full ML pipeline (training all 3 models)

```bash
uv run run_phase_a.py
```

This runs all 9 steps sequentially:
1. Data pipeline — Excel ingestion, cleaning, pivot to wide format
2. Traditional DGA methods — Duval Triangle/Pentagon, IEC ratios, Rogers, Key Gas
3. Consensus labeling — Weighted voting across 5 methods
4. Feature engineering — 58 features in 7 groups
5. Health index — DGAF + rate-of-change penalty + CHI + CIGRE condition group override
6. Time-series features — 125 temporal features
7. Train fault classifier (Model 1)
8. Train health index regressor (Model 2)
9. Train failure predictor (Model 3)

**Runtime:** ~70 seconds on Apple M4 Max

### Regenerate dashboard data (after pipeline)

```bash
uv run dashboard/scripts/prepare_dashboard_data.py
```

Converts `dga_labeled.csv` into 6 optimized JSON files in `dashboard/public/data/`.

### Generate reports

```bash
uv run reports/generate_xlsx.py    # Excel report with risk reasons
uv run reports/generate_docx.py    # Word report
```

---

## Running the Dashboard

### Development server

```bash
cd dashboard
npm run dev
```

Opens at **http://localhost:5174** with hot reload.

### Production build

```bash
cd dashboard
npm run build
```

Outputs static files to `dashboard/dist/`.

---

## Deployment

### Option 1: Static file hosting (simplest)

The dashboard is a fully static single-page application (SPA). After building:

```bash
cd dashboard
npm run build
```

Deploy the `dist/` folder to any static hosting:

- **Nginx** — Copy `dist/` contents to the web root. Add SPA fallback:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```

- **Apache** — Copy `dist/` contents to the web root. Add `.htaccess`:
  ```apache
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
  ```

- **AWS S3 + CloudFront** — Upload `dist/` to S3 bucket, configure CloudFront with error page redirect to `/index.html`.

- **GitHub Pages / Netlify / Vercel** — Push `dist/` folder or configure the build command as `cd dashboard && npm run build` with output directory `dashboard/dist`.

### Option 2: Serve locally with npx

```bash
cd dashboard
npm run build
npx serve dist
```

Opens at **http://localhost:3000**. The `serve` package handles SPA routing automatically.

### Option 3: Pre-built distributable

A pre-built zip is available:

```bash
unzip aptransco-dga-dashboard.zip -d dashboard-dist
cd dashboard-dist
npx serve .
```

### Important notes for deployment

- The dashboard is **fully client-side** — no backend server required. All data is pre-computed in the JSON files under `public/data/`.
- To update data: run the Python pipeline, regenerate dashboard JSON, rebuild the dashboard, and redeploy.
- The `dist/` folder is ~772 KB (compressed), suitable for any hosting environment.
- SPA routing requires the server to redirect all routes to `index.html` (handled by the configurations above).

---

## Three ML Models

| Model | Type | Target | Performance | Key Details |
|-------|------|--------|-------------|-------------|
| Fault Classifier | XGBoost multi-class | 8 IEC 60599 fault types | 99.6% weighted F1 | SMOTE for class imbalance, 58 features |
| Health Index | XGBoost regression | CHI score (0–100) | R²=0.93, MAE=3.13 | Rate-penalized DGAF target |
| Failure Predictor | XGBoost binary | Exceed IEEE Status 3? | 93.4% acc, AUC 0.86 | Temporal train/test split, 125 features |

## Health Index Formula

```
CHI = 50% x DGAF + 15% x BDV + 15% x Moisture + 10% x Acidity + 10% x Tan Delta
```

Enhanced with:
- **Rate-of-change penalty** (Paper 5) — DGAF penalized when gas rates exceed IEEE C57.104-2019 Table 4 thresholds
- **CIGRE TB 761 condition group** — Fault severity caps the risk level (e.g., T3 fault caps at "Poor" regardless of CHI score)

## Risk Levels

| Level | CHI Range | Action |
|-------|-----------|--------|
| Excellent | 80–100 | Normal operation, no action |
| Good | 60–80 | Continue monitoring |
| Fair | 40–60 | Increase testing frequency |
| Poor | 20–40 | Plan maintenance |
| Critical | 0–20 | Immediate attention |

---

## Data

- **Source:** 315,419 oil test records from AP Transco (2018–2026)
- **Transformers:** 1,260 across 357 substations
- **Processed dataset:** 11,932 wide-format samples with 55 columns
- **Voltage classes:** 132 kV, 220 kV, 400 kV

---

*Proof of concept by [Surya Praveenchand, IAS — JMD AP Transco](https://www.linkedin.com/in/praveenchandgss)*
