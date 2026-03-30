import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import TransformerTable from '../components/tables/TransformerTable';
import RiskDistributionBar from '../components/charts/RiskDistributionBar';
import FaultDonutChart from '../components/charts/FaultDonutChart';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import RiskBadge from '../components/shared/RiskBadge';

export default function SubstationView() {
  const { id } = useParams();
  const { state } = useDashboard();

  const substation = useMemo(
    () => (state.substations || []).find(s => s.id === id),
    [state.substations, id]
  );

  const transformers = useMemo(
    () => (state.transformers || []).filter(t => t.substation_id === id),
    [state.transformers, id]
  );

  if (state.isLoading) return <LoadingSpinner />;

  if (!substation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Substation not found</p>
        <Link to="/" className="text-blue-600 text-sm mt-2 inline-block">Back to Fleet Overview</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-start justify-between">
          <div>
            <Link to="/" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2">
              <ArrowLeft className="w-3 h-3" /> Back to Fleet
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">{substation.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {substation.voltage_class ? `${substation.voltage_class} kV` : ''} &middot;{' '}
              {substation.transformer_count} transformers &middot; ID: {substation.id}
            </p>
          </div>
          <RiskBadge level={substation.worst_risk} size="lg" />
        </div>
      </div>

      {/* Risk Distribution */}
      <RiskDistributionBar distribution={substation.risk_distribution || {}} />

      {/* Transformer Table */}
      <TransformerTable transformers={transformers} />

      {/* Fault Distribution */}
      {Object.keys(substation.fault_distribution || {}).length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <FaultDonutChart distribution={substation.fault_distribution} />
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Substation Summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Avg Health Index</dt>
                <dd className="font-medium">{substation.avg_chi?.toFixed(1) || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Transformers</dt>
                <dd className="font-medium">{substation.transformer_count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Last Sampled</dt>
                <dd className="font-medium">{substation.latest_sample_date || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Worst Risk</dt>
                <dd><RiskBadge level={substation.worst_risk} /></dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
