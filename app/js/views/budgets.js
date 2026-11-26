// views/budgets.js — per-category monthly limits: spent vs budget with progress bars,
// editable amounts, over-budget warnings, a totals row, and a tip line about the math.

import { EXPENSE_CATEGORIES, colorOf } from '../seed.js';
import { budgetRows, budgetTotals, setBudget } from '../store.js';
import { monthLabel, money, parseMoney } from '../format.js';
import { field, h, icon, iconHTML, modal, toast } from '../ui.js';

export function renderBudgets(root, ctx) {
  const mk = ctx.month;
  const rows = budgetRows(mk);
  const totals = budgetTotals(mk);

  const head = h('div', { class: 'page-head' },
    h('div', {},
      h('h1', {}, 'Budgets'),
      h('p', { class: 'sub' }, `${monthLabel(mk)} limits per category — click a number to change it`)),
    h('div', { class: 'btn-row' },
      ctx.monthStepper(),
      h('button', { class: 'btn primary', onclick: () => openAddBudget(unbudgetedCategories(mk)) }, icon('plus'), 'Add a budget')));

  const summary = h('div', { class: 'grid grid-3', style: 'margin-bottom:16px' },
    statCard('Total budgeted', money(totals.budget), `${rows.filter((r) => r.budget > 0).length} categories`),
    statCard('Spent so far', money(totals.spent), `${Math.round((totals.budget ? totals.spent / totals.budget : 0) * 100)}% of budget`),
    statCard('Headroom', money(totals.budget - totals.spent),
      totals.over ? `${totals.over} over · ${totals.warn} near limit` : totals.warn ? `${totals.warn} near limit` : 'all on track',
      totals.over ? 'neg' : 'pos'));

  const tbl = h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Category'), h('th', { class: 'num' }, 'Budget'), h('th', { class: 'num' }, 'Spent'),
      h('th', { class: 'num hide-sm' }, 'Left'), h('th', { style: 'width:26%' }, ''), h('th', {}))),
    h('tbody', {},
      rows.map((r) => budgetRow(r)),
      h('tr', { style: 'font-weight:650' },
        h('td', {}, 'All categories'),
        h('td', { class: 'num' }, money(totals.budget)),
        h('td', { class: 'num' }, money(totals.spent)),
        h('td', { class: 'num hide-sm' }, money(totals.budget - totals.spent)),
        h('td', {}, h('div', { class: `prog ${totals.spent > totals.budget ? 'over' : ''}` },
          h('i', { style: `width:${Math.min(100, (totals.budget ? totals.spent / totals.budget : 0) * 100)}%` }))),
        h('td', {}))));

  const tip = h('div', { class: 'card budget-tip' },
    h('span', { html: iconHTML('warn') }),
    h('p', {}, 'A limit is a plan, not a guilt trip: check the categories past 85% before the weekend. ',
      totals.over ? `${totals.over === 1 ? 'One category is' : `${totals.over} categories are`} already over — trimming the biggest line beats trimming five small ones.`
        : 'Nothing is over its limit right now.'));

  root.append(head, summary, h('section', { class: 'card' }, h('div', { class: 'tbl-wrap' }, tbl)), tip);
}

function statCard(label, value, note, cls = '') {
  return h('div', { class: 'card stat' },
    h('div', { class: 'stat-label' }, label),
    h('div', { class: `stat-value ${cls}` }, value),
    h('div', { class: 'stat-note' }, note));
}

function budgetRow(r) {
  const ratio = r.budget > 0 ? r.spent / r.budget : 0;
  const cls = ratio > 1 ? 'over' : ratio >= 0.85 ? 'warn' : '';
  const input = h('input', {
    class: 'budget-input', value: r.budget ? (r.budget / 100).toFixed(0) : '—',
    'aria-label': `Budget for ${r.category}`, inputmode: 'decimal',
  });
  input.addEventListener('focus', () => { if (r.budget === 0) input.value = ''; input.select(); });
  input.addEventListener('change', () => {
    const cents = parseMoney(input.value);
    if (input.value.trim() === '—' || input.value.trim() === '') { setBudget(r.category, 0); toast(`${r.category} budget removed`); return; }
    if (!Number.isFinite(cents) || cents < 0) { toast('Budget needs a positive number', 'err'); input.value = r.budget ? (r.budget / 100).toFixed(0) : '—'; return; }
    setBudget(r.category, Math.round(cents));
    toast(`${r.category} budget set to ${money(cents)}`);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });

  return h('tr', {},
    h('td', {}, h('span', { class: 'chip' }, h('span', { class: 'dot', style: `background:${colorOf(r.category)}` }), r.category)),
    h('td', { class: 'num' }, input),
    h('td', { class: 'num' }, money(r.spent)),
    h('td', { class: `num hide-sm ${r.remaining < 0 ? '' : ''}`, style: r.remaining < 0 ? 'color:var(--red);font-weight:600' : '' },
      r.remaining < 0 ? `−${money(-r.remaining)}` : money(r.remaining)),
    h('td', { class: 'budget-bar-cell' },
      h('div', { class: `prog ${cls}` }, h('i', { style: `width:${Math.min(100, ratio * 100)}%` })),
      h('div', { class: 'prog-meta' },
        h('span', {}, `${Math.round(ratio * 100)}%`),
        ratio > 1 ? h('span', { style: 'color:var(--red);font-weight:600' }, `over by ${money(r.spent - r.budget)}`)
          : r.budget === 0 ? h('span', {}, 'no limit') : null)),
    h('td', { class: 'num', style: 'width:40px' },
      ratio > 1 ? h('span', { class: 'badge over' }, 'over') : ratio >= 0.85 ? h('span', { class: 'badge warn' }, 'near') : r.budget ? h('span', { class: 'badge ok' }, 'ok') : h('span', { class: 'badge mut' }, '—')));
}

function unbudgetedCategories(mk) {
  const rows = budgetRows(mk);
  return EXPENSE_CATEGORIES.filter((c) => !rows.some((r) => r.category === c && r.budget > 0));
}

function openAddBudget(candidates) {
  if (candidates.length === 0) {
    toast('Every category already has a budget');
    return;
  }
  const catSel = h('select', {}, candidates.map((c) => h('option', { value: c }, c)));
  const amtInput = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'e.g. 150' });
  modal({
    title: 'Add a budget',
    build: (body) => body.append(
      field('Category', catSel),
      field('Monthly limit ($)', amtInput, 'You can change or clear it any time.')),
    actions: [{
      label: 'Set budget', kind: 'primary',
      onClick: () => {
        const cents = parseMoney(amtInput.value);
        if (!Number.isFinite(cents) || cents <= 0) { toast('Enter a positive amount', 'err'); return false; }
        setBudget(catSel.value, Math.round(cents));
        toast(`${catSel.value} budget set to ${money(cents)}`);
      },
    }],
  });
}
