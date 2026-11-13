/**
 * True UTC timestamp & duration formatters.
 * Prevents locale timezone strings from being misleadingly labeled as UTC.
 */

export function parseUtcDate(value?: string | number | Date | null): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(value).trim();
  if (!str) return null;
  // Normalize naive ISO strings from backend to UTC cleanly
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(str);
  const normalized = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str) && !hasTz
    ? `${str.replace(' ', 'T')}Z`
    : str;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatUtcTime(value?: string | number | Date | null, withSeconds: boolean = true): string {
  const d = parseUtcDate(value);
  if (!d) return '--:--:-- UTC';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  if (!withSeconds) return `${hh}:${mm} UTC`;
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

export function formatUtcDate(value?: string | number | Date | null): string {
  const d = parseUtcDate(value);
  if (!d) return '---- -- --';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = months[d.getUTCMonth()];
  const yr = d.getUTCFullYear();
  return `${day} ${mon} ${yr}`;
}

export function formatUtcDateTime(value?: string | number | Date | null, compact: boolean = false): string {
  const d = parseUtcDate(value);
  if (!d) return 'Unavailable';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = months[d.getUTCMonth()];
  const yr = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  if (compact) {
    return `${mon} ${day}, ${hh}:${mm} UTC`;
  }
  return `${yr}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${day} ${hh}:${mm}:${ss} UTC`;
}

export function formatCountdownToUtc(target?: string | number | Date | null, nowMs: number = Date.now()): string {
  const d = parseUtcDate(target);
  if (!d) return 'Unknown';
  const diffSec = Math.round((d.getTime() - nowMs) / 1000);
  if (diffSec <= 0) {
    const absMin = Math.floor(Math.abs(diffSec) / 60);
    return absMin < 60 ? `Passed ${absMin}m ago` : `Passed ${Math.floor(absMin / 60)}h ago`;
  }
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    return `T-${days}d ${hrs % 24}h`;
  }
  if (hrs > 0) {
    return `T-${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  return `T-${mins}m ${String(secs).padStart(2, '0')}s`;
}

