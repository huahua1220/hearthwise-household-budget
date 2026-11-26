// charts.js — hand-drawn inline SVG charts (no library): donut, progress ring, grouped
// monthly trend bars, and a savings-rate line. Each returns an SVG string sized by viewBox,
// so charts stay crisp at any width and cost almost nothing in bytes.

import { esc, money, moneyAxis, monthShortLabel } from './format.js';

const PALETTE = ['#1f6f6b', '#c26f33', '#6f9070', '#b98a2f', '#5f7f9e', '#8a4f6d', '#c08b3e', '#4d7f7b', '#a8584f', '#7d6ba8'];

/** Donut for spending by category. parts: [{label, cents, color}]. Center shows total. */
export function donut(parts, { size = 168, hole = 0.62 } = {}) {
  const total = parts.reduce((s, p) => s + p.cents, 0);
  const r = 50, ir = r * hole, cx = 60, cy = 60;
  let angle = -Math.PI / 2;
  let arcs = '';
  const shown = parts.filter((p) => p.cents > 0).slice(0, 8);
  const restCents = total - shown.reduce((s, p) => s + p.cents, 0);
  const slices = restCents > 0 ? [...shown, { label: 'Everything else', cents: restCents, color: '#82928a' }] : shown;

  for (const p of slices) {
    const frac = total > 0 ? p.cents / total : 0;
    const a2 = angle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const xi2 = cx + ir * Math.cos(a2), yi2 = cy + ir * Math.sin(a2);
    const xi1 = cx + ir * Math.cos(angle), yi1 = cy + ir * Math.sin(angle);
    const sweep = Math.min(frac, 1);
    if (slices.length === 1) {
      // single slice: draw a full ring (a lone arc of 360° collapses to nothing)
      arcs += `<circle cx="${cx}" cy="${cy}" r="${(r + ir) / 2}" fill="none" stroke="${p.color}" stroke-width="${r - ir}"/>`;
    } else {
      arcs += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${xi2.toFixed(2)} ${yi2.toFixed(2)} A${ir} ${ir} 0 ${large} 0 ${xi1.toFixed(2)} ${yi1.toFixed(2)} Z" fill="${p.color}"><title>${esc(p.label)} — ${money(p.cents)}</title></path>`;
    }
    angle = a2;
  }
  if (total === 0) {
    arcs = `<circle cx="${cx}" cy="${cy}" r="${(r + ir) / 2}" fill="none" stroke="#e4dac6" stroke-width="${r - ir}"/>`;
  }
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="Spending by category donut chart">
    ${arcs}
    <g class="donut-center"><text x="60" y="57" class="dc-num" text-anchor="middle">${money(total, { whole: true })}</text>
    <text x="60" y="70" class="dc-sub" text-anchor="middle">this month</text></g>
  </svg>`;
}

/** Small circular progress ring. pct in [0,1+]. */
export function ring(pctValue, { size = 96, stroke = 10, color = '#1f6f6b' } = {}) {
  const r = 50 - stroke / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, pctValue));
  const over = pctValue > 1;
  const col = over ? '#b1442e' : color;
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${Math.round(pctValue * 100)} percent">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="#efe6d2" stroke-width="${stroke}"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}"
      transform="rotate(-90 50 50)"/>
  </svg>`;
}

/**
 * Grouped monthly bars: series [{key, income, spent, saved}]. Three bars per month.
 * Returns SVG with axis labels; heights normalize to the largest income.
 */
export function trendBars(series, { width = 640, height = 240 } = {}) {
  const W = width, H = height;
  const padL = 46, padR = 10, padT = 14, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...series.map((s) => Math.max(s.income, s.spent)));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;

  let grid = '';
  for (let v = 0; v <= top; v += step) {
    const y = padT + innerH - (v / top) * innerH;
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#efe6d2" stroke-width="1"/>
      <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="chart-axis">${moneyAxis(v)}</text>`;
  }

  const groupW = innerW / series.length;
  const barW = Math.min(15, (groupW - 18) / 3);
  let bars = '';
  series.forEach((s, i) => {
    const gx = padL + i * groupW;
    const cx = gx + groupW / 2;
    const vals = [
      { v: s.income, color: '#1f6f6b', name: 'Income' },
      { v: s.spent, color: '#c26f33', name: 'Spent' },
      { v: s.saved, color: '#6f9070', name: 'Saved' },
    ];
    vals.forEach((b, j) => {
      const bh = (b.v / top) * innerH;
      const x = cx - (barW * 3 + 6) / 2 + j * (barW + 3);
      bars += `<rect x="${x.toFixed(1)}" y="${(padT + innerH - bh).toFixed(1)}" width="${barW}" height="${Math.max(1, bh).toFixed(1)}" rx="3" fill="${b.color}"><title>${monthShortLabel(s.key)} ${b.name}: ${money(b.v)}</title></rect>`;
    });
    bars += `<text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle" class="chart-axis">${monthShortLabel(s.key)}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monthly income, spending and savings">${grid}${bars}</svg>`;
}

/** Savings-rate line: series [{key, rate}] where rate is 0..1+. */
export function rateLine(series, { width = 640, height = 180 } = {}) {
  const W = width, H = height;
  const padL = 40, padR = 12, padT = 12, padB = 24;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(0.25, ...series.map((s) => s.rate));
  const top = Math.ceil(max * 10) / 10;

  let grid = '';
  for (let v = 0; v <= top + 0.001; v += top / 4) {
    const y = padT + innerH - (v / top) * innerH;
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#efe6d2"/>
      <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="chart-axis">${Math.round(v * 100)}%</text>`;
  }

  const pts = series.map((s, i) => {
    const x = padL + (innerW / Math.max(1, series.length - 1)) * i;
    const y = padT + innerH - (Math.min(s.rate, top) / top) * innerH;
    return { x, y, s };
  });
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1].x.toFixed(1)} ${padT + innerH} L${pts[0].x.toFixed(1)} ${padT + innerH} Z`;

  let dots = '';
  for (const p of pts) {
    dots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.6" fill="#fffdf8" stroke="#1f6f6b" stroke-width="2"><title>${monthShortLabel(p.s.key)}: ${Math.round(p.s.rate * 100)}%</title></circle>
      <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" text-anchor="middle" class="chart-axis" style="font-weight:650">${Math.round(p.s.rate * 100)}%</text>
      <text x="${p.x.toFixed(1)}" y="${H - 7}" text-anchor="middle" class="chart-axis">${monthShortLabel(p.s.key)}</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Savings rate by month">
    ${grid}<path d="${area}" fill="#1f6f6b" opacity="0.10"/><path d="${path}" fill="none" stroke="#1f6f6b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${dots}
  </svg>`;
}

/** Round a raw step to a "nice" 1/2/2.5/5 grid step. */
function niceStep(raw) {
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * mag;
}

export { PALETTE };
