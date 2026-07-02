import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import DashboardAnalytics from './DashboardAnalytics';
import LeaveAnalyticsTable from './LeaveAnalyticsTable';

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
      <DashboardAnalytics
        members={members}
        leaves={approvedLeaves}
        excludeFromOnDuty={[]}
        selectedFY={selectedFY}
      />

      <LeaveAnalyticsTable
        members={members}
        yearSummary={yearSummary}
        monthlyBreakdown={monthlyBreakdown}
        catMax={catMax}
        monthMax={monthMax}
        selectedFY={selectedFY}
      />

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
