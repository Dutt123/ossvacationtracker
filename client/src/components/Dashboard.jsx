import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';

const CATEGORIES = {
  SL: '#ef4444',
  PL: '#22c55e',
  CGL: '#f59e0b',
  PH: '#8b5cf6',
  TFL: '#06b6d4',
  CO: '#ec4899',
  WCO: '#f97316',
  WS: '#6366f1',
};

// FY runs Jul(6) → Jun(5) of next year
// Ordered month indices for display: Jul=6, Aug=7, ..., Dec=11, Jan=0, ..., Jun=5
const FY_MONTH_ORDER = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Returns the FY start year for a given date
// Jul–Dec of year Y  → FY start = Y
// Jan–Jun of year Y  → FY start = Y - 1
function getFYStart(date) {
  const d = dayjs(date);
  return d.month() >= 6 ? d.year() : d.year() - 1;
}

// Returns FY label string
function fyLabel(startYear) {
  return `FY${startYear}-${String(startYear + 1).slice(2)}`;
}

export default function Dashboard({ members, leaves }) {
  const currentFY = getFYStart(dayjs());
  const [selectedFY, setSelectedFY] = useState(currentFY);

  const approvedLeaves = useMemo(
    () => leaves.filter(l => l.status === 'approved'),
    [leaves]
  );

  // Detect all FY start years present in the data
  const fyYears = useMemo(() => {
    const ys = new Set();
    approvedLeaves.forEach(l => ys.add(getFYStart(l.date)));
    ys.add(currentFY);
    return [...ys].sort((a, b) => b - a);
  }, [approvedLeaves, currentFY]);

  // Is a leave date within the selected FY?
  function inSelectedFY(dateStr) {
    return getFYStart(dateStr) === selectedFY;
  }

  // Year summary: { member: { CAT: count, total: count } }
  const yearSummary = useMemo(() => {
    const summary = {};
    members.forEach(m => {
      summary[m] = { total: 0 };
      Object.keys(CATEGORIES).forEach(c => { summary[m][c] = 0; });
    });
    approvedLeaves.forEach(l => {
      if (!summary[l.member]) return;
      if (!inSelectedFY(l.date)) return;
      summary[l.member][l.category] = (summary[l.member][l.category] || 0) + 1;
      summary[l.member].total += 1;
    });
    return summary;
  }, [approvedLeaves, members, selectedFY]);

  // Monthly breakdown: { member: { monthIndex(0-11): count } }
  // monthIndex is the JS Date month (0=Jan … 11=Dec)
  const monthlyBreakdown = useMemo(() => {
    const breakdown = {};
    members.forEach(m => {
      breakdown[m] = {};
      for (let i = 0; i < 12; i++) breakdown[m][i] = 0;
    });
    approvedLeaves.forEach(l => {
      if (!breakdown[l.member]) return;
      if (!inSelectedFY(l.date)) return;
      breakdown[l.member][dayjs(l.date).month()] += 1;
    });
    return breakdown;
  }, [approvedLeaves, members, selectedFY]);

  // Heatmap: max per category
  const catMax = useMemo(() => {
    const mx = {};
    Object.keys(CATEGORIES).forEach(c => {
      mx[c] = Math.max(1, ...members.map(m => yearSummary[m]?.[c] || 0));
    });
    return mx;
  }, [yearSummary, members]);

  const monthMax = useMemo(() => {
    return Math.max(1, ...members.flatMap(m => Object.values(monthlyBreakdown[m] || {})));
  }, [monthlyBreakdown, members]);

  function cellStyle(category, count) {
    if (!count) return {};
    const color = CATEGORIES[category];
    const intensity = Math.min(0.85, 0.15 + (count / catMax[category]) * 0.7);
    return {
      background: hexToRgba(color, intensity),
      border: `1px solid ${hexToRgba(color, intensity + 0.2)}`,
      color: '#f1f5f9',
      fontWeight: 700,
    };
  }

  function monthCellStyle(count) {
    if (!count) return {};
    const intensity = Math.min(0.85, 0.15 + (count / monthMax) * 0.7);
    return {
      background: hexToRgba('#00d4ff', intensity),
      border: `1px solid ${hexToRgba('#00d4ff', intensity + 0.2)}`,
      color: intensity > 0.5 ? '#0f172a' : '#f1f5f9',
      fontWeight: 700,
    };
  }

  const fyStart = `Jul ${selectedFY}`;
  const fyEnd = `Jun ${selectedFY + 1}`;

  return (
    <div className="dashboard-container">
      {/* FY selector */}
      <div className="dashboard-controls">
        <div className="dashboard-year-selector">
          {fyYears.map(y => (
            <button
              key={y}
              className={`year-btn${selectedFY === y ? ' active' : ''}`}
              onClick={() => setSelectedFY(y)}
            >
              {fyLabel(y)}
            </button>
          ))}
        </div>
        <div className="dashboard-subtitle">
          <span>{fyLabel(selectedFY)}</span> &nbsp;·&nbsp; {fyStart} – {fyEnd}
        </div>
      </div>

      {/* Analytics Section */}
      <div className="dashboard-section">
        <div className="dashboard-section-title">📈 Analytics coming soon</div>
      </div>

      {/* Year Summary Table */}
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          📊 Year Summary — {fyLabel(selectedFY)} &nbsp;
          <span className="section-subtitle">({fyStart} – {fyEnd})</span>
        </div>
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th className="dash-th name-col">Member</th>
                {Object.keys(CATEGORIES).map(c => (
                  <th key={c} className="dash-th cat-col" style={{ borderBottom: `3px solid ${CATEGORIES[c]}` }}>
                    <span className="cat-dot" style={{ background: CATEGORIES[c] }} />
                    {c}
                  </th>
                ))}
                <th className="dash-th total-col">Total</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const row = yearSummary[m] || {};
                return (
                  <tr key={m} className="dash-row">
                    <td className="dash-td name-col">
                      <div className="dash-avatar">{m.charAt(0)}</div>
                      <span>{m}</span>
                    </td>
                    {Object.keys(CATEGORIES).map(c => (
                      <td key={c} className="dash-td cat-cell" style={cellStyle(c, row[c])}>
                        {row[c] || <span className="zero">—</span>}
                      </td>
                    ))}
                    <td className="dash-td total-cell">
                      {row.total || 0}
                    </td>
                  </tr>
                );
              })}
              <tr className="dash-row totals-row">
                <td className="dash-td name-col">
                  <span style={{ color: '#00d4ff', fontWeight: 800 }}>Team Total</span>
                </td>
                {Object.keys(CATEGORIES).map(c => {
                  const sum = members.reduce((acc, m) => acc + (yearSummary[m]?.[c] || 0), 0);
                  return (
                    <td key={c} className="dash-td cat-cell" style={sum ? { color: CATEGORIES[c], fontWeight: 800 } : {}}>
                      {sum || <span className="zero">—</span>}
                    </td>
                  );
                })}
                <td className="dash-td total-cell" style={{ color: '#00d4ff', fontWeight: 800 }}>
                  {members.reduce((acc, m) => acc + (yearSummary[m]?.total || 0), 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Breakdown Table — columns in FY order: Jul Aug Sep Oct Nov Dec Jan Feb Mar Apr May Jun */}
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          📅 Monthly Breakdown — {fyLabel(selectedFY)} &nbsp;
          <span className="section-subtitle">({fyStart} – {fyEnd})</span>
        </div>
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th className="dash-th name-col">Member</th>
                {FY_MONTH_ORDER.map(mi => (
                  <th key={mi} className="dash-th month-col">
                    {MONTH_LABELS[mi]}
                    <div className="month-year-hint">
                      {mi >= 6 ? `'${String(selectedFY).slice(2)}` : `'${String(selectedFY + 1).slice(2)}`}
                    </div>
                  </th>
                ))}
                <th className="dash-th total-col">Total</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const row = monthlyBreakdown[m] || {};
                const total = FY_MONTH_ORDER.reduce((acc, mi) => acc + (row[mi] || 0), 0);
                return (
                  <tr key={m} className="dash-row">
                    <td className="dash-td name-col">
                      <div className="dash-avatar">{m.charAt(0)}</div>
                      <span>{m}</span>
                    </td>
                    {FY_MONTH_ORDER.map(mi => (
                      <td key={mi} className="dash-td month-cell" style={monthCellStyle(row[mi])}>
                        {row[mi] || <span className="zero">—</span>}
                      </td>
                    ))}
                    <td className="dash-td total-cell">{total}</td>
                  </tr>
                );
              })}
              <tr className="dash-row totals-row">
                <td className="dash-td name-col">
                  <span style={{ color: '#00d4ff', fontWeight: 800 }}>Team Total</span>
                </td>
                {FY_MONTH_ORDER.map(mi => {
                  const sum = members.reduce((acc, m) => acc + (monthlyBreakdown[m]?.[mi] || 0), 0);
                  return (
                    <td key={mi} className="dash-td month-cell" style={{ ...monthCellStyle(sum), color: '#f1f5f9', fontWeight: 800 }}>
                      {sum || <span className="zero">—</span>}
                    </td>
                  );
                })}
                <td className="dash-td total-cell" style={{ color: '#00d4ff', fontWeight: 800 }}>
                  {members.reduce((acc, m) =>
                    acc + FY_MONTH_ORDER.reduce((s, mi) => s + (monthlyBreakdown[m]?.[mi] || 0), 0), 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Legend */}
      <div className="dashboard-legend">
        {Object.entries(CATEGORIES).map(([code, color]) => (
          <div key={code} className="dash-legend-item">
            <div className="dash-legend-dot" style={{ background: color }} />
            <span>{code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
