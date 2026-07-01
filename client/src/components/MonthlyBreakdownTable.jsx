import React from 'react';
import { FY_MONTH_ORDER, MONTH_LABELS, fyLabel, hexToRgba } from './dashboardUtils';

export default function MonthlyBreakdownTable({ members, monthlyBreakdown, monthMax, selectedFY }) {
  const fyStart = `Jul ${selectedFY}`;
  const fyEnd = `Jun ${selectedFY + 1}`;

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

  return (
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
  );
}
