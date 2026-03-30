/**
 * Duval Triangle 1 — SVG ternary diagram.
 *
 * Reference: IEC 60599:2022 Annex A, Figure A.1
 * M. Duval, "A Review of Faults Detectable by Gas-in-Oil Analysis in
 * Transformers", IEEE Electrical Insulation Magazine, Vol. 18, No. 3, 2002.
 *
 * The triangle plots the relative percentages of three gases:
 *   %CH4  = CH4  / (CH4 + C2H4 + C2H2) × 100  (bottom-left vertex)
 *   %C2H4 = C2H4 / (CH4 + C2H4 + C2H2) × 100  (bottom-right vertex)
 *   %C2H2 = C2H2 / (CH4 + C2H4 + C2H2) × 100  (top vertex)
 *
 * Zone boundaries (IEC 60599:2022):
 *   D2:  C2H2 > 29%
 *   DT:  4% < C2H2 ≤ 29% AND C2H4 > 50%
 *   D1:  4% < C2H2 ≤ 29% AND C2H4 ≤ 50%
 *   T3:  C2H2 ≤ 4% AND C2H4 ≥ 50%
 *   T2:  C2H2 ≤ 4% AND 20% ≤ C2H4 < 50%
 *   T1:  C2H2 ≤ 4% AND C2H4 < 20% AND CH4 ≤ 98% (approx)
 *   PD:  C2H2 ≤ 4% AND CH4 > 98%
 */

// SVG viewport
const W = 500;
const H = 460;

// Triangle vertices in SVG coordinates
const VX = { CH4: [50, 430], C2H4: [450, 430], C2H2: [250, 30] };

/**
 * Convert barycentric (CH4%, C2H4%, C2H2%) to SVG [x, y].
 * Percentages need NOT sum to 100 — they are normalised internally.
 */
function tri(pch4, pc2h4, pc2h2) {
  const s = pch4 + pc2h4 + pc2h2 || 1;
  const a = pch4 / s, b = pc2h4 / s, c = pc2h2 / s;
  return [
    VX.CH4[0] * a + VX.C2H4[0] * b + VX.C2H2[0] * c,
    VX.CH4[1] * a + VX.C2H4[1] * b + VX.C2H2[1] * c,
  ];
}

/** Format array of barycentric vertices to SVG polygon `points` string. */
function poly(verts) {
  return verts.map(v => tri(...v).join(',')).join(' ');
}

// Zone definitions: vertices in (CH4%, C2H4%, C2H2%) barycentric coordinates
// Zones must tile the triangle without gaps or overlaps.
const ZONES = [
  {
    id: 'D2',
    label: 'D2',
    fill: '#EDE9FE', stroke: '#7C3AED',
    // C2H2 > 29%: top triangle
    verts: [[0, 0, 100], [71, 0, 29], [0, 71, 29]],
    labelAt: [15, 15, 70],   // approx centroid in bary coords
  },
  {
    id: 'DT',
    label: 'DT',
    fill: '#FFE4E6', stroke: '#BE123C',
    // 4 < C2H2 ≤ 29 AND C2H4 > 50
    verts: [[21, 50, 29], [0, 71, 29], [0, 96, 4], [46, 50, 4]],
    labelAt: [10, 70, 17],
  },
  {
    id: 'D1',
    label: 'D1',
    fill: '#DDD6FE', stroke: '#6D28D9',
    // 4 < C2H2 ≤ 29 AND C2H4 ≤ 50
    verts: [[71, 0, 29], [21, 50, 29], [46, 50, 4], [96, 0, 4]],
    labelAt: [63, 20, 17],
  },
  {
    id: 'T3',
    label: 'T3',
    fill: '#FECACA', stroke: '#DC2626',
    // C2H2 ≤ 4 AND C2H4 ≥ 50
    verts: [[50, 50, 0], [46, 50, 4], [0, 96, 4], [0, 100, 0]],
    labelAt: [15, 82, 2],
  },
  {
    id: 'T2',
    label: 'T2',
    fill: '#FED7AA', stroke: '#EA580C',
    // C2H2 ≤ 4 AND 20% ≤ C2H4 < 50
    verts: [[80, 20, 0], [50, 50, 0], [46, 50, 4], [76, 20, 4]],
    labelAt: [60, 37, 2],
  },
  {
    id: 'T1',
    label: 'T1',
    fill: '#FEF08A', stroke: '#CA8A04',
    // C2H2 ≤ 4 AND C2H4 < 20%  (includes secondary PD area at CH4>80%)
    verts: [[100, 0, 0], [80, 20, 0], [76, 20, 4], [96, 0, 4]],
    labelAt: [87, 8, 2],
  },
  {
    id: 'PD',
    label: 'PD',
    fill: '#BAE6FD', stroke: '#0284C7',
    // CH4 > 98% (tiny triangle at CH4 vertex)
    verts: [[100, 0, 0], [98, 2, 0], [98, 0, 2]],
    labelAt: [99, 0.6, 0.6],
  },
];

// Axis tick marks at 20% intervals along each edge
const TICKS = [20, 40, 60, 80];

function axisLabel(pch4, pc2h4, pc2h2, text, anchor, dy = 0) {
  const [x, y] = tri(pch4, pc2h4, pc2h2);
  return { x, y: y + dy, text, anchor };
}

const ZONE_DESCRIPTIONS = {
  PD:  'Partial Discharge — corona, H₂ dominant',
  T1:  'Thermal < 300°C — CH₄ dominant overheating',
  T2:  'Thermal 300–700°C — moderate overheating',
  T3:  'Thermal > 700°C — severe overheating, C₂H₄ dominant',
  D1:  'Low-energy Discharge — sparking, C₂H₂ present',
  D2:  'High-energy Discharge — arcing, high C₂H₂',
  DT:  'Discharge + Thermal — mixed fault, arcing with heat',
};

export default function DuvalTriangleChart({ gases }) {
  const ch4  = gases?.CH4  ?? null;
  const c2h4 = gases?.C2H4 ?? null;
  const c2h2 = gases?.C2H2 ?? null;

  const total = (ch4 || 0) + (c2h4 || 0) + (c2h2 || 0);
  const hasData = ch4 != null && c2h4 != null && c2h2 != null && total > 0;

  const pct = hasData ? {
    ch4:  (ch4  / total * 100),
    c2h4: (c2h4 / total * 100),
    c2h2: (c2h2 / total * 100),
  } : null;

  const point = hasData ? tri(ch4, c2h4, c2h2) : null;

  // Determine which zone the point falls in (mirrors Python logic)
  let activeZone = null;
  if (pct) {
    if (pct.c2h2 > 29)                                  activeZone = 'D2';
    else if (pct.c2h2 > 4 && pct.c2h4 > 50)            activeZone = 'DT';
    else if (pct.c2h2 > 4)                              activeZone = 'D1';
    else if (pct.c2h4 >= 50)                            activeZone = 'T3';
    else if (pct.c2h4 >= 20)                            activeZone = 'T2';
    else if (pct.ch4 > 98)                              activeZone = 'PD';
    else                                                activeZone = 'T1';
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
        Duval Triangle 1
        <span className="text-[10px] font-normal text-gray-400 ml-1">IEC 60599:2022 Annex A</span>
      </h3>

      {!hasData ? (
        <p className="text-sm text-gray-400 text-center py-6">
          CH₄, C₂H₄ and C₂H₂ data required for Duval Triangle
        </p>
      ) : (
        <div className="flex gap-4 items-start">

          {/* SVG triangle */}
          <svg viewBox={`0 0 ${W} ${H}`} className="w-56 h-56 flex-shrink-0">
            {/* Zone fill polygons */}
            {ZONES.map(z => (
              <polygon key={z.id}
                points={poly(z.verts)}
                fill={z.id === activeZone ? z.stroke : z.fill}
                fillOpacity={z.id === activeZone ? 0.35 : 0.75}
                stroke={z.stroke}
                strokeWidth={z.id === activeZone ? 2 : 0.8}
              />
            ))}

            {/* Axis tick lines — CH4 edge (bottom, left to right via C2H2 contribution) */}
            {TICKS.map(t => {
              // Line of constant C2H2 = t% (horizontal strip)
              const [x1, y1] = tri(100 - t, 0, t);
              const [x2, y2] = tri(0, 100 - t, t);
              return (
                <line key={`c2h2-${t}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="3 3" />
              );
            })}

            {/* Zone labels (centroid text) */}
            {ZONES.filter(z => z.id !== 'PD').map(z => {
              const [lx, ly] = tri(...z.labelAt);
              return (
                <text key={z.id} x={lx} y={ly}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="12" fontWeight="700"
                  fill={z.stroke} opacity="0.9">
                  {z.label}
                </text>
              );
            })}

            {/* Triangle border */}
            <polygon
              points={`${VX.CH4.join(',')} ${VX.C2H4.join(',')} ${VX.C2H2.join(',')}`}
              fill="none" stroke="#374151" strokeWidth="1.5"
            />

            {/* Vertex labels */}
            <text x={VX.CH4[0] - 8}  y={VX.CH4[1] + 18} textAnchor="end"
              fontSize="11" fontWeight="600" fill="#374151">CH₄</text>
            <text x={VX.C2H4[0] + 8} y={VX.C2H4[1] + 18} textAnchor="start"
              fontSize="11" fontWeight="600" fill="#374151">C₂H₄</text>
            <text x={VX.C2H2[0]} y={VX.C2H2[1] - 10} textAnchor="middle"
              fontSize="11" fontWeight="600" fill="#374151">C₂H₂</text>

            {/* Sample point */}
            {point && (
              <>
                <circle cx={point[0]} cy={point[1]} r="8"
                  fill="#1D4ED8" opacity="0.15" />
                <circle cx={point[0]} cy={point[1]} r="5"
                  fill="#1D4ED8" stroke="white" strokeWidth="1.5" />
              </>
            )}
          </svg>

          {/* Right panel: percentages + zone key */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Gas percentages */}
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">
                Relative percentages
              </p>
              <div className="space-y-1.5">
                {[
                  { label: '%CH₄',  val: pct.ch4,  color: '#CA8A04' },
                  { label: '%C₂H₄', val: pct.c2h4, color: '#EA580C' },
                  { label: '%C₂H₂', val: pct.c2h2, color: '#7C3AED' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-14">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full"
                        style={{ width: `${Math.max(1, val)}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs font-mono font-medium w-12 text-right">
                      {val.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active zone callout */}
            {activeZone && (
              <div className="rounded-lg p-2.5 text-xs"
                style={{
                  backgroundColor: ZONES.find(z => z.id === activeZone)?.fill,
                  borderLeft: `3px solid ${ZONES.find(z => z.id === activeZone)?.stroke}`,
                }}>
                <p className="font-bold" style={{ color: ZONES.find(z => z.id === activeZone)?.stroke }}>
                  Zone: {activeZone}
                </p>
                <p className="text-gray-600 mt-0.5 text-[11px]">
                  {ZONE_DESCRIPTIONS[activeZone]}
                </p>
              </div>
            )}

            {/* Legend */}
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Zone legend</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {ZONES.filter(z => z.id !== 'PD').map(z => (
                  <div key={z.id} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border"
                      style={{ backgroundColor: z.fill, borderColor: z.stroke }} />
                    <span className="font-semibold" style={{ color: z.stroke }}>{z.id}</span>
                    <span className="text-gray-500 truncate">{z.id === 'D2' ? 'H-E Discharge' : z.id === 'D1' ? 'L-E Discharge' : z.id === 'DT' ? 'Disc.+Thermal' : z.id === 'T3' ? '>700°C' : z.id === 'T2' ? '300–700°C' : '<300°C'}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-gray-400">
              Point = current sample position.<br />
              IEC 60599:2022 Annex A · Duval (2002)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
