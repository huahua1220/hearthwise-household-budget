// views/transactions.js — the ledger: search + type/category filters over the selected
// month, day-grouped rows, running totals of the filtered set, add/edit/delete.

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, colorOf } from '../seed.js';
import { deleteTransaction, transactionsInMonth } from '../store.js';
import { dateLabelLong, monthLabel, money } from '../format.js';
import { confirmModal, emptyNote, h, icon, toast } from '../ui.js';
import { openTxForm, TYPE_LABEL } from './txform.js';

const ALL_CATS = [...INCOME_CATEGORIES, 'Savings transfer', ...EXPENSE_CATEGORIES];

// Filters survive re-renders (e.g. after add/delete) but a ?cat= link always wins.
let filterState = { q: '', type: 'all', cat: 'all' };

export function renderTransactions(root, ctx) {
  const mk = ctx.month;
  if (ctx.params.get('cat')) filterState = { q: '', type: 'all', cat: ctx.params.get('cat') };
  let typeFilter = filterState.type;
  let catFilter = filterState.cat;

  const txs = transactionsInMonth(mk);

  const search = h('input', {
    type: 'search', placeholder: 'Search notes, e.g. "market" or "piano"…',
    'aria-label': 'Search transactions', value: filterState.q,
  });
  const typeSel = h('select', { 'aria-label': 'Filter by type' },
    h('option', { value: 'all' }, 'All types'),
    h('option', { value: 'expense', selected: typeFilter === 'expense' }, 'Expenses'),
    h('option', { value: 'income', selected: typeFilter === 'income' }, 'Income'),
    h('option', { value: 'saving', selected: typeFilter === 'saving' }, 'Savings'));
  const catSel = h('select', { 'aria-label': 'Filter by category' },
    h('option', { value: 'all' }, 'All categories'),
    ALL_CATS.map((c) => h('option', { value: c, selected: c === catFilter }, c)));

  const listWrap = h('div');
  const totalsLine = h('p', { class: 'filtered-total' });

  function filtered() {
    const q = search.value.trim().toLowerCase();
    return txs.filter((t) =>
      (typeFilter === 'all' || t.type === typeFilter)
      && (catFilter === 'all' || t.category === catFilter)
      && (!q || t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)));
  }

  function repaint() {
    const rows = filtered();
    let inc = 0, exp = 0, sav = 0;
    for (const t of rows) {
      if (t.type === 'income') inc += t.amountCents;
      else if (t.type === 'saving') sav += t.amountCents;
      else exp += t.amountCents;
    }
    totalsLine.innerHTML = `${rows.length} transaction${rows.length === 1 ? '' : 's'} · in <b>${money(inc)}</b> · out <b>${money(exp)}</b> · saved <b>${money(sav)}</b>`;
    listWrap.innerHTML = '';
    if (rows.length === 0) {
      listWrap.append(emptyNote('Nothing matches — try clearing a filter or add a transaction.'));
      return;
    }
    const tbl = h('table', { class: 'tbl tx' });
    let lastDay = null;
    for (const t of rows) {
      if (t.date !== lastDay) {
        lastDay = t.date;
        const dayTx = rows.filter((x) => x.date === t.date);
        const dayOut = dayTx.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amountCents, 0);
        tbl.append(h('tr', { class: 'daygroup' },
          h('td', { colspan: 5 },
            dateLabelLong(t.date),
            dayOut ? h('span', { class: 'tx-day-total' }, `−${money(dayOut)}`) : null)));
      }
      tbl.append(h('tr', {},
        h('td', { class: 'mut', style: 'width:24px' },
          h('span', { class: 'dot', style: `display:inline-block;width:9px;height:9px;border-radius:3px;background:${colorOf(t.category)}` })),
        h('td', {},
          h('div', { class: 'tx-note' }, t.note),
          h('div', { class: 'tx-sub hide-sm' }, `${TYPE_LABEL[t.type]} · ${t.category}`)),
        h('td', { class: 'hide-sm' }, h('span', { class: 'chip' },
          h('span', { class: 'dot', style: `background:${colorOf(t.category)}` }), t.category)),
        h('td', { class: `num amount ${t.type}` }, `${t.type === 'expense' ? '−' : '+'}${money(t.amountCents)}`),
        h('td', { class: 'num', style: 'white-space:nowrap;width:64px' },
          iconBtn('pencil', 'Edit', () => openTxForm(t)),
          iconBtn('trash', 'Delete', async () => {
            if (await confirmModal('Delete transaction?', `"${t.note}" (${money(t.amountCents)}) will be removed from the ledger.`)) {
              deleteTransaction(t.id); toast('Deleted');
            }
          }, 'danger'))));
    }
    listWrap.append(h('div', { class: 'tbl-wrap' }, tbl));
  }

  search.addEventListener('input', () => { filterState.q = search.value; repaint(); });
  typeSel.addEventListener('change', () => { typeFilter = filterState.type = typeSel.value; repaint(); });
  catSel.addEventListener('change', () => { catFilter = filterState.cat = catSel.value; repaint(); });

  root.append(
    h('div', { class: 'page-head' },
      h('div', {},
        h('h1', {}, 'Transactions'),
        h('p', { class: 'sub' }, `${monthLabel(mk)} · every dollar in and out`)),
      h('div', { class: 'btn-row' },
        ctx.monthStepper(),
        h('button', { class: 'btn primary', onclick: () => openTxForm() }, icon('plus'), 'Add transaction'))),
    h('div', { class: 'toolbar' },
      search, typeSel, catSel,
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn small', onclick: () => { search.value = ''; typeSel.value = 'all'; catSel.value = 'all'; typeFilter = 'all'; catFilter = 'all'; filterState = { q: '', type: 'all', cat: 'all' }; repaint(); } }, 'Clear filters')),
    h('section', { class: 'card' }, totalsLine, listWrap),
  );
  repaint();
}

function iconBtn(name, title, onclick, cls = '') {
  const b = h('button', { class: `iconbtn ${cls}`, title, 'aria-label': title, onclick });
  b.append(icon(name));
  return b;
}
