import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FY_MONTH_ORDER, MONTH_LABELS } from './dashboardUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function MonthlyTrendChart({ members, monthlyBreakdown, selectedFY }) {
  const labels = FY_MONTH_ORDER.map(mi => {
    const yr = mi >= 6 ? String(selectedFY).slice(2) : String(selectedFY + 1).slice(2);
    return `${MONTH_LABELS[mi]} '${yr}`;
  });

  const leavesPerMonth = useMemo(
    () => FY_MONTH_ORDER.map(mi =>
      members.reduce((sum, m) => sum + (monthlyBreakdown[m]?.[mi] || 0), 0)
    ),
    [members, monthlyBreakdown]
  );

  const staffingPerMonth = useMemo(
    () => leavesPerMonth.map(l => Math.max(0, members.length - l)),
    [leavesPerMonth, members.length]
  );

  const data = {
    labels,
    datasets: [
      {
        label: 'Total Leaves',
        data: leavesPerMonth,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        pointBackgroundColor: '#ef4444',
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Avg On-Duty Staff',
        data: staffingPerMonth,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0,212,255,0.08)',
        pointBackgroundColor: '#00d4ff',
        tension: 0.4,
        fill: true,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 12, weight: '600' }, boxWidth: 14 },
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(0,212,255,0.3)',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(51,65,85,0.4)' },
      },
      y: {
        position: 'left',
        title: { display: true, text: 'Leaves', color: '#ef4444', font: { size: 11 } },
        ticks: { color: '#64748b', font: { size: 11 }, stepSize: 1 },
        grid: { color: 'rgba(51,65,85,0.4)' },
        min: 0,
      },
      y1: {
        position: 'right',
        title: { display: true, text: 'On-Duty', color: '#00d4ff', font: { size: 11 } },
        ticks: { color: '#64748b', font: { size: 11 }, stepSize: 1 },
        grid: { drawOnChartArea: false },
        min: 0,
      },
    },
  };

  return (
    <div className="dashboard-section">
      <div className="dashboard-section-title">
        📈 Monthly Leave &amp; Staffing Trend
      </div>
      <div className="an-section-body">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
