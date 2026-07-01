import React, { useMemo } from 'react';
import { CATEGORIES, FY_MONTH_ORDER, MONTH_LABELS } from './dashboardUtils';

function monthLabel(mi, selectedFY) {
  const yr = mi >= 6 ? String(selectedFY).slice(2) : String(selectedFY + 1).slice(2);
  return `${MONTH_LABELS[mi]} '${yr}`;
}

export default function InsightsSection({ members, yearSummary, monthlyBreakdown, slPerMonth, selectedFY }) {
  const insights = useMemo(() => {
    const totalMembers = members.length || 1;

    const leavesPerMonth = FY_MONTH_ORDER.map(mi =>
      members.reduce((sum, m) => sum + (monthlyBreakdown[m]?.[mi] || 0), 0)
    );
    const staffingPerMonth = leavesPerMonth.map(l => Math.max(0, totalMembers - l));

    const peakLeaveIdx = leavesPerMonth.indexOf(Math.max(...leavesPerMonth));
    const lowestStaffIdx = staffingPerMonth.indexOf(Math.min(...staffingPerMonth));
    const highestStaffIdx = staffingPerMonth.indexOf(Math.max(...staffingPerMonth));

    const topMember = members.reduce(
      (best, m) => (yearSummary[m]?.total || 0) > (yearSummary[best]?.total || 0) ? m : best,
      members[0] || ''
    );

    const catTotals = Object.keys(CATEGORIES).map(c => ({
      c,
      count: members.reduce((sum, m) => sum + (yearSummary[m]?.[c] || 0), 0),
    }));
    const topCat = catTotals.reduce((best, x) => x.count > best.count ? x : best, catTotals[0]);

    const peakSlIdx = slPerMonth.indexOf(Math.max(...slPerMonth));

    const riskMonths = FY_MONTH_ORDER.filter((_, i) =>
      (staffingPerMonth[i] / totalMembers) * 100 < 75
    );

    const lowestStaffPct = Math.round((staffingPerMonth[lowestStaffIdx] / totalMembers) * 100);

    return {
      topMember,
      topMemberTotal: yearSummary[topMember]?.total || 0,
      peakLeaveMonth: FY_MONTH_ORDER[peakLeaveIdx],
      peakLeaveCount: leavesPerMonth[peakLeaveIdx],
      lowestStaffMonth: FY_MONTH_ORDER[lowestStaffIdx],
      lowestStaffCount: staffingPerMonth[lowestStaffIdx],
      lowestStaffPct,
      highestStaffMonth: FY_MONTH_ORDER[highestStaffIdx],
      highestStaffCount: staffingPerMonth[highestStaffIdx],
      topCat,
      peakSlMonth: FY_MONTH_ORDER[peakSlIdx],
      peakSlCount: slPerMonth[peakSlIdx] || 0,
      riskMonths,
    };
  }, [members, yearSummary, monthlyBreakdown, slPerMonth, selectedFY]);

  const cards = [
    {
      icon: '🏆',
      title: 'Most Leave Taken',
      value: insights.topMember || '—',
      desc: insights.topMemberTotal
        ? `${insights.topMemberTotal} day${insights.topMemberTotal !== 1 ? 's' : ''} approved this FY`
        : 'No leaves recorded',
      accent: '#f59e0b',
    },
    {
      icon: '📅',
      title: 'Peak Leave Month',
      value: insights.peakLeaveCount > 0 ? monthLabel(insights.peakLeaveMonth, selectedFY) : '—',
      desc: insights.peakLeaveCount > 0
        ? `${insights.peakLeaveCount} leave${insights.peakLeaveCount !== 1 ? 's' : ''} across the team`
        : 'No leaves recorded',
      accent: '#64748b',
    },
    {
      icon: '📉',
      title: 'Lowest Staffing Month',
      value: monthLabel(insights.lowestStaffMonth, selectedFY),
      desc: `${insights.lowestStaffCount} of ${members.length} staff on duty`,
      accent: '#64748b',
    },
    {
      icon: '📈',
      title: 'Highest Staffing Month',
      value: monthLabel(insights.highestStaffMonth, selectedFY),
      desc: `${insights.highestStaffCount} of ${members.length} staff on duty`,
      accent: '#64748b',
    },
    {
      icon: '🗂️',
      title: 'Most Common Leave Type',
      value: insights.topCat?.count > 0 ? insights.topCat.c : '—',
      desc: insights.topCat?.count > 0
        ? `${insights.topCat.count} instance${insights.topCat.count !== 1 ? 's' : ''} this FY`
        : 'No leaves recorded',
      accent: '#64748b',
    },
    {
      icon: '🤒',
      title: 'Peak Sick Leave Month',
      value: insights.peakSlCount > 0 ? monthLabel(insights.peakSlMonth, selectedFY) : '—',
      desc: insights.peakSlCount > 0
        ? `${insights.peakSlCount} SL day${insights.peakSlCount !== 1 ? 's' : ''} across the team`
        : 'No sick leave recorded',
      accent: '#64748b',
    },
    {
      icon: insights.riskMonths.length > 0 ? '⚠️' : '✅',
      title: 'Staffing Risk',
      value: insights.riskMonths.length > 0
        ? `${monthLabel(insights.lowestStaffMonth, selectedFY)} — ${insights.lowestStaffPct}%`
        : 'All Clear',
      desc: insights.riskMonths.length > 0
        ? `Lowest staffing · ${insights.riskMonths.length} month${insights.riskMonths.length !== 1 ? 's' : ''} below 75% capacity`
        : 'No staffing risks detected',
      accent: insights.riskMonths.length > 0 ? '#ef4444' : '#22c55e',
    },
  ];

  return (
    <div className="dashboard-section">
      <div className="dashboard-section-title">💡 Insights</div>
      <div className="insights-grid">
        {cards.map(card => (
          <div key={card.title} className="insight-card" style={{ '--insight-accent': card.accent }}>
            <div className="insight-icon">{card.icon}</div>
            <div className="insight-body">
              <div className="insight-title">{card.title}</div>
              <div className="insight-value" style={{ color: card.accent }}>{card.value}</div>
              <div className="insight-desc">{card.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
