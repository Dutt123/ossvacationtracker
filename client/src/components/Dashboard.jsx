import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { CATEGORIES, FY_MONTH_ORDER, getFYStart, fyLabel } from './dashboardUtils';
import YearSummaryTable from './YearSummaryTable';
import MonthlyBreakdownTable from './MonthlyBreakdownTable';
import MonthlyTrendChart from './MonthlyTrendChart';
import InsightsSection from './InsightsSection';

export default function Dashboard({ members: rawMembers, leaves }) {
  const members = useMemo(() => [...rawMembers].sort((a, b) => a.localeCompare(b)), [rawMembers]);
  const currentFY = getFYStart(dayjs());
  const [selectedFY, setSelectedFY] = useState(currentFY);

  const approvedLeaves = useMemo(
    () => leaves.filter(l => l.status === 'approved'),
    [leaves]
  );

  const fyYears = useMemo(() => {
    const ys = new Set();
    approvedLeaves.forEach(l => ys.add(getFYStart(l.date)));
    ys.add(currentFY);
    return [...ys].sort((a, b) => b - a);
  }, [approvedLeaves, currentFY]);

  function inSelectedFY(dateStr) {
    return getFYStart(dateStr) === selectedFY;
  }

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

  const slPerMonth = useMemo(() => {
    const counts = {};
    FY_MONTH_ORDER.forEach(mi => { counts[mi] = 0; });
    approvedLeaves.forEach(l => {
      if (l.category !== 'SL') return;
      if (!inSelectedFY(l.date)) return;
      counts[dayjs(l.date).month()] = (counts[dayjs(l.date).month()] || 0) + 1;
    });
    return FY_MONTH_ORDER.map(mi => counts[mi]);
  }, [approvedLeaves, selectedFY]);

  const fyStart = `Jul ${selectedFY}`;
  const fyEnd = `Jun ${selectedFY + 1}`;

  return (
    <div className="dashboard-container">
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

      <YearSummaryTable
        members={members}
        yearSummary={yearSummary}
        catMax={catMax}
        selectedFY={selectedFY}
      />

      <MonthlyBreakdownTable
        members={members}
        monthlyBreakdown={monthlyBreakdown}
        monthMax={monthMax}
        selectedFY={selectedFY}
      />

      <InsightsSection
        members={members}
        yearSummary={yearSummary}
        monthlyBreakdown={monthlyBreakdown}
        slPerMonth={slPerMonth}
        selectedFY={selectedFY}
      />

      <MonthlyTrendChart
        members={members}
        monthlyBreakdown={monthlyBreakdown}
        selectedFY={selectedFY}
      />

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
