import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, AlertTriangle, MapPin, Activity, Target, FileText, Building2, Zap as TransformerIcon } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import KPICard from '../components/cards/KPICard';
import RiskDistributionBar from '../components/charts/RiskDistributionBar';
import FaultDonutChart from '../components/charts/FaultDonutChart';
import AgeHealthScatter from '../components/charts/AgeHealthScatter';
import TransformerListPanel from '../components/shared/TransformerListPanel';
import FilterBar from '../components/filters/FilterBar';
import SubstationTable from '../components/tables/SubstationTable';
import TransformerTable from '../components/tables/TransformerTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { formatNumber } from '../utils/formatters';

export default function FleetOverview() {
  const { state, dispatch } = useDashboard();
  const { fleet, substations, transformers, activeFilters, isLoading } = state;
  const navigate = useNavigate();

  const [selectedFaultType, setSelectedFaultType] = useState(null);
  const [viewMode, setViewMode] = useState('substations'); // 'substations' | 'transformers'

  // Filter substations
  const filteredSubstations = useMemo(() => {
    if (!substations) return [];
    return substations.filter(sub => {
      if (activeFilters.voltage !== 'all' && sub.voltage_class !== Number(activeFilters.voltage)) return false;
      if (activeFilters.search && viewMode === 'substations') {
        const q = activeFilters.search.toLowerCase();
        if (!sub.name?.toLowerCase().includes(q) && !sub.id?.toLowerCase().includes(q)) return false;
      }
      if (activeFilters.riskLevels.length) {
        const hasMatchingRisk = activeFilters.riskLevels.some(r => (sub.risk_distribution?.[r] || 0) > 0);
        if (!hasMatchingRisk) return false;
      }
      if (activeFilters.faultTypes.length) {
        const hasMatchingFault = activeFilters.faultTypes.some(f => (sub.fault_distribution?.[f] || 0) > 0);
        if (!hasMatchingFault) return false;
      }
      return true;
    });
  }, [substations, activeFilters, viewMode]);

  // Filter transformers directly
  const filteredTransformers = useMemo(() => {
    if (!transformers) return [];
    return transformers.filter(t => {
      if (activeFilters.voltage !== 'all' && t.voltage_class !== Number(activeFilters.voltage)) return false;
      if (activeFilters.search) {
        const q = activeFilters.search.toLowerCase();
        const matchEquip = t.equipment_no?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchMake = t.make?.toLowerCase().includes(q);
        const matchSub = t.substation_name?.toLowerCase().includes(q);
        const matchSubId = t.substation_id?.toLowerCase().includes(q);
        if (!matchEquip && !matchDesc && !matchMake && !matchSub && !matchSubId) return false;
      }
      if (activeFilters.riskLevels.length && !activeFilters.riskLevels.includes(t.risk_level)) return false;
      if (activeFilters.faultTypes.length && !activeFilters.faultTypes.includes(t.fault_label)) return false;
      return true;
    });
  }, [transformers, activeFilters]);

  // Fault type drill-down
  const faultFilteredTransformers = useMemo(() => {
    if (!selectedFaultType || !transformers) return [];
    return transformers.filter(t => t.fault_label === selectedFaultType);
  }, [selectedFaultType, transformers]);

  if (isLoading) return <LoadingSpinner />;

  const criticalCount = fleet?.risk_distribution?.Critical || 0;
  const poorCount = fleet?.risk_distribution?.Poor || 0;
  const needsAttention = criticalCount + poorCount;

  const isNeedsAttentionActive = activeFilters.riskLevels.length > 0 &&
    activeFilters.riskLevels.every(r => r === 'Critical' || r === 'Poor');

  const handleNeedsAttentionClick = () => {
    if (isNeedsAttentionActive) {
      dispatch({ type: 'SET_FILTER', key: 'riskLevels', value: [] });
    } else {
      dispatch({ type: 'SET_FILTER', key: 'riskLevels', value: ['Critical', 'Poor'] });
    }
  };

  const handleFaultSegmentClick = (faultType) => {
    if (selectedFaultType === faultType) {
      setSelectedFaultType(null);
    } else {
      setSelectedFaultType(faultType);
    }
  };

  const matchCount = viewMode === 'substations' ? filteredSubstations.length : filteredTransformers.length;
  const matchLabel = viewMode === 'substations' ? 'substations' : 'transformers';

  return (
    <div className="space-y-4">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <p className="font-medium">Failed to load dashboard data</p>
          <p className="text-xs mt-1">{state.error.message || 'Unknown error'}</p>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Fleet Overview</h1>
        <Link
          to="/fleet-report"
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors no-print"
        >
          <FileText className="w-4 h-4" />
          Fleet Report
        </Link>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard
          label="Transformers"
          value={formatNumber(fleet?.total_transformers)}
          subtitle={`${formatNumber(fleet?.total_samples)} total samples`}
          icon={Cpu}
          color="text-blue-500"
          onClick={() => setViewMode('transformers')}
          active={viewMode === 'transformers'}
        />
        <KPICard
          label="Needs Attention"
          value={needsAttention}
          subtitle={`${criticalCount} critical, ${poorCount} poor`}
          icon={AlertTriangle}
          color="text-red-500"
          onClick={needsAttention > 0 ? () => { handleNeedsAttentionClick(); setViewMode('transformers'); } : undefined}
          active={isNeedsAttentionActive}
        />
        <KPICard
          label="Substations"
          value={formatNumber(fleet?.total_substations)}
          subtitle={`${Object.keys(fleet?.voltage_distribution || {}).length} voltage classes`}
          icon={MapPin}
          color="text-emerald-500"
          onClick={() => setViewMode('substations')}
          active={viewMode === 'substations'}
        />
        <KPICard
          label="Avg Health Index"
          value={fleet?.avg_chi?.toFixed(1) || '-'}
          subtitle="Composite Health Index (0-100)"
          icon={Activity}
          color="text-blue-500"
          onClick={() => navigate('/analytics')}
        />
        <KPICard
          label="Fault Model Accuracy"
          value={state.models?.fault_classifier?.accuracy ? `${(state.models.fault_classifier.accuracy * 100).toFixed(1)}%` : '-'}
          subtitle="XGBoost + SMOTE"
          icon={Target}
          color="text-emerald-500"
          onClick={() => navigate('/models')}
        />
      </div>

      {/* Risk Distribution */}
      <RiskDistributionBar
        distribution={fleet?.risk_distribution || {}}
        onSegmentClick={(level) => {
          const current = activeFilters.riskLevels;
          if (current.length === 1 && current[0] === level) {
            dispatch({ type: 'SET_FILTER', key: 'riskLevels', value: [] });
          } else {
            dispatch({ type: 'SET_FILTER', key: 'riskLevels', value: [level] });
          }
        }}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FaultDonutChart
            distribution={fleet?.fault_distribution || {}}
            onSegmentClick={handleFaultSegmentClick}
            activeSegment={selectedFaultType}
          />
          {selectedFaultType && (
            <TransformerListPanel
              transformers={faultFilteredTransformers}
              title={`Fault type: ${selectedFaultType}`}
              onClose={() => setSelectedFaultType(null)}
            />
          )}
        </div>
        <AgeHealthScatter transformers={transformers || []} />
      </div>

      {/* View Toggle + Filters */}
      <div className="flex items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('substations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'substations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Substations
          </button>
          <button
            onClick={() => setViewMode('transformers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'transformers'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TransformerIcon className="w-3.5 h-3.5" />
            Transformers
          </button>
        </div>
        <div className="flex-1">
          <FilterBar
            viewMode={viewMode}
            matchCount={matchCount}
            matchLabel={matchLabel}
          />
        </div>
      </div>

      {/* Table — switches based on viewMode */}
      {viewMode === 'substations' ? (
        <SubstationTable substations={filteredSubstations} />
      ) : (
        <TransformerTable transformers={filteredTransformers} />
      )}
    </div>
  );
}
