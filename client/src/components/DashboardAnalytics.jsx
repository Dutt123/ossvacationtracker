import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = {
  SL:  '#ef4444',
  PL:  '#22c55e',
  CGL: '#f59e0b',
  PH:  '#8b5cf6',
  TFL: '#06b6d4',
  CO:  '#ec4899',
  WCO: '#f97316',
  WS:  '#6366f1',
};

const CATEGORY_NAMES = {
  SL: 'Sick Leave', PL: 'Planned Leave', CGL: 'Caregiver Leave',
  PH: 'Public Holiday', TFL: 'Time For Learning', CO: 'Comp Off',
  WCO: 'Weekend Comp Off', WS: 'Weekend Shift',
};

const FY_MONTH_ORDER = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const MONTH_LABELS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FY_MONTH_LABELS = FY_MONTH_ORDER.map(m => MONTH_LABELS[m]);

// ─── Shared chart defaults ────────────────────────────────────────────────────

const FONT = 'Manrope, sans-serif';

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: 'easeInOutQuart' },
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { size: 12, family: FONT, weight: '600' }, boxWidth: 14, padding: 16 },
    },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: 'rgba(0,212,255,0.4)',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      titleFont: { family: FONT, weight: '700', size: 12 },
      bodyColor: '#94a3b8',
      bodyFont: { family: FONT, weight: '500', size: 12 },
      padding: 12,
      cornerRadius: 10,
    },
  },
};

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Helper calculations ──────────────────────────────────────────────────────

function useAnalytics(members, leaves, excludeFromOnDuty, selectedFY) {
  return useMemo(() => {
    const fyLeaves = leaves.filter(l => {
      if (l.status !== 'approved') return false;
      const d = new Date(l.date);
      const m = d.getMonth();
      const y = d.getFullYear();
      const fyStart = m >= 6 ? y : y - 1;
      return fyStart === selectedFY;
    });

    // --- KPI -----------------------------------------------------------------
    const totalDays   = fyLeaves.length;
    const plDays      = fyLeaves.filter(l => l.category === 'PL').length;
    const slDays      = fyLeaves.filter(l => l.category === 'SL').length;

    // avg staffing across the FY months
    const eligibleMembers = members.filter(m => !excludeFromOnDuty.includes(m));
    const total = eligibleMembers.length || 1;

    const monthlyOnLeave = {};
    FY_MONTH_ORDER.forEach(mi => { monthlyOnLeave[mi] = new Set(); });
    fyLeaves.forEach(l => {
      if (!eligibleMembers.includes(l.member)) return;
      const mi = new Date(l.date).getMonth();
      if (monthlyOnLeave[mi]) monthlyOnLeave[mi].add(l.date + '|' + l.member);
    });

    // staffing per month = avg daily staffing (approx: total - onLeavePerDay)
    // simpler: for each month count unique leave-days / working-days-approx
    const monthlyStaffingPct = FY_MONTH_ORDER.map(mi => {
      const year = mi >= 6 ? selectedFY : selectedFY + 1;
      const daysInMonth = new Date(year, mi + 1, 0).getDate();
      const weekdays = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, mi, i + 1).getDay();
        return d !== 0 && d !== 6;
      }).filter(Boolean).length;
      if (weekdays === 0) return 100;

      // count total leave-slots for eligible members that month
      const leaveDays = fyLeaves.filter(l =>
        eligibleMembers.includes(l.member) &&
        new Date(l.date).getMonth() === mi &&
        new Date(l.date).getFullYear() === year
      ).length;

      const totalSlots  = total * weekdays;
      const onDutySlots = totalSlots - leaveDays;
      return Math.round((onDutySlots / totalSlots) * 100);
    });

    const avgStaffing = Math.round(monthlyStaffingPct.reduce((a, b) => a + b, 0) / 12);

    // --- Leave type distribution ---------------------------------------------
    const categoryTotals = {};
    Object.keys(CATEGORIES).forEach(c => { categoryTotals[c] = 0; });
    fyLeaves.forEach(l => { if (categoryTotals[l.category] !== undefined) categoryTotals[l.category]++; });

    // --- Monthly leave trend -------------------------------------------------
    const monthlyLeaveTrend = FY_MONTH_ORDER.map(mi => {
      const year = mi >= 6 ? selectedFY : selectedFY + 1;
      return fyLeaves.filter(l =>
        new Date(l.date).getMonth() === mi &&
        new Date(l.date).getFullYear() === year
      ).length;
    });

    // --- Monthly utilisation cards ------------------------------------------
    const monthlyCards = FY_MONTH_ORDER.map(mi => {
      const year = mi >= 6 ? selectedFY : selectedFY + 1;
      const monthLeaves = fyLeaves.filter(l =>
        new Date(l.date).getMonth() === mi &&
        new Date(l.date).getFullYear() === year
      );
      const catCount = {};
      monthLeaves.forEach(l => { catCount[l.category] = (catCount[l.category] || 0) + 1; });
      const mostCommon = Object.entries(catCount).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
      return {
        label: MONTH_LABELS[mi],
        year,
        totalLeave: monthLeaves.length,
        staffingPct: monthlyStaffingPct[FY_MONTH_ORDER.indexOf(mi)],
        mostCommon,
      };
    });

    // --- Leave by day of week (all categories) --------------------------------
    const leaveByDow = {};
    Object.keys(CATEGORIES).forEach(c => { leaveByDow[c] = [0, 0, 0, 0, 0]; });
    fyLeaves.forEach(l => {
      const dow = new Date(l.date).getDay();
      if (dow === 0 || dow === 6) return;
      const idx = dow - 1;
      if (leaveByDow[l.category]) leaveByDow[l.category][idx]++;
    });
    const dowDayTotals = [0, 1, 2, 3, 4].map(i =>
      Object.values(leaveByDow).reduce((s, arr) => s + arr[i], 0)
    );

    return {
      totalDays, plDays, slDays, avgStaffing,
      categoryTotals,
      monthlyLeaveTrend,
      monthlyStaffingPct,
      monthlyCards,
      leaveByDow, dowDayTotals,
    };
  }, [members, leaves, excludeFromOnDuty, selectedFY]);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICards({ totalDays, plDays, slDays, avgStaffing }) {
  const cards = [
    {
      icon: '📅',
      label: 'Total Leave Days',
      value: totalDays,
      color: '#00d4ff',
      sub: 'All leave types combined',
    },
    {
      icon: '✈️',
      label: 'Planned Leave (PL)',
      value: plDays,
      color: '#22c55e',
      sub: 'Approved planned leaves',
    },
    {
      icon: '🤒',
      label: 'Sick Leave (SL)',
      value: slDays,
      color: '#ef4444',
      sub: 'Approved sick leaves',
    },
    {
      icon: '👥',
      label: 'Avg Team Availability',
      value: `${avgStaffing}%`,
      color: avgStaffing >= 75 ? '#22c55e' : avgStaffing >= 50 ? '#f59e0b' : '#ef4444',
      sub: avgStaffing >= 75 ? 'Healthy staffing' : avgStaffing >= 50 ? 'Moderate staffing' : 'Low staffing',
    },
  ];

  return (
    <div className="an-kpi-grid">
      {cards.map(c => (
        <div key={c.label} className="an-kpi-card" style={{ '--kpi-color': c.color }}>
          <div className="an-kpi-icon">{c.icon}</div>
          <div className="an-kpi-body">
            <div className="an-kpi-label">{c.label}</div>
            <div className="an-kpi-value" style={{ color: c.color }}>{c.value}</div>
            <div className="an-kpi-sub">{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Custom plugin: draw count + % labels on each doughnut slice
const doughnutLabelPlugin = {
  id: 'doughnutLabels',
  afterDraw(chart) {
    const { ctx, data } = chart;
    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    if (!total) return;
    chart.getDatasetMeta(0).data.forEach((arc, i) => {
      const val = data.datasets[0].data[i];
      if (!val) return;
      const pct = Math.round((val / total) * 100);
      const { x, y } = arc.tooltipPosition();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px Manrope, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${val}`, x, y - 7);
      ctx.font = '10px Manrope, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`${pct}%`, x, y + 7);
      ctx.restore();
    });
  },
};

function LeaveDistributionChart({ categoryTotals }) {
  const labels = Object.keys(CATEGORIES).filter(c => categoryTotals[c] > 0);
  if (labels.length === 0) return <div className="an-no-data">No leave data for this period</div>;

  const data = {
    labels: labels.map(c => `${c} – ${CATEGORY_NAMES[c]}`),
    datasets: [{
      data: labels.map(c => categoryTotals[c]),
      backgroundColor: labels.map(c => hexToRgba(CATEGORIES[c], 0.8)),
      borderColor: labels.map(c => CATEGORIES[c]),
      borderWidth: 2,
      hoverOffset: 12,
    }],
  };

  const options = {
    ...CHART_DEFAULTS,
    cutout: '55%',
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: {
        ...CHART_DEFAULTS.plugins.legend,
        position: 'right',
        labels: {
          color: '#cbd5e1',
          font: { size: 12, family: FONT, weight: '600' },
          padding: 14,
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          generateLabels(chart) {
            const d = chart.data;
            return d.labels.map((label, i) => ({
              text: `${label}  (${d.datasets[0].data[i]})`,
              fillStyle: d.datasets[0].backgroundColor[i],
              strokeStyle: d.datasets[0].borderColor[i],
              fontColor: '#cbd5e1',
              color: '#cbd5e1',
              lineWidth: 1,
              hidden: false,
              index: i,
            }));
          },
        },
      },
      tooltip: {
        ...CHART_DEFAULTS.plugins.tooltip,
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = Math.round((ctx.raw / total) * 100);
            return ` ${ctx.label}: ${ctx.raw} days (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: 300, position: 'relative' }}>
      <Doughnut data={data} options={options} plugins={[doughnutLabelPlugin]} />
    </div>
  );
}

function MonthlyTrendChart({ monthlyLeaveTrend, monthlyStaffingPct }) {
  const staffingColors = monthlyStaffingPct.map(p => p >= 75 ? '#22c55e' : '#ef4444');

  const data = {
    labels: FY_MONTH_LABELS,
    datasets: [
      {
        label: 'Leave Days',
        data: monthlyLeaveTrend,
        borderColor: '#00d4ff',
        backgroundColor: hexToRgba('#00d4ff', 0.1),
        pointBackgroundColor: '#00d4ff',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.45,
        borderWidth: 2,
        yAxisID: 'yLeave',
      },
      {
        label: 'Staffing %',
        data: monthlyStaffingPct,
        borderColor: '#22c55e',
        backgroundColor: hexToRgba('#22c55e', 0.06),
        pointBackgroundColor: staffingColors,
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        yAxisID: 'yStaffing',
      },
      {
        label: '75% threshold',
        data: Array(12).fill(75),
        borderColor: hexToRgba('#f59e0b', 0.5),
        borderDash: [5, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0,
        yAxisID: 'yStaffing',
      },
    ],
  };

  const options = {
    ...CHART_DEFAULTS,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: FONT, weight: '600' },
          boxWidth: 10,
          padding: 12,
          usePointStyle: true,
          filter: item => item.text !== '75% threshold',
        },
      },
      tooltip: {
        ...CHART_DEFAULTS.plugins.tooltip,
        mode: 'index',
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label === '75% threshold') return null;
            return ctx.dataset.label === 'Staffing %'
              ? ` Staffing: ${ctx.raw}%`
              : ` Leave Days: ${ctx.raw}`;
          },
          filter: item => item.dataset.label !== '75% threshold',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(51,65,85,0.4)', drawBorder: false },
      },
      yLeave: {
        position: 'left',
        beginAtZero: true,
        ticks: { color: '#00d4ff', font: { size: 10 }, stepSize: 1 },
        grid: { color: 'rgba(51,65,85,0.4)', drawBorder: false },
        title: { display: true, text: 'Leave Days', color: '#00d4ff', font: { size: 10 } },
      },
      yStaffing: {
        position: 'right',
        min: 0,
        max: 100,
        ticks: { color: '#22c55e', font: { size: 10 }, callback: v => `${v}%` },
        grid: { display: false },
        title: { display: true, text: 'Staffing %', color: '#22c55e', font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height: 225, position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
}

function LeaveByDayOfWeekChart({ leaveByDow, dowDayTotals }) {
  const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const DAY_LABELS_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Find the busiest and quietest day
  const maxIdx = dowDayTotals.indexOf(Math.max(...dowDayTotals));
  const minIdx = dowDayTotals.indexOf(Math.min(...dowDayTotals.filter(v => v > 0)));
  const grandTotal = dowDayTotals.reduce((a, b) => a + b, 0);

  // Top-3 categories by total volume
  const catTotals = Object.keys(CATEGORIES).map(c => ({
    c,
    total: (leaveByDow[c] || []).reduce((a, b) => a + b, 0),
  })).sort((a, b) => b.total - a.total);
  const topCats = catTotals.filter(x => x.total > 0).slice(0, 3);

  const data = {
    labels: DAY_LABELS_SHORT,
    datasets: Object.keys(CATEGORIES)
      .filter(c => (leaveByDow[c] || []).some(v => v > 0))
      .map(c => ({
        label: `${c}`,
        data: leaveByDow[c] || [0, 0, 0, 0, 0],
        backgroundColor: hexToRgba(CATEGORIES[c], 0.80),
        borderColor: CATEGORIES[c],
        borderWidth: 1.5,
        borderRadius: 5,
        borderSkipped: false,
      })),
  };

  const options = {
    ...CHART_DEFAULTS,
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: FONT, weight: '600' },
          boxWidth: 10,
          padding: 14,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          generateLabels: chart =>
            chart.data.datasets.map((ds, i) => ({
              text: `${ds.label} – ${CATEGORY_NAMES[ds.label]}`,
              fillStyle: ds.backgroundColor,
              strokeStyle: ds.borderColor,
              fontColor: '#94a3b8',
              lineWidth: 1,
              hidden: false,
              index: i,
            })),
        },
      },
      tooltip: {
        ...CHART_DEFAULTS.plugins.tooltip,
        mode: 'index',
        callbacks: {
          title: items => DAY_LABELS_FULL[items[0]?.dataIndex] || '',
          label: ctx => {
            if (!ctx.raw) return null;
            const dayTotal = dowDayTotals[ctx.dataIndex] || 1;
            const pct = Math.round((ctx.raw / dayTotal) * 100);
            return `  ${ctx.dataset.label}: ${ctx.raw} days (${pct}%)`;
          },
          filter: item => item.raw > 0,
          afterBody: items => {
            const i = items[0]?.dataIndex;
            if (i === undefined || !dowDayTotals[i]) return [];
            return ['', `  Total: ${dowDayTotals[i]} days`];
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#cbd5e1', font: { size: 12, weight: '700' } },
        grid: { color: 'rgba(51,65,85,0.25)', drawBorder: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 11 }, stepSize: 1 },
        grid: { color: 'rgba(51,65,85,0.25)', drawBorder: false },
      },
    },
  };

  return (
    <div>
      {/* Summary stat pills */}
      <div className="an-dow-stats">
        {grandTotal > 0 && (
          <>
            <div className="an-dow-stat">
              <span className="an-dow-stat-label">Busiest</span>
              <span className="an-dow-stat-val" style={{ color: '#ef4444' }}>
                {DAY_LABELS_FULL[maxIdx]}
                <span className="an-dow-stat-sub"> · {dowDayTotals[maxIdx]} days</span>
              </span>
            </div>
            {minIdx >= 0 && minIdx !== maxIdx && (
              <div className="an-dow-stat">
                <span className="an-dow-stat-label">Quietest</span>
                <span className="an-dow-stat-val" style={{ color: '#22c55e' }}>
                  {DAY_LABELS_FULL[minIdx]}
                  <span className="an-dow-stat-sub"> · {dowDayTotals[minIdx]} days</span>
                </span>
              </div>
            )}
            {topCats.length > 0 && (
              <div className="an-dow-stat">
                <span className="an-dow-stat-label">Top types</span>
                <span className="an-dow-stat-val">
                  {topCats.map(({ c }) => (
                    <span key={c} className="an-dow-cat-pill" style={{ background: hexToRgba(CATEGORIES[c], 0.18), color: CATEGORIES[c], borderColor: hexToRgba(CATEGORIES[c], 0.5) }}>
                      {c}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {grandTotal === 0 ? (
        <div className="an-no-data">No weekday leave data for this period</div>
      ) : (
        <div style={{ height: 260, position: 'relative' }}>
          <Bar data={data} options={options} />
        </div>
      )}
    </div>
  );
}

function MonthlyUtilisationCards({ monthlyCards }) {
  return (
    <div className="an-util-grid">
      {monthlyCards.map(card => {
        const statusClass = card.staffingPct >= 75
          ? 'an-util-healthy'
          : card.staffingPct >= 50
          ? 'an-util-low'
          : 'an-util-critical';
        const statusLabel = card.staffingPct >= 75 ? 'Healthy' : card.staffingPct >= 50 ? 'Low' : 'Critical';
        const catColor = CATEGORIES[card.mostCommon] || '#64748b';

        return (
          <div key={card.label} className={`an-util-card ${statusClass}`}>
            <div className="an-util-month">{card.label} <span className="an-util-year">'{String(card.year).slice(2)}</span></div>
            <div className="an-util-staffing">{card.staffingPct}%</div>
            <div className="an-util-status-label">{statusLabel}</div>
            <div className="an-util-divider" />
            <div className="an-util-row">
              <span className="an-util-metric-label">Leave Days</span>
              <span className="an-util-metric-val">{card.totalLeave}</span>
            </div>
            <div className="an-util-row">
              <span className="an-util-metric-label">Top Type</span>
              <span className="an-util-cat-badge" style={{ background: hexToRgba(catColor, 0.2), borderColor: catColor, color: catColor }}>
                {card.mostCommon}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function AnalyticsSection({ title, children }) {
  return (
    <div className="dashboard-section">
      <div className="dashboard-section-title">{title}</div>
      <div className="an-section-body">{children}</div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DashboardAnalytics({ members, leaves, excludeFromOnDuty = [], selectedFY }) {
  const stats = useAnalytics(members, leaves, excludeFromOnDuty, selectedFY);

  return (
    <div className="an-root">
      {/* 1. KPI Cards */}
      <KPICards
        totalDays={stats.totalDays}
        plDays={stats.plDays}
        slDays={stats.slDays}
        avgStaffing={stats.avgStaffing}
      />

      {/* 2+3. Leave Distribution & Leave Patterns – side by side */}
      <div className="an-row-2col">
        <AnalyticsSection title="🍩 Leave Type Distribution">
          <LeaveDistributionChart categoryTotals={stats.categoryTotals} />
        </AnalyticsSection>
        <AnalyticsSection title="📅 Leave Patterns by Day of Week">
          <LeaveByDayOfWeekChart leaveByDow={stats.leaveByDow} dowDayTotals={stats.dowDayTotals} />
        </AnalyticsSection>
      </div>

      {/* 4. Monthly Leave & Staffing Trend – combined, full width */}
      <AnalyticsSection title="📈 Monthly Leave & Staffing Trend">
        <MonthlyTrendChart
          monthlyLeaveTrend={stats.monthlyLeaveTrend}
          monthlyStaffingPct={stats.monthlyStaffingPct}
        />
      </AnalyticsSection>

      {/* 6. Monthly Utilisation Cards */}
      <AnalyticsSection title="📆 Monthly Calendar Utilisation">
        <MonthlyUtilisationCards monthlyCards={stats.monthlyCards} />
      </AnalyticsSection>
    </div>
  );
}
