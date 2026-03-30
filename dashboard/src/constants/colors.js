export const RISK_COLORS = {
  Excellent: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', hex: '#10B981', border: 'border-emerald-500' },
  Good: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', hex: '#3B82F6', border: 'border-blue-500' },
  Fair: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', hex: '#F59E0B', border: 'border-amber-500' },
  Poor: { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', hex: '#F97316', border: 'border-orange-500' },
  Critical: { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', hex: '#EF4444', border: 'border-red-500' },
};

export const RISK_ORDER = ['Critical', 'Poor', 'Fair', 'Good', 'Excellent'];

export const FAULT_COLORS = {
  Normal: '#10B981',
  PD: '#38BDF8',
  D1: '#8B5CF6',
  D2: '#9333EA',
  T1: '#EAB308',
  T2: '#F97316',
  T3: '#EF4444',
  DT: '#E11D48',
};

export const GAS_COLORS = {
  H2: '#3B82F6',
  CH4: '#10B981',
  C2H6: '#F59E0B',
  C2H4: '#EF4444',
  C2H2: '#8B5CF6',
  CO: '#6B7280',
  CO2: '#EC4899',
};
