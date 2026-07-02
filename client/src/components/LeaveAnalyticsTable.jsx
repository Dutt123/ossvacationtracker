import React, { useState, useRef, useCallback } from 'react';

const CATEGORIES = {
  SL: '#a8403a', // muted rose-red
  PL: '#2d7a4f', // muted forest green
  CGL: '#a06820', // muted amber-brown
  PH: '#5e3f9e', // muted indigo-purple
  TFL: '#1a7a8a', // muted teal
  CO: '#8f3d6b', // muted mauve-pink
  WCO: '#a04f1a', // muted burnt orange
};

const CATEGORY_NAMES = {
  SL: 'Sick Leave', PL: 'Planned Leave', CGL: 'Caregiver Leave',
  PH: 'Public Holiday', TFL: 'Time For Learning', CO: 'Comp Off',
  WCO: 'Weekend Comp Off',
};

const FY_MONTH_ORDER = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function ZeroCell() {
  return <span className="zero">—</span>;
}

// ── Annual stacked horizontal bar chart ───────────────────────────────────────

function NameCell({ name, hovered, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <div
      className={`lat-name-cell${hovered ? ' lat-name-cell-hovered' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="dash-avatar lat-bar-avatar">{name.charAt(0)}</div>
      <span>{name}</span>
    </div>
  );
}

function AnnualOverviewChart({ members, yearSummary, hoveredMember, setHoveredMember, onBarClick }) {
  const [tooltip, setTooltip] = useState(null);
  const chartRef = useRef(null);

  const rows = members.map(m => {
    const row = yearSummary[m] || {};
    const segments = Object.keys(CATEGORIES)
      .map(c => ({ key: c, count: row[c] || 0, color: CATEGORIES[c] }))
      .filter(s => s.count > 0);
    const total = segments.reduce((s, v) => s + v.count, 0);
    return { member: m, segments, total };
  }).sort((a, b) => b.total - a.total);

  const maxTotal = Math.max(1, ...rows.map(r => r.total));

  function handleSegmentEnter(e, member, key, count, total, color) {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, member, key, count, total, color });
    setHoveredMember(member);
  }

  function handleSegmentLeave() {
    setTooltip(null);
    setHoveredMember(null);
  }

  return (
    <div className="lat-body">
      <div className="lat-chart-header">
        <span className="lat-chart-member-label">Member</span>
        <div className="lat-chart-legend">
          {Object.entries(CATEGORIES).map(([code, color]) => (
            <span key={code} className="lat-legend-item">
              <span className="lat-legend-dot" style={{ background: color }} />
              {code}
            </span>
          ))}
        </div>
      </div>
      <div className="lat-chart-wrap" ref={chartRef}>
        {rows.map(({ member, segments, total }) => {
          const pct = (total / maxTotal) * 100;
          return (
            <div
              key={member}
              className={`lat-bar-row${hoveredMember === member ? ' lat-bar-row-hovered' : ''}`}
            >
              <NameCell
                name={member}
                hovered={hoveredMember === member}
                onClick={() => onBarClick(member)}
                onMouseEnter={() => setHoveredMember(member)}
                onMouseLeave={() => setHoveredMember(null)}
              />
              <div className="lat-bar-track">
                <div className="lat-bar-fill" style={{ width: `${pct}%` }}>
                  {segments.map(({ key, count, color }) => {
                    const segPct = (count / total) * 100;
                    return (
                      <div
                        key={key}
                        className="lat-bar-seg"
                        style={{ width: `${segPct}%`, background: color }}
                        onMouseEnter={e => handleSegmentEnter(e, member, key, count, total, color)}
                        onMouseLeave={handleSegmentLeave}
                      >
                        {segPct >= 8 && (
                          <span className="lat-bar-seg-label">{count}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {total > 0 && <span className="lat-bar-total">{total}</span>}
              </div>
            </div>
          );
        })}

        {tooltip && (
          <div className="lat-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
            <div className="lat-tooltip-member">{tooltip.member}</div>
            <div className="lat-tooltip-row">
              <span className="lat-tooltip-dot" style={{ background: tooltip.color }} />
              <span>{tooltip.key} – {CATEGORY_NAMES[tooltip.key]}</span>
            </div>
            <div className="lat-tooltip-row">
              <span className="lat-tooltip-label">Leave Days</span>
              <span className="lat-tooltip-val">{tooltip.count}</span>
            </div>
            <div className="lat-tooltip-row">
              <span className="lat-tooltip-label">Total Leave</span>
              <span className="lat-tooltip-val">{tooltip.total}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Annual data table ─────────────────────────────────────────────────────────

function YearSummaryView({ members, yearSummary, catMax, hoveredMember, setHoveredMember, rowRefs }) {
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
    <div className="lat-body">
      <div className="dashboard-table-wrap">
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
            {members.map(m => (
              <tr
                key={m}
                ref={el => { rowRefs.current[m] = el; }}
                className={`dash-row${hoveredMember === m ? ' lat-row-highlighted' : ''}`}
                onMouseEnter={() => setHoveredMember(m)}
                onMouseLeave={() => setHoveredMember(null)}
              >
                <td className="dash-td name-col">
                  <NameCell name={m} hovered={hoveredMember === m} />
                </td>
                {Object.keys(CATEGORIES).map(c => {
                  const row = yearSummary[m] || {};
                  return (
                    <td key={c} className="dash-td cat-cell" style={cellStyle(c, row[c])}>
                      {row[c] || <ZeroCell />}
                    </td>
                  );
                })}
                <td className="dash-td total-cell">{(yearSummary[m] || {}).total || 0}</td>
              </tr>
            ))}
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
      </div>
    </div>
  );
}

// ── Monthly data table ────────────────────────────────────────────────────────

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
    <div className="lat-body">
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
                    <NameCell name={m} />
                  </td>
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
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LeaveAnalyticsTable({
  members, yearSummary, monthlyBreakdown, catMax, monthMax, selectedFY,
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const [activeView, setActiveView] = useState('visual');
  const [hoveredMember, setHoveredMember] = useState(null);
  const rowRefs = useRef({});

  const fyStart = `Jul ${selectedFY}`;
  const fyEnd   = `Jun ${selectedFY + 1}`;

  const periodTabs = [
    { id: 'summary', label: 'Annual'  },
    { id: 'monthly', label: 'Monthly' },
  ];
  const viewTabs = [
    { id: 'visual', label: 'Visual' },
    { id: 'data',   label: 'Data'   },
  ];

  const periodIdx = periodTabs.findIndex(t => t.id === activeTab);
  const viewIdx   = viewTabs.findIndex(t => t.id === activeView);

  // When switching to Monthly, force Data view since Visual is Annual-only
  function handlePeriodChange(id) {
    setActiveTab(id);
    if (id === 'monthly') setActiveView('data');
  }

  const handleBarClick = useCallback((member) => {
    setActiveView('data');
    setTimeout(() => {
      const el = rowRefs.current[member];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  return (
    <div className="dashboard-section">
      <div className="lat-header">
        <div className="lat-title">
          📊 Employee Leave Analytics
          {' '}&nbsp;<span className="section-subtitle">({fyStart} – {fyEnd})</span>
        </div>
        <div className="lat-header-controls">
          <div className="lat-toggle" style={{ '--tab-idx': periodIdx }}>
            {periodTabs.map(t => (
              <button
                key={t.id}
                className={`lat-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => handlePeriodChange(t.id)}
              >{t.label}</button>
            ))}
          </div>
          {activeTab === 'summary' && (
            <div className="lat-toggle" style={{ '--tab-idx': viewIdx }}>
              {viewTabs.map(t => (
                <button
                  key={t.id}
                  className={`lat-tab${activeView === t.id ? ' active' : ''}`}
                  onClick={() => setActiveView(t.id)}
                >{t.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'summary' && activeView === 'visual' && (
        <AnnualOverviewChart
          members={members}
          yearSummary={yearSummary}
          hoveredMember={hoveredMember}
          setHoveredMember={setHoveredMember}
          onBarClick={handleBarClick}
        />
      )}

      {(activeTab === 'monthly' || activeView === 'data') && (
        activeTab === 'summary' ? (
          <YearSummaryView
            members={members}
            yearSummary={yearSummary}
            catMax={catMax}
            hoveredMember={hoveredMember}
            setHoveredMember={setHoveredMember}
            rowRefs={rowRefs}
          />
        ) : (
          <MonthlyBreakdownView
            members={members}
            monthlyBreakdown={monthlyBreakdown}
            monthMax={monthMax}
            selectedFY={selectedFY}
          />
        )
      )}
    </div>
  );
}
