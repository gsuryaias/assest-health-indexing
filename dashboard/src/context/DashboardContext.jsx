import { createContext, useContext, useReducer, useEffect } from 'react';

const DashboardContext = createContext();

const initialState = {
  fleet: null,
  substations: [],
  transformers: [],
  models: null,
  filters: null,
  history: {},
  isLoading: true,
  error: null,
  activeFilters: {
    voltage: 'all',
    riskLevels: [],
    faultTypes: [],
    search: '',
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_HISTORY':
      return { ...state, history: { ...state.history, ...action.payload } };
    case 'SET_FILTER':
      return { ...state, activeFilters: { ...state.activeFilters, [action.key]: action.value } };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'RESET_FILTERS':
      return { ...state, activeFilters: initialState.activeFilters };
    default:
      return state;
  }
}

async function fetchJson(path) {
  const res = await fetch(path);
  return res.json();
}

export function DashboardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    Promise.all([
      fetchJson('/data/fleet_summary.json'),
      fetchJson('/data/substations.json'),
      fetchJson('/data/transformers.json'),
      fetchJson('/data/model_metrics.json'),
      fetchJson('/data/filters.json'),
    ]).then(([fleet, substations, transformers, models, filters]) => {
      dispatch({
        type: 'SET_DATA',
        payload: { fleet, substations, transformers, models, filters },
      });
    }).catch((err) => {
      dispatch({ type: 'SET_ERROR', payload: err });
    });
  }, []);

  const loadHistory = async (equipmentNo) => {
    if (state.history[equipmentNo]) return;
    if (!state._historyCache) {
      const data = await fetchJson('/data/transformer_history.json');
      dispatch({ type: 'SET_DATA', payload: { _historyCache: true } });
      dispatch({ type: 'SET_HISTORY', payload: data });
    }
  };

  return (
    <DashboardContext.Provider value={{ state, dispatch, loadHistory, error: state.error }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
