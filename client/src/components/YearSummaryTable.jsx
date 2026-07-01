import React from 'react';
import { CATEGORIES, fyLabel, hexToRgba } from './dashboardUtils';

export default function YearSummaryTable({ members, yearSummary, catMax, selectedFY }) {
  const fyStart = `Jul ${selectedFY}`;
  const fyEnd = `Jun ${selectedFY + 1}`;

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

  return (
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
                  <td className="dash-td total-cell">{row.total || 0}</td>
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
  );
}
