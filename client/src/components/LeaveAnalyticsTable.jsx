import React, { useState } from 'react';

const CATEGORIES = {
  SL: '#ef4444', PL: '#22c55e', CGL: '#f59e0b', PH: '#8b5cf6',
  TFL: '#06b6d4', CO: '#ec4899', WCO: '#f97316', WS: '#6366f1',
};

const FY_MONTH_ORDER = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function fyLabel(startYear) {
  return `FY${startYear}-${String(startYear + 1).slice(2)}`;
}

function MemberCell({ name }) {
  return (
    <td className="dash-td name-col">
      <div className="dash-avatar">{name.charAt(0)}</div>
      <span>{name}</span>
    </td>
  );
}

function ZeroCell() {
  return <span className="zero">—</span>;
}

function YearSummaryView({ members, yearSummary, catMax }) {
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
    <table className="dashboard-table">
      <thead>
        <tr>
          <th className="dash-th name-col">Member</th>
          {Object.keys(CATEGORIES).map(c => (
            <th key={c} className="dash-th cat-col" style={{ borderBottom: `3px solid ${CATEGORIES[c]}` }}>
              <span className="cat-dot" style={{ background: CATEGORIES[c] }} />{c}
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
              <MemberCell name={m} />
              {Object.keys(CATEGORIES).map(c => (
                <td key={c} className="dash-td cat-cell" style={cellStyle(c, row[c])}>
                  {row[c] || <ZeroCell />}
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
                {sum || <ZeroCell />}
              </td>
            );
          })}
          <td className="dash-td total-cell" style={{ color: '#00d4ff', fontWeight: 800 }}>
            {members.reduce((acc, m) => acc + (yearSummary[m]?.total || 0), 0)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function MonthlyBreakdownView({ members, monthlyBreakdown, monthMax, selectedFY }) {
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
              <MemberCell name={m} />
              {FY_MONTH_ORDER.map(mi => (
                <td key={mi} className="dash-td month-cell" style={monthCellStyle(row[mi])}>
                  {row[mi] || <ZeroCell />}
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
                {sum || <ZeroCell />}
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
  );
}

export default function LeaveAnalyticsTable({
  members, yearSummary, monthlyBreakdown, catMax, monthMax, selectedFY,
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const fyStart = `Jul ${selectedFY}`;
  const fyEnd   = `Jun ${selectedFY + 1}`;

  const tabs = [
    { id: 'summary', label: 'Annual' },
    { id: 'monthly', label: 'Monthly' },
  ];
  const activeIdx = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="dashboard-section">
      <div className="lat-header">
        <div className="lat-title">
          📊 Employee Leave Analytics
          {' '}&nbsp;<span className="section-subtitle">({fyStart} – {fyEnd})</span>
        </div>
        <div className="lat-toggle" style={{ '--tab-idx': activeIdx, '--tab-count': tabs.length }}>
          {tabs.map((t, i) => (
            <button
              key={t.id}
              className={`lat-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-table-wrap">
        <div className={`lat-view${activeTab === 'summary' ? ' lat-view-visible' : ' lat-view-hidden'}`}>
          <YearSummaryView members={members} yearSummary={yearSummary} catMax={catMax} />
        </div>
        <div className={`lat-view${activeTab === 'monthly' ? ' lat-view-visible' : ' lat-view-hidden'}`}>
          <MonthlyBreakdownView
            members={members}
            monthlyBreakdown={monthlyBreakdown}
            monthMax={monthMax}
            selectedFY={selectedFY}
          />
        </div>
      </div>
    </div>
  );
}
