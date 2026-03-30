import { useDashboard } from '../context/DashboardContext';
import FeatureImportanceChart from '../components/charts/FeatureImportanceChart';
import LoadingSpinner from '../components/shared/LoadingSpinner';

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
    </div>
  );
}

function ModelCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">{description}</p>
      {children}
    </div>
  );
}

export default function ModelPerformance() {
  const { state } = useDashboard();
  const { models, isLoading } = state;

  if (isLoading) return <LoadingSpinner />;
  if (!models) return <p className="text-gray-500">No model metrics available.</p>;

  const fc = models.fault_classifier;
  const hi = models.health_index;
  const fp = models.failure_predictor;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Model Performance</h1>
        <p className="text-sm text-gray-500">Phase A local training results — XGBoost on AP Transco DGA data</p>
      </div>

      {/* Model 1: Fault Classifier */}
      {fc && (
        <ModelCard
          title="Model 1: Fault Classification"
          description="XGBoost multi-class (8 fault types) + SMOTE for class balance"
        >
          <div className="grid grid-cols-4 gap-4 mb-4">
            <MetricCard label="Accuracy" value={(fc.accuracy * 100).toFixed(1) + '%'} />
            <MetricCard label="Weighted F1" value={(fc.weighted_f1 * 100).toFixed(1) + '%'} />
            <MetricCard label="Macro F1" value={(fc.macro_f1 * 100).toFixed(1) + '%'} />
            <MetricCard
              label="Training Size"
              value={fc.n_train?.toLocaleString()}
              subtitle={`${fc.n_test?.toLocaleString()} test`}
            />
          </div>

          {/* Per-class metrics */}
          {fc.per_class && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Per-Class Metrics</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Fault Type</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Precision</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Recall</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">F1-Score</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(fc.per_class).map(([name, m]) => (
                      <tr key={name} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-medium">{name}</td>
                        <td className="px-3 py-1.5 text-right">{(m.precision * 100).toFixed(1)}%</td>
                        <td className="px-3 py-1.5 text-right">{(m.recall * 100).toFixed(1)}%</td>
                        <td className="px-3 py-1.5 text-right">{(m['f1-score'] * 100).toFixed(1)}%</td>
                        <td className="px-3 py-1.5 text-right text-gray-500">{m.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <FeatureImportanceChart
            features={fc.top_features}
            title="Top Features — Fault Classification"
            color="#3B82F6"
          />
        </ModelCard>
      )}

      {/* Model 2: Health Index */}
      {hi && (
        <ModelCard
          title="Model 2: Health Index Regression"
          description="XGBoost regressor — predicts Composite Health Index (0-100)"
        >
          <div className="grid grid-cols-4 gap-4 mb-4">
            <MetricCard label="R-squared" value={hi.r2?.toFixed(4)} />
            <MetricCard label="RMSE" value={hi.rmse?.toFixed(2)} />
            <MetricCard label="MAE" value={hi.mae?.toFixed(2)} />
            <MetricCard
              label="Risk Accuracy"
              value={(hi.risk_level_accuracy * 100).toFixed(1) + '%'}
              subtitle="Correct risk level"
            />
          </div>
          <FeatureImportanceChart
            features={hi.top_features}
            title="Top Features — Health Index"
            color="#10B981"
          />
        </ModelCard>
      )}

      {/* Model 3: Failure Prediction */}
      {fp && (
        <ModelCard
          title="Model 3: Failure Prediction"
          description="XGBoost binary — temporal train/test split (no data leakage)"
        >
          <div className="grid grid-cols-4 gap-4 mb-4">
            <MetricCard label="Accuracy" value={(fp.accuracy * 100).toFixed(1) + '%'} />
            <MetricCard label="AUC-ROC" value={fp.auc_roc?.toFixed(3) || 'N/A'} />
            <MetricCard label="AUC-PR" value={fp.auc_pr?.toFixed(3) || 'N/A'} />
            <MetricCard
              label="Training Size"
              value={fp.n_train?.toLocaleString()}
              subtitle={`${fp.n_test?.toLocaleString()} test`}
            />
          </div>
          <FeatureImportanceChart
            features={fp.top_features}
            title="Top Features — Failure Prediction"
            color="#EF4444"
          />
        </ModelCard>
      )}

      {/* Citations */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Research Citations</h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>[1] "ML-based multi-method interpretation for DGA" — PMC/ScienceDirect, 2024</li>
          <li>[2] "Fault Classification via DGA and ML: Systematic Review" — MDPI Applied Sciences, 2025</li>
          <li>[3] "Evaluation of Duval Pentagon method" — Springer Electrical Engineering, 2025</li>
          <li>[4] "Review of Transformer Health Index" — MDPI Electronics, 2023</li>
          <li>[5] "Modified DGA Scoring with Delta and Rate Values" — MDPI Energies, 2024</li>
          <li>[6] "SHAP + LGBM for transformer fault diagnosis" — Energy Informatics, 2025</li>
          <li>[7] "SMOTE + GBDT Hybrid for DGA Fault Diagnosis" — Arabian J. Sci. Eng., 2025</li>
          <li>[S1] IEEE C57.104-2019 — [S2] IEC 60599:2022 — [S3] CIGRE TB 771 (2019)</li>
        </ul>
      </div>
    </div>
  );
}
