// views/goals.js — savings goals: progress cards, contribute form (also records a savings
// transaction so the ledger and reports agree), edit target/name, add and delete goals.

import { addGoal, contributeToGoal, deleteGoal, getState, monthTrend, updateGoal } from '../store.js';
import { money, parseMoney } from '../format.js';
import { confirmModal, field, h, icon, modal, toast } from '../ui.js';

export function renderGoals(root, ctx) {
  const goals = getState().goals;
  const totalSaved = goals.reduce((s, g) => s + g.savedCents, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetCents, 0);
  const recentSaved = monthTrend(3).reduce((s, m) => s + m.saved, 0);
  const monthlyPace = Math.max(1, Math.round(recentSaved / 3));

  root.append(
    h('div', { class: 'page-head' },
      h('div', {},
        h('h1', {}, 'Savings goals'),
        h('p', { class: 'sub' }, `${money(totalSaved)} put aside toward ${money(totalTarget)} · about ${money(monthlyPace)} goes in each month`)),
      h('button', { class: 'btn primary', onclick: () => openGoalForm() }, icon('plus'), 'New goal')),

    h('div', { class: 'grid grid-2' }, goals.map((g) => goalCard(g, monthlyPace))),

    h('section', { class: 'card', style: 'margin-top:16px' },
      h('h2', { class: 'sec-title' }, 'How contributions work'),
      h('p', { class: 'note', style: 'margin-top:6px;font-size:13.5px' },
        'Adding to a goal also writes a “Savings transfer” into the ledger for today, so the dashboard, transactions list and reports all stay in sync. Goals never pull money back out — to undo a contribution, delete its transaction from the Transactions page.')),
  );
}

function goalCard(g, monthlyPace) {
  const p = g.targetCents > 0 ? g.savedCents / g.targetCents : 0;
  const done = g.savedCents >= g.targetCents;
  const monthsLeft = done ? 0 : Math.ceil((g.targetCents - g.savedCents) / monthlyPace);

  const amtInput = h('input', { type: 'text', inputmode: 'decimal', placeholder: '50', 'aria-label': `Add to ${g.name}` });

  return h('section', { class: 'card goalcard' },
    h('div', { class: 'g-head' },
      h('div', {},
        h('div', { class: 'g-name' }, g.name),
        h('div', { class: 'g-nums' }, `${money(g.savedCents)} of ${money(g.targetCents)}`)),
      h('div', { class: 'g-pct' }, done ? '✓' : `${Math.round(p * 100)}%`)),
    h('div', { class: `prog ${done ? 'sage' : ''}` }, h('i', { style: `width:${Math.min(100, p * 100)}%;background:${done ? 'var(--ok)' : ''}` })),
    h('p', { class: 'g-eta' },
      done ? 'Fully funded — nicely done.'
        : `${money(g.targetCents - g.savedCents)} to go · at ${money(monthlyPace)}/mo that is ~${monthsLeft} month${monthsLeft === 1 ? '' : 's'}`,
      g.note ? ` · ${g.note}` : ''),
    h('div', { class: 'g-actions' },
      amtInput,
      h('button', {
        class: 'btn small copper', disabled: done,
        onclick: () => {
          const cents = parseMoney(amtInput.value);
          if (!Number.isFinite(cents) || cents <= 0) { toast('Enter a positive amount', 'err'); return; }
          contributeToGoal(g.id, Math.round(cents));
          toast(`${money(cents)} moved to ${g.name}`);
        },
      }, 'Add'),
      h('button', { class: 'btn small', onclick: () => { amtInput.value = '50'; amtInput.dispatchEvent(new Event('input')); }, disabled: done }, '$50'),
      h('span', { style: 'flex:1' }),
      iconBtn('pencil', 'Edit goal', () => openGoalForm(g)),
      iconBtn('trash', 'Delete goal', async () => {
        if (await confirmModal('Delete goal?', `"${g.name}" (${money(g.savedCents)} saved) will be removed. Past contribution transactions stay in the ledger.`)) {
          deleteGoal(g.id); toast('Goal removed');
        }
      }, 'danger')));
}

function iconBtn(name, title, onclick, cls = '') {
  const b = h('button', { class: `iconbtn ${cls}`, title, 'aria-label': title, onclick });
  b.append(icon(name));
  return b;
}

function openGoalForm(existing = null) {
  const nameInput = h('input', { type: 'text', value: existing?.name ?? '', placeholder: 'e.g. New bike for spring', maxlength: 40 });
  const targetInput = h('input', { type: 'text', inputmode: 'decimal', value: existing ? (existing.targetCents / 100).toFixed(0) : '', placeholder: 'e.g. 800' });
  const savedInput = h('input', { type: 'text', inputmode: 'decimal', value: existing ? (existing.savedCents / 100).toFixed(2) : '0', placeholder: '0' });
  const noteInput = h('input', { type: 'text', value: existing?.note ?? '', placeholder: 'optional note', maxlength: 60 });
  modal({
    title: existing ? 'Edit goal' : 'New savings goal',
    build: (body) => body.append(
      field('Goal', nameInput),
      h('div', { class: 'form-row' },
        field('Target ($)', targetInput),
        field('Already saved ($)', savedInput)),
      field('Note', noteInput)),
    actions: [{
      label: existing ? 'Save changes' : 'Create goal', kind: 'primary',
      onClick: () => {
        const target = parseMoney(targetInput.value);
        const saved = parseMoney(savedInput.value) || 0;
        if (!nameInput.value.trim()) { toast('Give the goal a name', 'err'); return false; }
        if (!Number.isFinite(target) || target <= 0) { toast('Target needs a positive amount', 'err'); return false; }
        if (saved < 0) { toast('Saved amount can’t be negative', 'err'); return false; }
        if (existing) { updateGoal(existing.id, { name: nameInput.value, targetCents: Math.round(target), savedCents: Math.min(Math.round(target), Math.round(saved)), note: noteInput.value }); toast('Goal updated'); }
        else { addGoal({ name: nameInput.value, targetCents: Math.round(target), savedCents: Math.min(Math.round(target), Math.round(saved)), note: noteInput.value }); toast('Goal created'); }
      },
    }],
  });
}
