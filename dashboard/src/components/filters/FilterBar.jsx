import { Search, X } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

function ActivePill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export default function FilterBar({ viewMode = 'substations', matchCount, matchLabel }) {
  const { state, dispatch } = useDashboard();
  const { activeFilters, filters } = state;

  const setFilter = (key, value) => dispatch({ type: 'SET_FILTER', key, value });

  const hasActiveFilters = activeFilters.search ||
    activeFilters.voltage !== 'all' ||
    activeFilters.riskLevels.length > 0 ||
    activeFilters.faultTypes.length > 0;

  const searchPlaceholder = viewMode === 'transformers'
    ? 'Search equipment no, make, description, substation...'
    : 'Search substations...';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={activeFilters.search}
            onChange={e => setFilter('search', e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <select
          value={activeFilters.voltage}
          onChange={e => setFilter('voltage', e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Voltages</option>
          {filters?.voltage_classes?.map(v => (
            <option key={v} value={v}>{v} kV</option>
          ))}
        </select>

        <select
          value={activeFilters.riskLevels.length === 1 ? activeFilters.riskLevels[0] : 'all'}
          onChange={e => setFilter('riskLevels', e.target.value === 'all' ? [] : [e.target.value])}
          className={`text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            activeFilters.riskLevels.length > 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
          }`}
        >
          <option value="all">All Risk Levels</option>
          {filters?.risk_levels?.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={activeFilters.faultTypes.length === 1 ? activeFilters.faultTypes[0] : 'all'}
          onChange={e => setFilter('faultTypes', e.target.value === 'all' ? [] : [e.target.value])}
          className={`text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            activeFilters.faultTypes.length > 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
          }`}
        >
          <option value="all">All Fault Types</option>
          {filters?.fault_types?.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => dispatch({ type: 'RESET_FILTERS' })}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-gray-400 uppercase">Active:</span>
          {activeFilters.voltage !== 'all' && (
            <ActivePill
              label={`${activeFilters.voltage} kV`}
              onRemove={() => setFilter('voltage', 'all')}
            />
          )}
          {activeFilters.riskLevels.map(r => (
            <ActivePill
              key={r}
              label={r}
              onRemove={() => setFilter('riskLevels', activeFilters.riskLevels.filter(x => x !== r))}
            />
          ))}
          {activeFilters.faultTypes.map(f => (
            <ActivePill
              key={f}
              label={f}
              onRemove={() => setFilter('faultTypes', activeFilters.faultTypes.filter(x => x !== f))}
            />
          ))}
          {activeFilters.search && (
            <ActivePill
              label={`"${activeFilters.search}"`}
              onRemove={() => setFilter('search', '')}
            />
          )}
          {matchCount != null && (
            <span className="text-[10px] text-gray-400 ml-1">
              ({matchCount} {matchLabel || 'results'} match)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
