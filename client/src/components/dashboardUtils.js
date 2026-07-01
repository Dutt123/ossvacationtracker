import dayjs from 'dayjs';

export const CATEGORIES = {
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
export const FY_MONTH_ORDER = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
export const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Jul–Dec of year Y → FY start = Y; Jan–Jun of year Y → FY start = Y - 1
export function getFYStart(date) {
  const d = dayjs(date);
  return d.month() >= 6 ? d.year() : d.year() - 1;
}

export function fyLabel(startYear) {
  return `FY${startYear}-${String(startYear + 1).slice(2)}`;
}

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
