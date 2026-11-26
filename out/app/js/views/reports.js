// views/reports.js — the analytics view: 6-month income/spending/savings trend bars,
// savings-rate line, category breakdown bars, top payees, and month highlights.
// Charts are inline SVG from charts.js; nothing loads from anywhere else.

import { rateLine, trendBars } from '../charts.js';
import { colorOf } from '../seed.js';
import { monthTotals, monthTrend, spendByCategory, topPayees, transactionsInMonth } from '../store.js';
import { dateLabel, dayOf, daysInMonth, monthLabel, monthShortLabel, money, pct, thisMonthKey } from '../format.js';
import { h } from '../ui.js';

export function renderReports(root, ctx) {
  const mk = ctx.month;
  const isThisMonth = mk === thisMonthKey();
  const totals = monthTotals(mk);
  const cats = spendByCategory(mk);
  const trend = monthTrend(6);
  const rates = trend.map((m) => ({ key: m.key, rate: m.income > 0 ? (m.saved + Math.max(0, m.net)) / m.income : 0 }));
  const payees = topPayees(mk, 6);
  const monthTx = transactionsInMonth(mk);
  const biggest = monthTx.filter((t) => t.type === 'expense').sort((a, b) => b.amountCents - a.amountCents)[0];
  const daysElapsed = isThisMonth ? dayOf(ctx.today) : daysInMonth(mk);
  const perDay = daysElapsed > 0 ? Math.round(totals.spent / daysElapsed) : 0;
  const maxCat = cats.reduce((s, c) => Math.max(s, c.cents), 1);
  const savingsRate = totals.income > 0 ? Math.round(((totals.saved + Math.max(0, totals.net)) / totals.income) * 100) : 0;

  root.append(
    h('div', { class: 'page-head' },
      h('div', {},
        h('h1', {}, 'Reports'),
        h('p', { class: 'sub' }, `${monthLabel(mk)} in context — six months of income, spending and saving`)),
      ctx.monthStepper()),

    h('div', { class: 'grid grid-4', style: 'margin-bottom:16px' },
      stat('Spent / day', money(perDay), `${daysElapsed} day${daysElapsed === 1 ? '' : 's'} so far`, 'copper'),
      stat('Savings rate', `${savingsRate}%`, 'of income kept', savingsRate >= 20 ? 'pos' : savingsRate >= 10 ? '' : 'neg'),
      stat('Top category', cats[0]?.category ?? '—', cats[0] ? `${money(cats[0].cents)} · ${pct(cats[0].cents, totals.spent)}%` : 'no spending', ''),
      stat('Biggest single expense', biggest ? money(biggest.amountCents) : '—', biggest ? `${biggest.note} · ${dateLabel(biggest.date)}` : 'none yet', '')),

    h('div', { class: 'grid grid-2', style: 'margin-bottom:16px' },
      h('section', { class: 'card rep-card' },
        h('h3', {}, 'Six-month trend'),
        h('p', { class: 'rep-sub' }, 'income vs spending vs moved-to-savings, per month'),
        h('div', { html: trendBars(trend) }),
        h('div', { class: 'chart-legend' },
          legend('#1f6f6b', 'Income'), legend('#c26f33', 'Spent'), legend('#6f9070', 'Saved'))),
      h('section', { class: 'card rep-card' },
        h('h3', {}, 'Savings rate'),
        h('p', { class: 'rep-sub' }, 'share of income kept as savings or headroom, per month'),
        h('div', { html: rateLine(rates) }),
        h('p', { class: 'chart-note' },
          `Household rule of thumb is 20%. ${rates.at(-1).rate >= 0.2 ? 'This month is comfortably above it.' : 'This month is under it — the trend line shows which months dipped.'}`))),

    h('div', { class: 'grid grid-2' },
      h('section', { class: 'card rep-card' },
        h('h3', {}, `Where ${monthShortLabel(mk)}’s money went`),
        h('p', { class: 'rep-sub' }, 'expense categories, largest first'),
        cats.map((c) => h('div', { class: 'catbar-row' },
          h('span', { class: 'cb-name' }, c.category),
          h('div', { class: 'prog' }, h('i', { style: `width:${Math.max(2, (c.cents / maxCat) * 100)}%;background:${colorOf(c.category)}` })),
          h('span', { class: 'cb-amt' }, money(c.cents))))),
      h('section', { class: 'card rep-card' },
        h('h3', {}, 'Frequent payees'),
        h('p', { class: 'rep-sub' }, `${monthLabel(mk)} · where money actually left the account`),
        payees.map((p) => h('div', { class: 'payee-row' },
          h('div', {},
            h('div', {}, p.note),
            h('div', { class: 'py-ct' }, `${p.count}× this month`)),
          h('span', { class: 'py-amt' }, money(p.cents)))),
        h('p', { class: 'chart-note' }, 'Grouped by the note on each transaction — consistent names keep this honest.'))),
  );
}

function stat(label, value, note, cls = '') {
  return h('div', { class: 'card stat' },
    h('div', { class: 'stat-label' }, label),
    h('div', { class: `stat-value ${cls}`, style: 'font-size:22px' }, value),
    h('div', { class: 'stat-note' }, note));
}

function legend(color, label) {
  return h('span', { class: 'cl' }, h('span', { class: 'sw', style: `background:${color}` }), label);
}
