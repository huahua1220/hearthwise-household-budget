// format.js — small pure helpers: money/dates/months/ids/html-escaping. No app state here.

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS_LONG.map((m) => m.slice(0, 3));
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "$1,234.56"; pass {sign:true} for "+$1,234.56"/"−$1,234.56", {whole:true} to drop cents. */
export function money(cents, opts = {}) {
  const sign = cents < 0 ? '−' : opts.sign && cents > 0 ? '+' : '';
  const abs = Math.abs(cents);
  const s = (abs / 100).toLocaleString('en-US', opts.whole
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}$${s}`;
}

/** "$12.34" parsed from a user input string; returns NaN cents on bad input. */
export function parseMoney(str) {
  const n = Number(String(str).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

/** "2026-11-26" -> "2026-11" */
export function monthKeyOf(isoDate) { return isoDate.slice(0, 7); }

/** "2026-11" -> "November 2026" */
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-11" -> "Nov 2026" */
export function monthShortLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "2026-11-26" -> "Nov 26" */
export function dateLabel(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "2026-11-26" -> "Wed, Nov 26" */
export function dateLabelLong(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function isoOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayISO() { return isoOf(new Date()); }
export function thisMonthKey() { return todayISO().slice(0, 7); }

/** Shift a "YYYY-MM" key by n months. */
export function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Day-of-month for an ISO date. */
export function dayOf(iso) { return Number(iso.slice(8, 10)); }

/** Whole days from a to b (b - a), both ISO. */
export function daysBetween(aISO, bISO) {
  return Math.round((new Date(`${bISO}T12:00:00`) - new Date(`${aISO}T12:00:00`)) / 86400000);
}

/** ISO date for `dueDay` inside month key (clamped to the month's length). */
export function dueDateInMonth(monthKey, dueDay) {
  const d = Math.min(dueDay, daysInMonth(monthKey));
  return `${monthKey}-${String(d).padStart(2, '0')}`;
}

let uidCounter = 0;
export function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/** Escape a string for HTML text/attribute use. */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Compact axis money like "$4.2k" / "$850". */
export function moneyAxis(cents) {
  const abs = Math.abs(cents);
  if (abs >= 100000) return `$${(abs / 100000).toFixed(abs % 100000 ? 1 : 0)}k`;
  return `$${Math.round(abs / 100).toLocaleString('en-US')}`;
}

export function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
