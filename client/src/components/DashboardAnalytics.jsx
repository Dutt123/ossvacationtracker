import React, { useMemo, useState } from 'react';
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

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: 'easeInOutQuart' },
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { size: 12, family: 'Inter, sans-serif' }, boxWidth: 14, padding: 16 },
    },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: 'rgba(0,212,255,0.4)',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORKDAY_INDICES = [1, 2, 3, 4, 5]; // Mon–Fri

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

    // --- Per-member totals ---------------------------------------------------
    const memberTotals = {};
    const memberCatBreakdown = {};
    members.forEach(m => {
      memberTotals[m] = 0;
      memberCatBreakdown[m] = {};
      Object.keys(CATEGORIES).forEach(c => { memberCatBreakdown[m][c] = 0; });
    });
    fyLeaves.forEach(l => {
      if (!memberTotals.hasOwnProperty(l.member)) return;
      memberTotals[l.member]++;
      if (memberCatBreakdown[l.member][l.category] !== undefined)
        memberCatBreakdown[l.member][l.category]++;
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
      memberTotals, memberCatBreakdown,
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
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${val}`, x, y - 7);
      ctx.font = '10px Inter, sans-serif';
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
          font: { size: 12, family: 'Inter, sans-serif' },
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

function MonthlyLeaveTrendChart({ monthlyLeaveTrend }) {
  const data = {
    labels: FY_MONTH_LABELS,
    datasets: [{
      label: 'Total Leave Days',
      data: monthlyLeaveTrend,
      borderColor: '#00d4ff',
      backgroundColor: hexToRgba('#00d4ff', 0.12),
      pointBackgroundColor: '#00d4ff',
      pointBorderColor: '#0f172a',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
      fill: true,
      tension: 0.45,
      borderWidth: 2.5,
    }],
  };

  const options = {
    ...CHART_DEFAULTS,
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(51,65,85,0.5)', drawBorder: false },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 11 }, stepSize: 1 },
        grid: { color: 'rgba(51,65,85,0.5)', drawBorder: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height: 220, position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
}

function MonthlyStaffingTrendChart({ monthlyStaffingPct }) {
  const colors = monthlyStaffingPct.map(p =>
    p >= 75 ? '#22c55e' : '#ef4444'
  );

  const data = {
    labels: FY_MONTH_LABELS,
    datasets: [
      {
        label: 'Staffing %',
        data: monthlyStaffingPct,
        borderColor: '#22c55e',
        backgroundColor: hexToRgba('#22c55e', 0.1),
        pointBackgroundColor: colors,
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 9,
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
      },
      {
        label: '75% threshold',
        data: Array(12).fill(75),
        borderColor: hexToRgba('#f59e0b', 0.6),
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0,
      },
    ],
  };

  const options = {
    ...CHART_DEFAULTS,
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: {
        ...CHART_DEFAULTS.plugins.legend,
        labels: {
          ...CHART_DEFAULTS.plugins.legend.labels,
          filter: item => item.text !== '75% threshold',
        },
      },
      tooltip: {
        ...CHART_DEFAULTS.plugins.tooltip,
        callbacks: {
          label: ctx => ctx.dataset.label === '75% threshold'
            ? null
            : ` ${ctx.raw}% staffing`,
        },
        filter: item => item.dataset.label !== '75% threshold',
      },
      annotation: undefined,
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(51,65,85,0.5)', drawBorder: false },
      },
      y: {
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: v => `${v}%`,
        },
        grid: { color: 'rgba(51,65,85,0.5)', drawBorder: false },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <div style={{ height: 220, position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
}

function LeaveBreakdownChart({ members, memberCatBreakdown }) {
  const sorted = [...members].sort((a, b) =>
    Object.values(memberCatBreakdown[b] || {}).reduce((s,v)=>s+v,0) -
    Object.values(memberCatBreakdown[a] || {}).reduce((s,v)=>s+v,0)
  );

  const labels = sorted.map(m => m.split(' ')[0]);
  const cats   = Object.keys(CATEGORIES);

  const datasets = cats.map(c => ({
    label: c,
    data: sorted.map(m => memberCatBreakdown[m]?.[c] || 0),
    backgroundColor: hexToRgba(CATEGORIES[c], 0.8),
    borderColor: CATEGORIES[c],
    borderWidth: 1,
    borderRadius: 3,
    borderSkipped: false,
  }));

  const data = { labels, datasets };

  const options = {
    ...CHART_DEFAULTS,
    indexAxis: 'y',
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: {
        ...CHART_DEFAULTS.plugins.legend,
        position: 'bottom',
      },
      tooltip: {
        ...CHART_DEFAULTS.plugins.tooltip,
        mode: 'index',
        callbacks: {
          label: ctx => ctx.raw > 0 ? ` ${ctx.dataset.label}: ${ctx.raw}` : null,
          filter: item => item.raw > 0,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(51,65,85,0.4)', drawBorder: false },
        beginAtZero: true,
      },
      y: {
        stacked: true,
        ticks: { color: '#e2e8f0', font: { size: 12, weight: '600' } },
        grid: { display: false },
      },
    },
  };

  return (
    <div style={{ height: Math.max(260, sorted.length * 38 + 60), position: 'relative' }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// Inline value labels drawn on each stacked segment
const stackedBarLabelPlugin = {
  id: 'stackedBarLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((bar, i) => {
        const val = dataset.data[i];
        if (!val) return;
        const { height } = bar;
        if (Math.abs(height) < 14) return;
        const { x, y } = bar.tooltipPosition();
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 3;
        ctx.fillText(String(val), x, y);
        ctx.restore();
      });
    });
  },
};

function LeaveByDayOfWeekChart({ leaveByDow, dowDayTotals }) {
  const [viewMode, setViewMode] = useState('count');
  const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const cats = Object.keys(CATEGORIES);

  const datasets = cats.map(c => {
    const rawData = leaveByDow[c] || [0, 0, 0, 0, 0];
    const chartData = viewMode === 'percent'
      ? rawData.map((v, i) => dowDayTotals[i] ? Math.round((v / dowDayTotals[i]) * 100) : 0)
      : rawData;
    return {
      label: `${c} – ${CATEGORY_NAMES[c]}`,
      data: chartData,
      rawData,
      backgroundColor: hexToRgba(CATEGORIES[c], 0.82),
      borderColor: CATEGORIES[c],
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false,
    };
  });

  const data = { labels: DAY_LABELS, datasets };

  const options = {
    ...CHART_DEFAULTS,
    plugins: {
      ...CHART_DEFAULTS.plugins,
      legend: {
        ...CHART_DEFAULTS.plugins.legend,
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: 'Inter, sans-serif' },
          boxWidth: 12,
          padding: 12,
          usePointStyle: true,
          pointStyle: 'rectRounded',
        },
      },
      tooltip: {
        ...CHART_DEFAULTS.plugins.tooltip,
        mode: 'index',
        callbacks: {
          title: items => items[0]?.label || '',
          label: ctx => {
            const raw = ctx.dataset.rawData?.[ctx.dataIndex] ?? ctx.raw;
            const dayTotal = dowDayTotals[ctx.dataIndex] || 0;
            const pct = dayTotal ? Math.round((raw / dayTotal) * 100) : 0;
            if (!raw) return null;
            return ` ${ctx.dataset.label}: ${raw} days (${pct}%)`;
          },
          filter: item => {
            const raw = item.dataset.rawData?.[item.dataIndex] ?? item.raw;
            return raw > 0;
          },
          afterBody: items => {
            const i = items[0]?.dataIndex;
            if (i === undefined) return [];
            return ['─────────────────', `Day total: ${dowDayTotals[i]} days`];
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#94a3b8', font: { size: 12, weight: '700' } },
        grid: { color: 'rgba(51,65,85,0.35)', drawBorder: false },
      },
      y: {
        stacked: true,
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: v => viewMode === 'percent' ? `${v}%` : v,
        },
        grid: { color: 'rgba(51,65,85,0.35)', drawBorder: false },
        beginAtZero: true,
        ...(viewMode === 'percent' ? { max: 100 } : {}),
      },
    },
  };

  return (
    <div>
      <div className="an-dow-toggle">
        <button
          className={`an-dow-btn${viewMode === 'count' ? ' active' : ''}`}
          onClick={() => setViewMode('count')}
        >
          # Count
        </button>
        <button
          className={`an-dow-btn${viewMode === 'percent' ? ' active' : ''}`}
          onClick={() => setViewMode('percent')}
        >
          % Share
        </button>
      </div>
      <div style={{ height: 300, position: 'relative' }}>
        <Bar data={data} options={options} plugins={[stackedBarLabelPlugin]} />
      </div>
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

      {/* 2+3. Leave Distribution & Monthly Trend – side by side */}
      <div className="an-row-2col">
        <AnalyticsSection title="🍩 Leave Type Distribution">
          <LeaveDistributionChart categoryTotals={stats.categoryTotals} />
        </AnalyticsSection>
        <AnalyticsSection title="📈 Monthly Leave Trend">
          <MonthlyLeaveTrendChart monthlyLeaveTrend={stats.monthlyLeaveTrend} />
        </AnalyticsSection>
      </div>

      {/* 4. Monthly Staffing Trend – full width */}
      <AnalyticsSection title="🟢 Monthly Staffing Trend">
        <MonthlyStaffingTrendChart monthlyStaffingPct={stats.monthlyStaffingPct} />
      </AnalyticsSection>

      {/* 5. Leave by Day of Week + Leave Breakdown – side by side */}
      <div className="an-row-2col">
        <AnalyticsSection title="📅 Leave Patterns by Day of Week">
          <LeaveByDayOfWeekChart leaveByDow={stats.leaveByDow} dowDayTotals={stats.dowDayTotals} />
        </AnalyticsSection>
        <AnalyticsSection title="📊 Leave Breakdown by Employee">
          <LeaveBreakdownChart members={members} memberCatBreakdown={stats.memberCatBreakdown} />
        </AnalyticsSection>
      </div>

      {/* 6. Monthly Utilisation Cards */}
      <AnalyticsSection title="📆 Monthly Calendar Utilisation">
        <MonthlyUtilisationCards monthlyCards={stats.monthlyCards} />
      </AnalyticsSection>
    </div>
  );
}
