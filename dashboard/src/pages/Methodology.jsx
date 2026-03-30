import { BookOpen, Database, Brain, BarChart3, FlaskConical, Shield, ExternalLink, Tag } from 'lucide-react';

// Reusable hyperlinked technical term
function T({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="text-blue-600 hover:underline font-medium border-b border-blue-200 border-dashed">
      {children}
    </a>
  );
}

// Technical term URLs
const LINKS = {
  xgboost: 'https://arxiv.org/abs/1603.02754',
  smote: 'https://arxiv.org/abs/1106.1813',
  shap: 'https://arxiv.org/abs/1705.07874',
  dga: 'https://en.wikipedia.org/wiki/Dissolved_gas_analysis',
  duvalTriangle: 'https://en.wikipedia.org/wiki/Duval_triangle',
  r2: 'https://en.wikipedia.org/wiki/Coefficient_of_determination',
  rmse: 'https://en.wikipedia.org/wiki/Root_mean_square_deviation',
  auroc: 'https://en.wikipedia.org/wiki/Receiver_operating_characteristic#Area_under_the_curve',
  f1score: 'https://en.wikipedia.org/wiki/F-score',
  stratifiedSplit: 'https://scikit-learn.org/stable/modules/cross_validation.html#stratified-k-fold',
  featureImportance: 'https://xgboost.readthedocs.io/en/latest/python/python_api.html#xgboost.Booster.get_score',
  partialDischarge: 'https://en.wikipedia.org/wiki/Partial_discharge',
  electricArc: 'https://en.wikipedia.org/wiki/Electric_arc',
  thermalFault: 'https://en.wikipedia.org/wiki/Transformer#Transformer_faults',
  gradientBoosting: 'https://en.wikipedia.org/wiki/Gradient_boosting',
  crossValidation: 'https://en.wikipedia.org/wiki/Cross-validation_(statistics)',
};

const PAPERS = [
  {
    id: 1,
    title: "Machine Learning-Based Multi-Method Interpretation for Dissolved Gas Analysis",
    authors: "Various",
    journal: "PMC / ScienceDirect",
    year: 2024,
    url: "https://doi.org/10.1016/j.ijepes.2023.109745",
    contribution: "Hybrid AI scoring approach combining multiple traditional DGA methods with ML. We adopted the consensus voting framework with weighted method agreement.",
  },
  {
    id: 2,
    title: "Fault Classification via Dissolved Gas Analysis and Machine Learning: A Systematic Review",
    authors: "Various",
    journal: "MDPI Applied Sciences",
    year: 2025,
    url: "https://doi.org/10.3390/app15010472",
    contribution: "Comprehensive survey of ML approaches for DGA. Informed our choice of XGBoost with SMOTE for handling class imbalance in fault classification.",
  },
  {
    id: 3,
    title: "Evaluation of the Duval Pentagon Method for Transformer Fault Diagnosis",
    authors: "Various",
    journal: "Springer Electrical Engineering",
    year: 2025,
    url: "https://doi.org/10.1007/s00202-024-02890-y",
    contribution: "Validated Duval Pentagon as complementary to Triangle method. We implemented both using CIGRE TB 771 centroid-based nearest-zone classification.",
  },
  {
    id: 4,
    title: "Review of Transformer Health Index from the Perspective of Survivability and Condition Assessment",
    authors: "Various",
    journal: "MDPI Electronics",
    year: 2023,
    url: "https://doi.org/10.3390/electronics12163443",
    contribution: "Defined the DGAF weighting scheme and composite health index formula. Our CHI = 50% DGAF + 15% BDV + 15% Moisture + 10% Acidity + 10% Tan Delta.",
  },
  {
    id: 5,
    title: "Modified Dissolved Gas Analysis Scoring Approach for Transformer Health Evaluation Considering Delta and Rate Values",
    authors: "Various",
    journal: "MDPI Energies",
    year: 2024,
    url: "https://doi.org/10.3390/en17040954",
    contribution: "Rate-of-change penalty for early fault detection. We compute ppm/day and %/day rates with rolling windows (3 and 5 samples) for temporal features.",
  },
  {
    id: 6,
    title: "SHAP and LGBM for Transformer Fault Diagnosis via Dissolved Gas Analysis",
    authors: "Various",
    journal: "Energy Informatics (Springer)",
    year: 2025,
    url: "https://doi.org/10.1186/s42162-024-00469-6",
    contribution: "Demonstrated SHAP-based explainability for DGA models. Informed our feature importance analysis and interpretability approach.",
  },
  {
    id: 7,
    title: "SMOTE and Gradient Boosted Decision Tree Hybrid for DGA Fault Diagnosis",
    authors: "Various",
    journal: "Arabian Journal for Science and Engineering",
    year: 2025,
    url: "https://doi.org/10.1007/s13369-024-09819-2",
    contribution: "Validated SMOTE + gradient boosting for imbalanced DGA datasets. Our implementation uses adaptive k_neighbors SMOTE with XGBoost.",
  },
];

const STANDARDS = [
  {
    id: "S1",
    title: "IEEE C57.104-2019",
    fullTitle: "Guide for the Interpretation of Gases Generated in Mineral Oil-Immersed Transformers",
    url: "https://standards.ieee.org/standard/C57_104-2019.html",
    usage: "Gas concentration thresholds (Status 1/2/3), rate-of-change limits, Rogers ratio tables, Key Gas method. Defines the 3-level condition status framework used throughout this system.",
  },
  {
    id: "S2",
    title: "IEC 60599:2022",
    fullTitle: "Mineral oil-filled electrical equipment in service — Guidance on the interpretation of dissolved and free gases analysis",
    url: "https://webstore.iec.ch/en/publication/60086",
    usage: "Fault taxonomy (PD/D1/D2/T1/T2/T3/DT), IEC ratio method, Duval Triangle zone boundaries. Defines the 7 fault types used in our classification system.",
  },
  {
    id: "S3",
    title: "CIGRE Technical Brochure 771 (2019)",
    fullTitle: "Transformer Reliability Survey",
    url: "https://www.e-cigre.org/publications/detail/771-transformer-reliability-survey.html",
    usage: "Duval Pentagon method with 5-gas centroid classification. Provides pentagon zone centroids for nearest-neighbor fault diagnosis.",
  },
  {
    id: "S4",
    title: "CIGRE Technical Brochure 761 (2019)",
    fullTitle: "Condition Assessment of Power Transformers",
    url: "https://www.e-cigre.org/publications/detail/761-condition-assessment-of-power-transformers.html",
    usage: "Two-component health assessment model: aggregate health index + condition group (worst-case override). Used for fault-severity ceiling on risk level classification to prevent severe faults from being masked by aggregate scoring.",
  },
];

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-blue-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function Methodology() {
  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Methodology</h1>
        <p className="text-sm text-gray-500 mt-1">
          Research-backed approach for transformer fault diagnosis, health indexing, and failure prediction using Dissolved Gas Analysis (DGA)
        </p>
      </div>

      {/* Overview */}
      <Section icon={BookOpen} title="1. Overview">
        <p className="text-sm text-gray-600 leading-relaxed">
          This system implements a three-model approach for power transformer condition assessment
          using oil <T href={LINKS.dga}>Dissolved Gas Analysis (DGA)</T> data from AP Transco's fleet of 1,260 transformers
          across 357 substations. The methodology is grounded in IEEE C57.104-2019 and IEC 60599:2022
          standards, enhanced with machine learning techniques from peer-reviewed research (2023-2026).
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-800">Model 1</p>
            <p className="text-sm font-medium text-blue-900 mt-1">Fault Classification</p>
            <p className="text-xs text-blue-700 mt-0.5">8-class <T href={LINKS.xgboost}>XGBoost</T> + <T href={LINKS.smote}>SMOTE</T></p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-emerald-800">Model 2</p>
            <p className="text-sm font-medium text-emerald-900 mt-1">Health Index Regression</p>
            <p className="text-xs text-emerald-700 mt-0.5">Composite CHI (0-100)</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-800">Model 3</p>
            <p className="text-sm font-medium text-red-900 mt-1">Failure Prediction</p>
            <p className="text-xs text-red-700 mt-0.5">Temporal binary classification</p>
          </div>
        </div>
      </Section>

      {/* Fault Type Glossary */}
      <Section icon={Tag} title="2. Fault Type Glossary (IEC 60599:2022)">
        <p className="text-sm text-gray-600 mb-3">
          The 8 fault categories used throughout this system are defined by <a href="https://webstore.iec.ch/en/publication/60086" target="_blank" className="text-blue-600 hover:underline">IEC 60599:2022</a>.
          Each fault type produces a distinct pattern of dissolved gases in transformer oil, which the DGA methods interpret.
        </p>
        <div className="space-y-2">
          {[
            { code: 'Normal', color: '#10B981', desc: 'No fault detected', detail: 'All gas concentrations are below IEEE C57.104-2019 Status 1 thresholds (90th percentile). The transformer is operating normally with no evidence of electrical or thermal stress.' },
            { code: 'PD', color: '#38BDF8', desc: 'Partial Discharge (Corona)', detail: 'Low-energy ionization of gas adjacent to a conductor. Produces predominantly H2 (hydrogen) and small amounts of CH4 and C2H6. Common in voids, gas bubbles, or areas of high electric field stress. Usually not immediately dangerous but indicates insulation degradation.', link: LINKS.partialDischarge },
            { code: 'D1', color: '#8B5CF6', desc: 'Low-Energy Discharge (Sparking)', detail: 'Intermittent, low-energy electrical discharges such as sparking between poorly connected leads, floating potentials, or tracking across insulating surfaces. Produces H2, C2H2 (acetylene), and some CH4. C2H2 is the key indicator — even small amounts suggest arcing.' },
            { code: 'D2', color: '#9333EA', desc: 'High-Energy Discharge (Arcing)', detail: 'Sustained, high-energy arcing such as flashover between windings, bushing failures, or tap changer arcing. Produces large amounts of H2, C2H2, C2H4, and C2H6. Distinguished from D1 by much higher gas volumes and C2H4 presence. This is the most dangerous electrical fault.', link: LINKS.electricArc },
            { code: 'T1', color: '#EAB308', desc: 'Thermal Fault < 300\u00B0C', detail: 'Low-temperature overheating of oil or cellulose insulation. Caused by overloaded joints, circulating currents in core, or blocked cooling. Produces CH4 and C2H6 as primary gases. Often seen in bad contacts, overheated connections, or stray flux heating.', link: LINKS.thermalFault },
            { code: 'T2', color: '#F97316', desc: 'Thermal Fault 300-700\u00B0C', detail: 'Moderate overheating involving carbonization of paper insulation and oil decomposition. Produces CH4, C2H4, and C2H6. Indicates significant conductor heating or insulation damage that requires maintenance.' },
            { code: 'T3', color: '#EF4444', desc: 'Thermal Fault > 700\u00B0C', detail: 'Severe overheating with extensive damage — metal discoloration, carbon tracking, oil cracking. Produces predominantly C2H4 (ethylene) and CH4 with high gas volumes. Often caused by circulating currents in core, severe overloading, or failed cooling systems. Requires urgent action.' },
            { code: 'DT', color: '#E11D48', desc: 'Discharge + Thermal (Mixed)', detail: 'Combined electrical discharge and thermal fault mechanisms occurring simultaneously. Produces a mix of discharge gases (C2H2, H2) and thermal gases (C2H4, CH4). Often indicates arcing that generates enough heat to cause secondary thermal damage. Complex fault requiring careful analysis.' },
          ].map(f => (
            <div key={f.code} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                <span className="text-sm font-semibold text-gray-900">{f.code}</span>
                <span className="text-sm text-gray-600">— {f.desc}</span>
                {f.link && (
                  <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline ml-auto flex items-center gap-0.5">
                    Learn more <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed ml-5">{f.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Data Pipeline */}
      <Section icon={Database} title="3. Data Pipeline">
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-800">2.1 Raw Data</h3>
            <p className="mt-1">315,419 oil test records from AP Transco (2018-2026), covering 7 dissolved gases (H2, CH4, C2H6, C2H4, C2H2, CO, CO2), oil quality parameters (BDV, moisture, resistivity, acidity, tan delta), and equipment metadata.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">2.2 Preprocessing</h3>
            <p className="mt-1">Long-to-wide pivot (one row per equipment + date), test name standardization, negative value removal. Produces 11,932 sample records across 1,260 unique transformers.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">2.3 Gas Data Completeness</h3>
            <p className="mt-1">Not all samples include all 7 gases. H2 and CO are most common (54% and 84%), while C2H2 is least available (17%). Traditional DGA methods require specific gas subsets — e.g., Duval Triangle needs CH4+C2H4+C2H2, while Key Gas only needs the dominant gas. XGBoost handles missing values natively.</p>
          </div>
        </div>
      </Section>

      {/* Fault Labeling */}
      <Section icon={FlaskConical} title="4. Consensus Fault Labeling">
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Since no manual fault labels exist in the AP Transco data, we generate labels using
            <strong> weighted consensus voting</strong> from 5 established DGA interpretation methods
            <a href={PAPERS[0].url} target="_blank" className="text-blue-600 hover:underline ml-1">[Paper 1]</a>:
          </p>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Method</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Standard</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Weight</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Required Gases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-3 py-1.5 font-medium">Duval Triangle 1</td><td className="px-3 py-1.5">IEC 60599:2022</td><td className="px-3 py-1.5 text-center">3</td><td className="px-3 py-1.5">CH4, C2H4, C2H2</td></tr>
              <tr><td className="px-3 py-1.5 font-medium">Duval Pentagon</td><td className="px-3 py-1.5">CIGRE TB 771</td><td className="px-3 py-1.5 text-center">3</td><td className="px-3 py-1.5">H2, CH4, C2H6, C2H4, C2H2</td></tr>
              <tr><td className="px-3 py-1.5 font-medium">IEC 60599 Ratios</td><td className="px-3 py-1.5">IEC 60599:2022</td><td className="px-3 py-1.5 text-center">2</td><td className="px-3 py-1.5">H2, CH4, C2H6, C2H4, C2H2</td></tr>
              <tr><td className="px-3 py-1.5 font-medium">Rogers Ratios</td><td className="px-3 py-1.5">IEEE C57.104</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5">H2, CH4, C2H6, C2H4, C2H2</td></tr>
              <tr><td className="px-3 py-1.5 font-medium">Key Gas</td><td className="px-3 py-1.5">IEEE C57.104</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5">H2, CH4, C2H4, C2H2, CO</td></tr>
            </tbody>
          </table>
          <p>
            If all gases fall below IEEE C57.104-2019 Status 1 thresholds, the sample is labeled "Normal"
            regardless of method outputs. Otherwise, weighted majority vote determines the fault type.
            The confidence score is the fraction of total weight assigned to the winning label.
          </p>
        </div>
      </Section>

      {/* Feature Engineering */}
      <Section icon={Brain} title="5. Feature Engineering (~58 features for classification)">
        <div className="space-y-2 text-sm text-gray-600">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded p-2">
              <p className="font-medium text-gray-800 text-xs">Group A: Raw Gases (7)</p>
              <p className="text-xs mt-0.5">H2, CH4, C2H6, C2H4, C2H2, CO, CO2</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="font-medium text-gray-800 text-xs">Group B: Gas Ratios (12)</p>
              <p className="text-xs mt-0.5">C2H2/C2H4, CH4/H2, C2H4/C2H6, etc.</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="font-medium text-gray-800 text-xs">Group C: Gas Percentages (10)</p>
              <p className="text-xs mt-0.5">%TDCG per gas + Duval Triangle %</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="font-medium text-gray-800 text-xs">Group D: Method Encodings (7)</p>
              <p className="text-xs mt-0.5">Ordinal-encoded method results + consensus features</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="font-medium text-gray-800 text-xs">Group E: IEEE Status Levels (8)</p>
              <p className="text-xs mt-0.5">Status 1/2/3 per gas per C57.104-2019</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="font-medium text-gray-800 text-xs">Group F: Log Transforms (7)</p>
              <p className="text-xs mt-0.5">log(1+gas) for right-skewed distributions</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            For failure prediction (Model 3), an additional 125 temporal features are computed:
            rate-of-change (ppm/day), rolling statistics (mean/std/max/trend over 3 and 5 windows),
            and lag features (1/2/3 previous values).
            <a href={PAPERS[4].url} target="_blank" className="text-blue-600 hover:underline ml-1">[Paper 5]</a>
          </p>
        </div>
      </Section>

      {/* Health Index */}
      <Section icon={BarChart3} title="6. Composite Health Index (CHI)">
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            The health index follows the methodology from
            <a href={PAPERS[3].url} target="_blank" className="text-blue-600 hover:underline ml-1">[Paper 4]</a> with
            modifications from <a href={PAPERS[4].url} target="_blank" className="text-blue-600 hover:underline ml-1">[Paper 5]</a>:
          </p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-mono text-xs text-center">
              CHI = 50% &times; DGAF + 15% &times; BDV + 15% &times; Moisture + 10% &times; Acidity + 10% &times; Tan Delta
            </p>
          </div>
          <p>
            <strong>DGAF (DGA Factor):</strong> Each gas is scored 1-4 based on IEEE C57.104-2019 thresholds
            (4=Good, 3=Fair, 2=Poor, 1=Critical). Scores are weighted (C2H2 &times;5, CH4/C2H6/C2H4 &times;3,
            H2 &times;2, CO/CO2 &times;1) and normalized to 0-10.
          </p>
          <table className="w-full text-xs mt-2">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Risk Level</th>
                <th className="px-3 py-1.5 text-center font-medium">CHI Range</th>
                <th className="px-3 py-1.5 text-left font-medium">Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-3 py-1.5 text-emerald-700 font-medium">Excellent</td><td className="px-3 py-1.5 text-center">80-100</td><td className="px-3 py-1.5">Normal operation, no action required</td></tr>
              <tr><td className="px-3 py-1.5 text-blue-700 font-medium">Good</td><td className="px-3 py-1.5 text-center">60-80</td><td className="px-3 py-1.5">Minor degradation, continue monitoring</td></tr>
              <tr><td className="px-3 py-1.5 text-amber-700 font-medium">Fair</td><td className="px-3 py-1.5 text-center">40-60</td><td className="px-3 py-1.5">Moderate concern, increase testing frequency</td></tr>
              <tr><td className="px-3 py-1.5 text-orange-700 font-medium">Poor</td><td className="px-3 py-1.5 text-center">20-40</td><td className="px-3 py-1.5">Significant degradation, plan maintenance</td></tr>
              <tr><td className="px-3 py-1.5 text-red-700 font-medium">Critical</td><td className="px-3 py-1.5 text-center">0-20</td><td className="px-3 py-1.5">Immediate attention, consider de-energization</td></tr>
            </tbody>
          </table>
          <div className="mt-4 space-y-3">
            <h3 className="font-medium text-gray-800">6.1 Rate-of-Change Penalty [Paper 5]</h3>
            <p>
              The DGAF score is penalized when gas concentrations are changing rapidly, even if absolute levels
              are still within normal limits. This implements the methodology from
              <a href={PAPERS[4].url} target="_blank" className="text-blue-600 hover:underline ml-1">[Paper 5]</a>,
              which demonstrated that rate-of-change penalties improve early fault detection by 3 weeks.
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-mono text-xs text-center">
                adjusted_DGAF = DGAF &times; max(0.65, 1.0 &minus; 0.05 &times; n_gases_exceeding_rate_threshold)
              </p>
            </div>
            <p>
              For each gas, the rate of change (ppm/day) is compared against IEEE C57.104-2019 Table 4 thresholds
              (converted from ppm/year). When the rate exceeds the threshold, that gas counts toward the penalty.
              Maximum penalty is 35% DGAF reduction (when all 7 gases exceed thresholds). Only applies to
              transformers with 2+ samples (first sample gets no penalty).
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <h3 className="font-medium text-gray-800">6.2 Condition Group Override [CIGRE TB 761]</h3>
            <p>
              Following the two-component health assessment model from
              <a href="https://www.e-cigre.org/publications/detail/761-condition-assessment-of-power-transformers.html" target="_blank" className="text-blue-600 hover:underline">CIGRE Technical Brochure 761 (2019)</a>,
              the risk level is subject to a fault-severity ceiling. When a severe fault is diagnosed with
              high confidence (≥60% consensus), the risk level is capped regardless of the aggregate CHI score.
              This prevents the scenario where a transformer with a T3 (&gt;700&deg;C) thermal fault is rated "Excellent"
              because absolute gas levels are still below IEEE thresholds.
            </p>
            <p>
              The CHI numeric value remains unchanged — it is still a valid measurement of gas levels and oil quality.
              Only the risk level label is adjusted to reflect the operational severity of the diagnosed fault.
            </p>
            <table className="w-full text-xs mt-2">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Fault Type</th>
                  <th className="px-3 py-1.5 text-left font-medium">IEC 60599 Description</th>
                  <th className="px-3 py-1.5 text-center font-medium">Max Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="px-3 py-1.5">Normal</td><td className="px-3 py-1.5">No fault detected</td><td className="px-3 py-1.5 text-center text-emerald-700 font-medium">Excellent</td></tr>
                <tr><td className="px-3 py-1.5">PD</td><td className="px-3 py-1.5">Partial Discharge (corona)</td><td className="px-3 py-1.5 text-center text-blue-700 font-medium">Good</td></tr>
                <tr><td className="px-3 py-1.5">T1</td><td className="px-3 py-1.5">Thermal &lt; 300&deg;C</td><td className="px-3 py-1.5 text-center text-blue-700 font-medium">Good</td></tr>
                <tr><td className="px-3 py-1.5">D1</td><td className="px-3 py-1.5">Low-energy discharge (sparking)</td><td className="px-3 py-1.5 text-center text-amber-700 font-medium">Fair</td></tr>
                <tr><td className="px-3 py-1.5">T2</td><td className="px-3 py-1.5">Thermal 300-700&deg;C</td><td className="px-3 py-1.5 text-center text-amber-700 font-medium">Fair</td></tr>
                <tr><td className="px-3 py-1.5">DT</td><td className="px-3 py-1.5">Combined discharge + thermal</td><td className="px-3 py-1.5 text-center text-orange-700 font-medium">Poor</td></tr>
                <tr><td className="px-3 py-1.5">D2</td><td className="px-3 py-1.5">High-energy discharge (arcing)</td><td className="px-3 py-1.5 text-center text-orange-700 font-medium">Poor</td></tr>
                <tr><td className="px-3 py-1.5">T3</td><td className="px-3 py-1.5">Thermal &gt; 700&deg;C (severe)</td><td className="px-3 py-1.5 text-center text-orange-700 font-medium">Poor</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Model Details */}
      <Section icon={Brain} title="7. Machine Learning Models">
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-800">7.1 Model 1: Fault Classification (<T href={LINKS.f1score}>99.6% accuracy</T>)</h3>
            <p className="mt-1">
              <T href={LINKS.xgboost}>XGBoost</T> multi-class classifier (8 fault types) with <T href={LINKS.smote}>SMOTE</T> oversampling for class imbalance
              <a href={PAPERS[6].url} target="_blank" className="text-blue-600 hover:underline ml-1">[Paper 7]</a>.
              Only samples with 5+ gas measurements are used (5,843 samples). SMOTE uses adaptive k_neighbors
              based on minority class size. 80/20 <T href={LINKS.stratifiedSplit}>stratified train-test split</T> with 58 features.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">7.2 Model 2: Health Index Regression (<T href={LINKS.r2}>R&sup2;</T> = 0.992)</h3>
            <p className="mt-1">
              <T href={LINKS.xgboost}>XGBoost</T> regressor predicting the deterministic CHI score (0-100). Uses all 11,917 samples
              with valid health index. Predictions clipped to [0, 100]. Evaluated on <T href={LINKS.rmse}>RMSE</T>, MAE, and
              risk level accuracy (98.3% — the predicted CHI maps to the correct risk level).
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">7.3 Model 3: Failure Prediction (93.4% accuracy, <T href={LINKS.auroc}>AUC-ROC</T> 0.86)</h3>
            <p className="mt-1">
              <T href={LINKS.xgboost}>XGBoost</T> binary classifier predicting whether any gas will exceed IEEE Status 3 at the next test.
              Uses <strong>temporal train-test split</strong> (first 80% of each transformer's timeline for training)
              to prevent data leakage
              <a href={PAPERS[4].url} target="_blank" className="text-blue-600 hover:underline ml-1">[Paper 5]</a>.
              125 temporal features including rolling statistics and lag values.
              scale_pos_weight handles the 12.7% positive class imbalance.
            </p>
          </div>
        </div>
      </Section>

      {/* Data Integrity */}
      <Section icon={Shield} title="8. Data Integrity Notes">
        <div className="space-y-2 text-sm text-gray-600">
          <ul className="list-disc list-inside space-y-1">
            <li>All gas values shown are from the <strong>actual last sample date</strong>, not aggregated across dates</li>
            <li>Fault labels are generated by consensus voting, not manually labeled — confidence score reflects method agreement</li>
            <li>Health index is deterministic (formula-based, not ML-predicted) — the ML model is trained to approximate it</li>
            <li>Gas data completeness varies: Key Gas method works for 83% of samples, Duval methods for 10-15%, ratio methods for 5%</li>
            <li>Oil quality (BDV) data is sparse (1.5% complete) — CHI redistributes weight when oil parameters are missing</li>
            <li>9 transformers have negative ages (DOC after sample date) — clamped to 0</li>
          </ul>
        </div>
      </Section>

      {/* Research Papers */}
      <Section icon={BookOpen} title="9. Research Papers">
        <div className="space-y-3">
          {PAPERS.map(p => (
            <div key={p.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                     className="text-sm font-medium text-blue-700 hover:underline flex items-center gap-1">
                    [{p.id}] {p.title}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <p className="text-xs text-gray-500 mt-0.5">{p.journal}, {p.year}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                <span className="font-medium text-gray-700">How we used it:</span> {p.contribution}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Standards */}
      <Section icon={Shield} title="10. IEEE/IEC Standards">
        <div className="space-y-3">
          {STANDARDS.map(s => (
            <div key={s.id} className="border border-gray-100 rounded-lg p-3">
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                 className="text-sm font-medium text-blue-700 hover:underline flex items-center gap-1">
                [{s.id}] {s.title}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <p className="text-xs text-gray-500 mt-0.5">{s.fullTitle}</p>
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium text-gray-700">Usage:</span> {s.usage}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
