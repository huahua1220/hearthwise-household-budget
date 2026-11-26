// store.js — the app's single state object, its localStorage persistence, every mutation,
// and the read-side selectors (month totals, category spend, budget rows, bill instances,
// trend series) the views render from. All views call these, so numbers always agree.

import { buildSeedState, STORAGE_KEY } from './seed.js';
import { dueDateInMonth, monthKeyOf, shiftMonth, thisMonthKey, todayISO, uid } from './format.js';

let state = null;
const listeners = new Set();

export function getState() {
  if (!state) state = load();
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  save();
  for (const fn of listeners) fn();
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions)) return parsed;
    }
  } catch { /* corrupted storage falls through to a fresh seed */ }
  const seeded = buildSeedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full: stay in-memory */ }
}

export function resetDemoData() {
  state = buildSeedState();
  save();
  for (const fn of listeners) fn();
}

/* ---------------------------------- selectors ---------------------------------- */

export function transactionsInMonth(monthKey) {
  return getState().transactions
    .filter((t) => monthKeyOf(t.date) === monthKey)
    .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
}

export function monthTotals(monthKey) {
  let income = 0, spent = 0, saved = 0;
  for (const t of transactionsInMonth(monthKey)) {
    if (t.type === 'income') income += t.amountCents;
    else if (t.type === 'saving') saved += t.amountCents;
    else spent += t.amountCents;
  }
  return { income, spent, saved, net: income - spent - saved };
}

/** Expense spend per category for a month: [{category, cents}] desc. */
export function spendByCategory(monthKey) {
  const map = new Map();
  for (const t of transactionsInMonth(monthKey)) {
    if (t.type !== 'expense') continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amountCents);
  }
  return [...map.entries()].map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents);
}

/** One row per budgeted-or-spent category: {category, budget, spent, pct, remaining}. */
export function budgetRows(monthKey) {
  const { budgets } = getState();
  const spentMap = new Map(spendByCategory(monthKey).map((r) => [r.category, r.cents]));
  const cats = new Set([...Object.keys(budgets), ...spentMap.keys()]);
  return [...cats].map((category) => {
    const budget = budgets[category] ?? 0;
    const spent = spentMap.get(category) ?? 0;
    return { category, budget, spent, pct: budget > 0 ? spent / budget : (spent > 0 ? Infinity : 0), remaining: budget - spent };
  }).sort((a, b) => (b.budget > 0 ? b.spent / b.budget : 9) - (a.budget > 0 ? a.spent / a.budget : 9));
}

export function budgetTotals(monthKey) {
  const rows = budgetRows(monthKey);
  return {
    budget: rows.reduce((s, r) => s + r.budget, 0),
    spent: rows.reduce((s, r) => s + r.spent, 0),
    over: rows.filter((r) => r.budget > 0 && r.spent > r.budget).length,
    warn: rows.filter((r) => r.budget > 0 && r.spent <= r.budget && r.spent / r.budget >= 0.85).length,
  };
}

/**
 * Bill instances for a month: [{bill, dueISO, paid}]. A bill is "paid" when its paidMonths
 * holds the month key; autopay bills flip themselves to paid on their due date.
 */
export function billInstances(monthKey) {
  const today = todayISO();
  return getState().bills.map((bill) => {
    const dueISO = dueDateInMonth(monthKey, bill.dueDay);
    const paid = bill.paidMonths.includes(monthKey) || (bill.autopay && dueISO <= today && monthKey <= monthKeyOf(today));
    return { bill, dueISO, paid };
  }).sort((a, b) => a.bill.dueDay - b.bill.dueDay);
}

/** Unpaid bill instances from today forward, across this month and next. */
export function upcomingBills(withinDays = 14) {
  const today = todayISO();
  const months = [monthKeyOf(today), shiftMonth(monthKeyOf(today), 1)];
  const out = [];
  for (const mk of months) {
    for (const inst of billInstances(mk)) {
      if (inst.paid || inst.dueISO < today) continue;
      out.push({ ...inst, daysUntil: Math.round((new Date(`${inst.dueISO}T12:00`) - new Date(`${today}T12:00`)) / 86400000) });
    }
  }
  return out.filter((b) => b.daysUntil <= withinDays).sort((a, b) => a.dueISO.localeCompare(b.dueISO));
}

/** Bills due before today that were never marked paid and aren't autopay. */
export function overdueBills() {
  const today = todayISO();
  return billInstances(monthKeyOf(today)).filter((i) => !i.paid && !i.bill.autopay && i.dueISO < today);
}

/** Last n months of {key, income, spent, saved, net}, oldest first. */
export function monthTrend(n = 6) {
  const thisKey = thisMonthKey();
  const out = [];
  for (let off = n - 1; off >= 0; off -= 1) {
    const key = shiftMonth(thisKey, -off);
    out.push({ key, ...monthTotals(key) });
  }
  return out;
}

/** Which month keys actually have data (for the month stepper bounds). */
export function knownMonthKeys() {
  const keys = new Set(getState().transactions.map((t) => monthKeyOf(t.date)));
  keys.add(thisMonthKey());
  return [...keys].sort();
}

export function recentTransactions(n = 6) {
  return [...getState().transactions].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date))).slice(0, n);
}

/** Aggregate spend per payee/note for reports. */
export function topPayees(monthKey, n = 6) {
  const map = new Map();
  for (const t of transactionsInMonth(monthKey)) {
    if (t.type !== 'expense') continue;
    const cur = map.get(t.note) ?? { cents: 0, count: 0 };
    cur.cents += t.amountCents; cur.count += 1;
    map.set(t.note, cur);
  }
  return [...map.entries()].map(([note, v]) => ({ note, ...v }))
    .sort((a, b) => b.cents - a.cents).slice(0, n);
}

/* ---------------------------------- mutations ---------------------------------- */

export function addTransaction({ date, type, category, note, amountCents }) {
  const tx = { id: uid('tx'), date, type, category, note: note.trim(), amountCents };
  getState().transactions.push(tx);
  getState().transactions.sort((a, b) => a.date.localeCompare(b.date));
  emit();
  return tx;
}

export function updateTransaction(id, patch) {
  const tx = getState().transactions.find((t) => t.id === id);
  if (!tx) return null;
  Object.assign(tx, patch, { note: (patch.note ?? tx.note).trim() });
  getState().transactions.sort((a, b) => a.date.localeCompare(b.date));
  emit();
  return tx;
}

export function deleteTransaction(id) {
  const s = getState();
  s.transactions = s.transactions.filter((t) => t.id !== id);
  emit();
}

export function setBudget(category, amountCents) {
  if (amountCents > 0) getState().budgets[category] = amountCents;
  else delete getState().budgets[category];
  emit();
}

export function addBill({ name, amountCents, dueDay, autopay }) {
  const bill = { id: uid('bill'), name: name.trim(), amountCents, dueDay: Math.min(28, Math.max(1, dueDay)), autopay: !!autopay, paidMonths: [] };
  getState().bills.push(bill);
  emit();
  return bill;
}

export function updateBill(id, patch) {
  const bill = getState().bills.find((b) => b.id === id);
  if (!bill) return null;
  Object.assign(bill, patch, { name: (patch.name ?? bill.name).trim(), dueDay: Math.min(28, Math.max(1, patch.dueDay ?? bill.dueDay)) });
  emit();
  return bill;
}

export function deleteBill(id) {
  const s = getState();
  s.bills = s.bills.filter((b) => b.id !== id);
  emit();
}

export function setBillPaid(id, monthKey, paid) {
  const bill = getState().bills.find((b) => b.id === id);
  if (!bill) return;
  const set = new Set(bill.paidMonths);
  if (paid) set.add(monthKey); else set.delete(monthKey);
  bill.paidMonths = [...set];
  emit();
}

export function addGoal({ name, targetCents, savedCents = 0, note = '' }) {
  const goal = { id: uid('goal'), name: name.trim(), targetCents, savedCents, note };
  getState().goals.push(goal);
  emit();
  return goal;
}

export function updateGoal(id, patch) {
  const goal = getState().goals.find((g) => g.id === id);
  if (!goal) return null;
  Object.assign(goal, patch, { name: (patch.name ?? goal.name).trim() });
  emit();
  return goal;
}

export function deleteGoal(id) {
  const s = getState();
  s.goals = s.goals.filter((g) => g.id !== id);
  emit();
}

/** Move money into a goal and record the matching savings transaction so totals agree. */
export function contributeToGoal(id, centsToAdd, dateISO) {
  const goal = getState().goals.find((g) => g.id === id);
  if (!goal || centsToAdd <= 0) return;
  goal.savedCents = Math.min(goal.targetCents, goal.savedCents + centsToAdd);
  addTransaction({
    date: dateISO ?? todayISO(),
    type: 'saving',
    category: 'Savings transfer',
    note: `Contribution — ${goal.name}`,
    amountCents: centsToAdd,
  });
}
