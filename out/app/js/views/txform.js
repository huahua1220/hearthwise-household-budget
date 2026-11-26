// views/txform.js — the add/edit transaction dialog, shared by the dashboard's
// "Add transaction" button and the Transactions page. Validates before saving.

import { addTransaction, updateTransaction } from '../store.js';
import { categoriesFor } from '../seed.js';
import { parseMoney, todayISO } from '../format.js';
import { field, h, modal, toast } from '../ui.js';

const TYPE_LABEL = { expense: 'Expense', income: 'Income', saving: 'Saving' };

export function openTxForm(existing = null, defaults = {}) {
  const isEdit = !!existing;
  let type = existing?.type ?? defaults.type ?? 'expense';

  const dateInput = h('input', { type: 'date', value: existing?.date ?? defaults.date ?? todayISO(), required: true });
  const noteInput = h('input', { type: 'text', value: existing?.note ?? '', placeholder: 'e.g. Hillcrest Market', maxlength: 64, required: true });
  const amountInput = h('input', { type: 'text', inputmode: 'decimal', value: existing ? (existing.amountCents / 100).toFixed(2) : '', placeholder: '0.00', required: true });
  const catSelect = h('select');
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Transaction type' });

  function fillCategories() {
    catSelect.innerHTML = '';
    for (const c of categoriesFor(type)) {
      catSelect.append(h('option', { value: c, selected: existing?.category === c || defaults.category === c }, c));
    }
  }
  function paintSeg() {
    seg.innerHTML = '';
    for (const t of ['expense', 'income', 'saving']) {
      seg.append(h('button', {
        type: 'button', class: t === type ? 'on' : '',
        onclick: () => { type = t; paintSeg(); fillCategories(); },
      }, TYPE_LABEL[t]));
    }
  }
  paintSeg();
  fillCategories();

  modal({
    title: isEdit ? 'Edit transaction' : 'Add a transaction',
    build: (body) => {
      body.append(
        h('div', { class: 'field' }, h('label', {}, 'Type'), seg),
        h('div', { class: 'form-row' },
          field('Date', dateInput),
          field('Amount ($)', amountInput)),
        field('Category', catSelect),
        field('Note', noteInput, 'What was it for? Shown in the ledger.'),
      );
    },
    actions: [{
      label: isEdit ? 'Save changes' : 'Add it',
      kind: 'primary',
      onClick: () => {
        const cents = parseMoney(amountInput.value);
        const note = noteInput.value.trim();
        if (!dateInput.value) { toast('Pick a date', 'err'); return false; }
        if (!Number.isFinite(cents) || cents <= 0) { toast('Amount needs to be a positive number', 'err'); return false; }
        if (!note) { toast('Give it a short note', 'err'); return false; }
        const patch = { date: dateInput.value, type, category: catSelect.value, note, amountCents: Math.round(cents) };
        if (isEdit) { updateTransaction(existing.id, patch); toast('Transaction updated'); }
        else { addTransaction(patch); toast(`${TYPE_LABEL[type]} added — $${(cents / 100).toFixed(2)}`); }
      },
    }],
  });
}

export { TYPE_LABEL };
