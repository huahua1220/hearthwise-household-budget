// views/dashboard.js — the landing view: month KPIs, budget health ring, spending donut,
// upcoming bills, budget warnings, recent activity and a goals strip. The densest screen.

import { donut, ring } from '../charts.js';
import { colorOf } from '../seed.js';
import {
  budgetRows, budgetTotals, getState, monthTotals, recentTransactions,
  setBillPaid, spendByCategory, upcomingBills,
} from '../store.js';
import { dateLabel, monthKeyOf, monthLabel, money, pct, thisMonthKey } from '../format.js';
import { emptyNote, h, icon, toast } from '../ui.js';
import { openTxForm } from './txform.js';

export function renderDashboard(root, ctx) {
  const mk = ctx.month;
  const isThisMonth = mk === thisMonthKey();
  const totals = monthTotals(mk);
  const btot = budgetTotals(mk);
  const catRows = spendByCategory(mk);
  const upcoming = upcomingBills(14);
  const overdue = ctx.overdue;
  const state = getState();

  /* ---- header ---- */
  const head = h('div', { class: 'page-head' },
    h('div', {},
      h('h1', {}, `${monthLabel(mk)} at a glance`),
      h('p', { class: 'sub' }, `${state.household} · ${isThisMonth ? 'month to date' : 'whole month'} · every number updates live`),
    ),
    h('div', { class: 'btn-row' },
      ctx.monthStepper(),
      h('button', { class: 'btn primary', onclick: () => openTxForm() }, icon('plus'), 'Add transaction')),
  );

  /* ---- KPI row ---- */
  const kpis = h('div', { class: 'dash-hero' },
    stat('Income', totals.income, 'teal', `${isThisMonth ? 'received so far' : 'received'}`),
    stat('Spent', totals.spent, 'copper', `across ${catRows.length} categories`),
    stat('Saved', totals.saved, '', 'moved to goals & savings'),
    stat(totals.net >= 0 ? 'Left over' : 'Over by', Math.abs(totals.net), totals.net >= 0 ? 'pos' : 'neg', 'unbudgeted headroom'),
  );

  /* ---- budget health + donut ---- */
  const usedFrac = btot.budget > 0 ? btot.spent / btot.budget : 0;
  const daysLeft = isThisMonth ? ctx.daysLeftInMonth : 0;
  const health = h('section', { class: 'card' },
    h('h2', { class: 'sec-title' }, 'Budget health'),
    h('p', { class: 'sec-sub' }, `${monthLabel(mk)} · all categories`),
    h('div', { class: 'health', style: 'margin-top:10px' },
      h('div', { class: 'ringwrap' },
        h('span', { html: ring(usedFrac, { color: usedFrac > 1 ? '#b1442e' : usedFrac >= 0.85 ? '#a87e22' : '#1f6f6b' }) }),
        h('div', { class: 'ringnum' }, h('b', {}, `${Math.round(usedFrac * 100)}%`), h('span', {}, 'of budget'))),
      h('div', {},
        h('p', { class: 'strong', style: 'font-size:15px' },
          `${money(btot.spent)} spent of ${money(btot.budget)}`),
        h('p', { class: 'note', style: 'margin-top:3px' },
          isThisMonth
            ? `${money(Math.max(0, btot.budget - btot.spent))} left · ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`
            : `${money(Math.abs(btot.budget - btot.spent))} ${btot.spent <= btot.budget ? 'under budget' : 'over budget'}`),
        btot.over > 0
          ? h('p', { style: 'margin-top:6px' }, h('span', { class: 'badge over' }, `${btot.over} over`))
          : btot.warn > 0
            ? h('p', { style: 'margin-top:6px' }, h('span', { class: 'badge warn' }, `${btot.warn} near limit`))
            : h('p', { style: 'margin-top:6px' }, h('span', { class: 'badge ok' }, 'on track')),
      )),
    h('a', { href: '#/budgets', class: 'btn small ghost', style: 'margin-top:8px;padding-left:0' }, 'Open budgets →'),
  );

  const donutCard = h('section', { class: 'card' },
    h('h2', { class: 'sec-title' }, 'Spending by category'),
    h('p', { class: 'sec-sub' }, `${monthLabel(mk)} · tap a slice name to filter transactions`),
    catRows.length === 0 ? emptyNote('No spending this month yet.') :
      h('div', { class: 'donut-flex', style: 'margin-top:12px' },
        h('div', { class: 'donut-wrap', html: donut(catRows.map((r) => ({ label: r.category, cents: r.cents, color: colorOf(r.category) }))) }),
        h('div', { class: 'legend' },
          catRows.slice(0, 8).map((r) => h('a', {
            class: 'leg-row', href: `#/transactions?cat=${encodeURIComponent(r.category)}`,
            style: 'color:inherit',
          },
            h('span', { class: 'dot', style: `background:${colorOf(r.category)}` }),
            h('span', { class: 'leg-name' }, r.category),
            h('span', { class: 'leg-amt' }, money(r.cents)),
            h('span', { class: 'leg-pct' }, `${pct(r.cents, totals.spent)}%`),
          )))),
  );

  /* ---- upcoming bills ---- */
  const billsCard = h('section', { class: 'card' },
    h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' },
      h('h2', { class: 'sec-title' }, 'Upcoming bills'),
      h('a', { href: '#/bills', class: 'note', style: 'font-size:12.5px' }, 'all bills →')),
    h('p', { class: 'sec-sub' }, 'next two weeks'),
    h('div', { style: 'margin-top:8px' },
      overdue.length ? h('p', { style: 'margin-bottom:8px' },
        h('span', { class: 'badge over' }, `${overdue.length} overdue`),
        ' ', h('a', { href: '#/bills' }, 'review')) : null,
      upcoming.length === 0 && overdue.length === 0
        ? emptyNote('Nothing due in the next two weeks.')
        : upcoming.slice(0, 5).map((inst) => billMini(inst))),
  );

  /* ---- budget watch ---- */
  const watchRows = budgetRows(mk).filter((r) => r.budget > 0 && r.spent / r.budget >= 0.75).slice(0, 5);
  const watchCard = h('section', { class: 'card' },
    h('h2', { class: 'sec-title' }, 'Budget watch'),
    h('p', { class: 'sec-sub' }, 'categories past 75% of their limit'),
    h('div', { style: 'margin-top:10px' },
      watchRows.length === 0
        ? h('p', { class: 'note' }, 'Every category is comfortably under budget.')
        : watchRows.map((r) => {
          const ratio = r.spent / r.budget;
          const cls = ratio > 1 ? 'over' : ratio >= 0.85 ? 'warn' : '';
          return h('div', { style: 'margin-bottom:12px' },
            h('div', { style: 'display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px' },
              h('span', { class: 'strong' }, r.category),
              h('span', { class: 'num mut' }, `${money(r.spent)} / ${money(r.budget)}`)),
            h('div', { class: `prog ${cls}` }, h('i', { style: `width:${Math.min(100, ratio * 100)}%` })),
            ratio > 1 ? h('p', { class: 'note', style: 'color:var(--red);font-size:12px;margin-top:3px' }, `over by ${money(r.spent - r.budget)}`) : null);
        })),
  );

  /* ---- recent activity ---- */
  const recent = recentTransactions(6);
  const recentCard = h('section', { class: 'card' },
    h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' },
      h('h2', { class: 'sec-title' }, 'Recent activity'),
      h('a', { href: '#/transactions', class: 'note', style: 'font-size:12.5px' }, 'all →')),
    h('p', { class: 'sec-sub' }, 'latest entries'),
    h('div', { class: 'rows', style: 'margin-top:6px' },
      recent.map((t) => h('div', { class: 'rowline' },
        h('span', { class: 'dot', style: `width:8px;height:8px;border-radius:50%;background:${colorOf(t.category)};flex:none` }),
        h('div', { class: 'grow' },
          h('div', { style: 'font-weight:550;font-size:14px' }, t.note),
          h('div', { class: 'tx-sub' }, `${dateLabel(t.date)} · ${t.category}`)),
        h('span', { class: `amount ${t.type}` },
          `${t.type === 'expense' ? '−' : '+'}${money(t.amountCents)}`)))),
  );

  /* ---- goals strip ---- */
  const goalsCard = h('section', { class: 'card' },
    h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' },
      h('h2', { class: 'sec-title' }, 'Savings goals'),
      h('a', { href: '#/goals', class: 'note', style: 'font-size:12.5px' }, 'all goals →')),
    h('div', { class: 'goalstrip', style: 'margin-top:12px' },
      state.goals.slice(0, 3).map((g) => {
        const p = g.targetCents > 0 ? g.savedCents / g.targetCents : 0;
        return h('div', { class: 'card goalchip', style: 'box-shadow:none' },
          h('div', { class: 'gc-top' }, h('b', {}, g.name), h('span', { class: 'mut' }, `${Math.round(p * 100)}%`)),
          h('div', { class: 'prog sage' }, h('i', { style: `width:${Math.min(100, p * 100)}%` })),
          h('p', { class: 'gc-amt' }, `${money(g.savedCents)} of ${money(g.targetCents)}`));
      })),
  );

  root.append(
    head,
    kpis,
    h('div', { class: 'dash-grid' }, donutCard, health),
    h('div', { class: 'dash-grid dash-grid-flip' }, billsCard, watchCard),
    h('div', { class: 'dash-grid dash-grid-flip' }, recentCard, goalsCard),
  );
}

function stat(label, cents, cls, note) {
  return h('div', { class: 'card stat' },
    h('div', { class: 'stat-label' }, label),
    h('div', { class: `stat-value ${cls}` }, money(cents)),
    h('div', { class: 'stat-note' }, note));
}

function billMini(inst) {
  const { bill, dueISO, daysUntil } = inst;
  const [y, m, d] = dueISO.split('-');
  const pill = daysUntil <= 0
    ? h('span', { class: 'due-pill today' }, 'today')
    : h('span', { class: 'due-pill soon' }, `in ${daysUntil}d`);
  return h('div', { class: 'billmini' },
    h('div', { class: 'due-cal' },
      h('div', { class: 'm' }, monthName(m)),
      h('div', { class: 'd' }, String(Number(d)))),
    h('div', { class: 'grow' },
      h('div', { class: 'nm' }, bill.name),
      h('div', { class: 'mt' }, bill.autopay ? 'autopay' : 'manual')),
    pill,
    h('span', { class: 'amount' }, money(bill.amountCents)),
    h('button', {
      class: 'btn small', title: `Mark ${bill.name} paid`,
      onclick: () => { setBillPaid(bill.id, monthKeyOf(dueISO), true); toast(`${bill.name} marked paid`); },
    }, 'Pay'));
}

const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthName(mm) { return MN[Number(mm) - 1]; }
