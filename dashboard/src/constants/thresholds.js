// IEEE C57.104-2019 Gas Concentration Thresholds (ppm)
// Status 1 max, Status 2 max — above Status 2 = Status 3
export const IEEE_THRESHOLDS = {
  H2:   [100, 200],
  CH4:  [120, 400],
  C2H6: [65, 100],
  C2H4: [50, 200],
  C2H2: [1, 9],
  CO:   [350, 570],
  CO2:  [2500, 4000],
  TDCG: [720, 1920],
};

export const FAULT_DESCRIPTIONS = {
  Normal: 'No fault detected — all gases within normal limits',
  PD: 'Partial Discharge (corona) — low-energy ionization',
  D1: 'Low-energy Discharge — sparking, intermittent arcing',
  D2: 'High-energy Discharge — sustained arcing',
  T1: 'Thermal Fault < 300\u00B0C — overheated connections',
  T2: 'Thermal Fault 300-700\u00B0C — moderate overheating',
  T3: 'Thermal Fault > 700\u00B0C — severe overheating',
  DT: 'Discharge + Thermal — combined fault mechanism',
};
