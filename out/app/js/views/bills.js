// views/bills.js — recurring bills: overdue / due-soon / later / next-month sections with
// due pills and paid toggles, plus add/edit/delete. Paying a bill marks the month covered.

import { addBill, billInstances, deleteBill, setBillPaid, updateBill } from '../store.js';
import { dateLabel, daysBetween, monthLabel, money, shiftMonth, thisMonthKey, todayISO } from '../format.js';
import { confirmModal, field, h, icon, modal, toast } from '../ui.js';

export function renderBills(root, ctx) {
  const today = todayISO();
  const thisKey = thisMonthKey();
  const nextKey = shiftMonth(thisKey, 1);
  const now = billInstances(thisKey);
  const next = billInstances(nextKey);

  const overdue = now.filter((i) => !i.paid && i.dueISO < today);
  const dueSoon = now.filter((i) => !i.paid && i.dueISO >= today && daysBetween(today, i.dueISO) <= 14);
  const later = now.filter((i) => !i.paid && daysBetween(today, i.dueISO) > 14);
  const paid = now.filter((i) => i.paid);
  const unpaidTotal = [...overdue, ...dueSoon, ...later].reduce((s, i) => s + i.bill.amountCents, 0);

  root.append(
    h('div', { class: 'page-head' },
      h('div', {},
        h('h1', {}, 'Bills & recurring'),
        h('p', { class: 'sub' }, `${monthLabel(thisKey)} · ${money(unpaidTotal)} still to pay · ${paid.length} of ${now.length} settled`)),
      h('button', { class: 'btn primary', onclick: () => openBillForm() }, icon('plus'), 'Add a bill')),

    h('div', { class: 'grid grid-3', style: 'margin-bottom:16px' },
      stat('Still to pay', money(unpaidTotal), `${overdue.length + dueSoon.length + later.length} bills`, unpaidTotal ? 'copper' : ''),
      stat('Due in 14 days', money(dueSoon.reduce((s, i) => s + i.bill.amountCents, 0) + overdue.reduce((s, i) => s + i.bill.amountCents, 0)),
        overdue.length ? `${overdue.length} overdue` : 'nothing overdue', overdue.length ? 'neg' : ''),
      stat('Autopay covers', money(now.filter((i) => i.bill.autopay).reduce((s, i) => s + i.bill.amountCents, 0)),
        `${now.filter((i) => i.bill.autopay).length} bills on autopay`, 'teal')),
  );

  if (overdue.length) {
    root.append(section('Overdue', 'past their due date — mark paid or edit the bill',
      overdue.map((i) => billRow(i, thisKey))));
  }
  root.append(
    section('Due soon', 'the next two weeks', dueSoon.length ? dueSoon.map((i) => billRow(i, thisKey)) : [h('p', { class: 'note' }, 'Nothing due in the next two weeks.')]),
    section('Later this month', 'more than two weeks out', later.length ? later.map((i) => billRow(i, thisKey)) : [h('p', { class: 'note' }, 'That is everything for this month.')]),
    section('Already paid', `${paid.length} bill${paid.length === 1 ? '' : 's'} settled for ${monthLabel(thisKey)}`, paid.length ? paid.map((i) => billRow(i, thisKey)) : [h('p', { class: 'note' }, 'Nothing marked paid yet.')]),
    section(`Coming up in ${monthLabel(nextKey)}`, 'the same bills, next month', next.map((i) => billRow(i, nextKey, true))),
  );
}

function stat(label, value, note, cls = '') {
  return h('div', { class: 'card stat' },
    h('div', { class: 'stat-label' }, label),
    h('div', { class: `stat-value ${cls}` }, value),
    h('div', { class: 'stat-note' }, note));
}

function section(title, sub, children) {
  return h('section', { class: 'card', style: 'margin-bottom:16px' },
    h('h2', { class: 'sec-title' }, title),
    h('p', { class: 'sec-sub', style: 'margin-bottom:6px' }, sub),
    h('div', { class: 'rows' }, children));
}

function billRow(inst, monthKey, preview = false) {
  const { bill, dueISO, paid } = inst;
  const today = todayISO();
  const days = daysBetween(today, dueISO);
  let pill;
  if (paid) pill = h('span', { class: 'due-pill paid' }, 'paid');
  else if (dueISO < today && !preview) pill = h('span', { class: 'due-pill overdue' }, 'overdue');
  else if (days === 0 && !preview) pill = h('span', { class: 'due-pill today' }, 'today');
  else if (days <= 14 && !preview) pill = h('span', { class: 'due-pill soon' }, `in ${days}d`);
  else pill = h('span', { class: 'due-pill later' }, dateLabel(dueISO));

  const toggle = h('label', { class: 'switch', title: paid ? 'Mark unpaid' : 'Mark paid' },
    h('input', {
      type: 'checkbox', checked: paid,
      onchange: (e) => { setBillPaid(bill.id, monthKey, e.target.checked); toast(paid ? `${bill.name} reopened` : `${bill.name} marked paid`); },
    }),
    h('span', { class: 'track' }));

  return h('div', { class: 'rowline billrow' },
    h('div', { class: 'grow' },
      h('div', { class: 'billname' }, bill.name),
      h('div', { class: 'billmeta' },
        `due ${dateLabel(dueISO)} · ${bill.autopay ? 'autopay' : 'manual'}`,
        bill.autopay ? '' : ' · flip the switch when paid')),
    pill,
    h('span', { class: 'amount' }, money(bill.amountCents)),
    preview ? h('span', { class: 'badge mut' }, 'next month') : toggle,
    preview ? null : h('span', { style: 'white-space:nowrap' },
      iconBtn('pencil', 'Edit', () => openBillForm(bill)),
      iconBtn('trash', 'Delete', async () => {
        if (await confirmModal('Delete bill?', `"${bill.name}" will stop appearing in due lists.`)) {
          deleteBill(bill.id); toast('Bill removed');
        }
      }, 'danger')));
}

function iconBtn(name, title, onclick, cls = '') {
  const b = h('button', { class: `iconbtn ${cls}`, title, 'aria-label': title, onclick });
  b.append(icon(name));
  return b;
}

function openBillForm(existing = null) {
  const nameInput = h('input', { type: 'text', value: existing?.name ?? '', placeholder: 'e.g. City Power electric', maxlength: 48 });
  const amtInput = h('input', { type: 'text', inputmode: 'decimal', value: existing ? (existing.amountCents / 100).toFixed(2) : '', placeholder: '0.00' });
  const dayInput = h('input', { type: 'number', min: 1, max: 28, value: existing?.dueDay ?? 15 });
  const autoCheck = h('input', { type: 'checkbox', checked: existing?.autopay ?? false });
  modal({
    title: existing ? 'Edit bill' : 'Add a bill',
    build: (body) => body.append(
      field('Name', nameInput),
      h('div', { class: 'form-row' },
        field('Amount ($)', amtInput),
        field('Due day of month', dayInput, '1–28 so it fits every month')),
      h('label', { class: 'checkline' }, autoCheck, 'Paid automatically (autopay)')),
    actions: [{
      label: existing ? 'Save changes' : 'Add bill', kind: 'primary',
      onClick: () => {
        const cents = Math.round(Number(String(amtInput.value).replace(/[$,\s]/g, '')) * 100);
        const day = Number(dayInput.value);
        if (!nameInput.value.trim()) { toast('Give the bill a name', 'err'); return false; }
        if (!Number.isFinite(cents) || cents <= 0) { toast('Amount needs to be a positive number', 'err'); return false; }
        if (!Number.isInteger(day) || day < 1 || day > 28) { toast('Due day must be 1–28', 'err'); return false; }
        if (existing) { updateBill(existing.id, { name: nameInput.value, amountCents: cents, dueDay: day, autopay: autoCheck.checked }); toast('Bill updated'); }
        else { addBill({ name: nameInput.value, amountCents: cents, dueDay: day, autopay: autoCheck.checked }); toast('Bill added'); }
      },
    }],
  });
}
