// seed.js — the demo household: the Alvarez family (two adults, two kids, a dog named Biscuit).
// Builds a deterministic ~3-month ledger ending today so every screen opens with real figures.
// Seeded once into localStorage by store.js; everything after that is the user's own data.

import { daysInMonth, shiftMonth, thisMonthKey, todayISO } from './format.js';

export const STORAGE_KEY = 'hearthwise.v1';

/** Category metadata: kind drives sign and totals; color drives chips, dots and charts. */
export const CATEGORIES = {
  'Rent & mortgage':  { kind: 'expense', color: '#8a4f6d' },
  'Groceries':        { kind: 'expense', color: '#6f9070' },
  'Utilities':        { kind: 'expense', color: '#b98a2f' },
  'Phone & internet': { kind: 'expense', color: '#5f7f9e' },
  'Transport':        { kind: 'expense', color: '#4d7f7b' },
  'Dining out':       { kind: 'expense', color: '#c26f33' },
  'Kids & school':    { kind: 'expense', color: '#3f6fb5' },
  'Healthcare':       { kind: 'expense', color: '#a8584f' },
  'Subscriptions':    { kind: 'expense', color: '#7d6ba8' },
  'Entertainment':    { kind: 'expense', color: '#c08b3e' },
  'Home & garden':    { kind: 'expense', color: '#7f8f4f' },
  'Personal care':    { kind: 'expense', color: '#b06a86' },
  'Pets':             { kind: 'expense', color: '#96705a' },
  'Gifts & giving':   { kind: 'expense', color: '#c25e4e' },
  'Other':            { kind: 'expense', color: '#82928a' },
  'Salary':           { kind: 'income',  color: '#3d7a4f' },
  'Side work':        { kind: 'income',  color: '#58a06b' },
  'Refunds & other':  { kind: 'income',  color: '#8fb98a' },
  'Savings transfer': { kind: 'saving',  color: '#1f6f6b' },
};

export const EXPENSE_CATEGORIES = Object.keys(CATEGORIES).filter((c) => CATEGORIES[c].kind === 'expense');
export const INCOME_CATEGORIES = Object.keys(CATEGORIES).filter((c) => CATEGORIES[c].kind === 'income');

/** Categories a transaction form offers, given its type. */
export function categoriesFor(type) {
  if (type === 'income') return INCOME_CATEGORIES;
  if (type === 'saving') return ['Savings transfer'];
  return EXPENSE_CATEGORIES;
}

export function kindOf(category) { return CATEGORIES[category]?.kind ?? 'expense'; }
export function colorOf(category) { return CATEGORIES[category]?.color ?? '#82928a'; }

/* ---------- deterministic PRNG so every first run sees the same realistic month ---------- */
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(0xa17a2e5);
const between = (lo, hi) => lo + rnd() * (hi - lo);
const cents = (d) => Math.round(d * 100);
const pickOne = (arr) => arr[Math.floor(rnd() * arr.length)];

function buildTransactions() {
  const txs = [];
  let seq = 0;
  const thisKey = thisMonthKey();
  const lastDayThisMonth = Number(todayISO().slice(8, 10));

  function add(monthKey, day, type, category, note, amountCents) {
    const lastDay = monthKey === thisKey ? lastDayThisMonth : daysInMonth(monthKey);
    if (day > lastDay) return;
    seq += 1;
    txs.push({ id: `seed_${seq}`, date: `${monthKey}-${String(day).padStart(2, '0')}`, type, category, note, amountCents });
  }

  const groceryNotes = ['Hillcrest Market', 'GreenGrocer Co-op', 'Hillcrest Market', 'La Esquina produce', 'GreenGrocer Co-op'];
  const diningNotes = ['Miso House ramen', 'Blue Plate Diner', 'Taqueria Sol', 'Pizza night — Verde’s', 'Café Fern brunch', 'Curry Leaf takeout'];
  const funNotes = ['Rivera cinema tickets', 'Board game — Cascadia-like', 'Night market treats', 'Bowling lanes', 'Museum family pass'];

  for (let off = -5; off <= 0; off += 1) {
    const mk = shiftMonth(thisKey, off);

    // income
    add(mk, 1, 'income', 'Salary', 'Paycheck — Daniel (Northbridge Logistics)', 415000);
    add(mk, 1, 'income', 'Salary', 'Paycheck — Priya (Larkspur Clinic)', 378000);
    if (rnd() < 0.8) add(mk, 15 + Math.floor(between(0, 4)), 'income', 'Side work', 'Weekend market stall — Priya’s ceramics', cents(between(90, 260)));
    if (off === -1) add(mk, 9, 'income', 'Refunds & other', 'Return credit — hardware store', cents(31.4));

    // savings transfers out of checking
    add(mk, 2, 'saving', 'Savings transfer', 'Automatic transfer — emergency fund', 40000);
    add(mk, 16, 'saving', 'Savings transfer', 'Vacation fund top-up', 15000);

    // housing + utilities
    add(mk, 1, 'expense', 'Rent & mortgage', 'Rent — Maple St duplex', 165000);
    add(mk, 12, 'expense', 'Utilities', 'City Power electric',
      cents(between(84, off <= -3 ? 168 : off <= -1 ? 128 : 114)));
    add(mk, 20, 'expense', 'Utilities', 'AquaLine water & sewer', cents(between(44, 63)));
    add(mk, 8, 'expense', 'Utilities', 'MetroWaste trash pickup', cents(31.5));
    add(mk, 18, 'expense', 'Phone & internet', 'EverLink fiber internet', cents(69.99));
    add(mk, 14, 'expense', 'Phone & internet', 'Family phone plan — 3 lines', cents(92));

    // transport
    add(mk, 3, 'expense', 'Transport', 'Metro transit pass — Daniel', cents(75));
    for (const g of [6 + Math.floor(between(0, 3)), 17 + Math.floor(between(0, 4))]) {
      add(mk, g, 'expense', 'Transport', 'Gas — Hollis Fuel', cents(between(38, 57)));
    }
    if (off === -1) add(mk, 21, 'expense', 'Transport', 'Oil change — Hollis Service', cents(64.95));

    // groceries ~ weekly
    for (const d of [4, 11, 18, 25]) {
      add(mk, d + Math.floor(between(-1, 1.9)), 'expense', 'Groceries', pickOne(groceryNotes), cents(between(96, 178)));
    }
    add(mk, 9 + Math.floor(between(0, 3)), 'expense', 'Groceries', 'Costco-style stock-up run', cents(between(185, 232)));
    add(mk, 22 + Math.floor(between(0, 3)), 'expense', 'Groceries', 'Farmers market — weekend', cents(between(28, 54)));

    // dining out
    const dineDays = [5, 13, 19, 26];
    for (const d of dineDays) {
      if (rnd() < 0.75) add(mk, d + Math.floor(between(0, 2)), 'expense', 'Dining out', pickOne(diningNotes), cents(between(18, 82)));
    }

    // kids & school
    add(mk, 7, 'expense', 'Kids & school', 'School lunch plan — both kids', cents(60));
    for (const d of [4, 11, 18, 25]) add(mk, d, 'expense', 'Kids & school', 'Piano lessons — Ms. Okafor', cents(30));
    if (rnd() < 0.7) add(mk, 16 + Math.floor(between(0, 4)), 'expense', 'Kids & school', pickOne(['Soccer league fee', 'Art supplies — school project', 'Winter coat — growing kid', 'Field trip contribution']), cents(between(22, 68)));

    // healthcare
    add(mk, 10 + Math.floor(between(0, 8)), 'expense', 'Healthcare', 'Pharmacy — Hill Drug', cents(between(12, 39)));
    if (off === -1) add(mk, 14, 'expense', 'Healthcare', 'Dental checkup — Dr. Sato', cents(96));
    if (off === -2) add(mk, 24, 'expense', 'Healthcare', 'Urgent care copay — sprained wrist', cents(65));

    // subscriptions
    add(mk, 6, 'expense', 'Subscriptions', 'Northwind Video streaming', cents(15.49));
    add(mk, 9, 'expense', 'Subscriptions', 'Loopline Music family plan', cents(10.99));
    add(mk, 11, 'expense', 'Subscriptions', 'CloudSafe photo storage', cents(2.99));
    add(mk, 23, 'expense', 'Subscriptions', 'Morning Ledger news', cents(4.99));
    add(mk, 5, 'expense', 'Subscriptions', 'IronWorks Gym membership', cents(45));

    // entertainment
    for (const d of [8, 21]) {
      if (rnd() < 0.7) add(mk, d + Math.floor(between(0, 3)), 'expense', 'Entertainment', pickOne(funNotes), cents(between(22, 56)));
    }

    // home & garden
    if (rnd() < 0.85) add(mk, 13 + Math.floor(between(0, 6)), 'expense', 'Home & garden', pickOne(['Hardware — leaky faucet fix', 'Potting soil & winter bulbs', 'Furnace filters', 'Paint touch-up kit', 'New smoke detector batteries']), cents(between(16, 74)));

    // personal care
    if (rnd() < 0.8) add(mk, 15 + Math.floor(between(0, 8)), 'expense', 'Personal care', pickOne(['Haircuts — both kids', 'Barber — Daniel', 'Toiletries restock']), cents(between(14, 48)));

    // pets
    add(mk, 15, 'expense', 'Pets', 'Kibble & treats — Biscuit', cents(between(38, 47)));
    if (off === -2) add(mk, 19, 'expense', 'Pets', 'Vet visit — Biscuit’s shots', cents(78));

    // gifts & giving
    if (off === -1) add(mk, 12, 'expense', 'Gifts & giving', 'Birthday gift — Aunt Rosa', cents(45));
    if (rnd() < 0.5) add(mk, 20 + Math.floor(between(0, 6)), 'expense', 'Gifts & giving', pickOne(['Flowers for neighbors', 'School fundraiser', 'Book for a friend']), cents(between(18, 40)));

    // occasional misc
    if (rnd() < 0.4) add(mk, 27 + Math.floor(between(0, 2)), 'expense', 'Other', pickOne(['Dry cleaning', 'Postage & shipping', 'Library fine + used books']), cents(between(9, 26)));
  }

  txs.sort((a, b) => a.date.localeCompare(b.date));
  return txs;
}

function buildBills(thisKey) {
  // dueDay within the month; paidMonths tracks which months were marked paid.
  const bills = [
    { id: 'bill_rent',      name: 'Rent — Maple St duplex',        amountCents: 165000, dueDay: 1,  autopay: true,  paidMonths: [] },
    { id: 'bill_piano',     name: 'Piano lessons — Ms. Okafor',    amountCents: 12000,  dueDay: 3,  autopay: false, paidMonths: [] },
    { id: 'bill_gym',       name: 'IronWorks Gym membership',      amountCents: 4500,   dueDay: 5,  autopay: true,  paidMonths: [] },
    { id: 'bill_video',     name: 'Northwind Video streaming',     amountCents: 1549,   dueDay: 6,  autopay: true,  paidMonths: [] },
    { id: 'bill_trash',     name: 'MetroWaste trash pickup',       amountCents: 3150,   dueDay: 8,  autopay: false, paidMonths: [] },
    { id: 'bill_electric',  name: 'City Power electric',           amountCents: 10400,  dueDay: 12, autopay: false, paidMonths: [] },
    { id: 'bill_phone',     name: 'Family phone plan — 3 lines',   amountCents: 9200,   dueDay: 14, autopay: true,  paidMonths: [] },
    { id: 'bill_insurance', name: 'SafeRide car insurance',        amountCents: 12850,  dueDay: 15, autopay: true,  paidMonths: [] },
    { id: 'bill_internet',  name: 'EverLink fiber internet',       amountCents: 6999,   dueDay: 18, autopay: true,  paidMonths: [] },
    { id: 'bill_water',     name: 'AquaLine water & sewer',        amountCents: 5400,   dueDay: 20, autopay: false, paidMonths: [] },
    { id: 'bill_news',      name: 'Morning Ledger news',           amountCents: 499,    dueDay: 23, autopay: true,  paidMonths: [] },
    { id: 'bill_hoa',       name: 'Neighborhood assoc. dues',      amountCents: 2500,   dueDay: 28, autopay: false, paidMonths: [] },
  ];
  // Everything due on or before today this month was already paid via autopay or by hand,
  // except two mid-month bills left unpaid so the "Due soon" list has life in it.
  const today = Number(todayISO().slice(8, 10));
  for (const b of bills) {
    if (b.dueDay <= today && !(b.id === 'bill_electric' || b.id === 'bill_phone')) {
      b.paidMonths.push(shiftMonth(thisKey, -1), thisKey);
    } else if (b.dueDay <= today) {
      b.paidMonths.push(shiftMonth(thisKey, -1));
    } else {
      b.paidMonths.push(shiftMonth(thisKey, -1));
    }
  }
  return bills;
}

export function buildSeedState() {
  const thisKey = thisMonthKey();
  return {
    version: 1,
    household: 'The Alvarez household',
    transactions: buildTransactions(),
    budgets: {
      'Rent & mortgage': 165000,
      'Groceries': 84000,
      'Utilities': 34000,
      'Phone & internet': 16500,
      'Transport': 32000,
      'Dining out': 26000,
      'Kids & school': 34000,
      'Healthcare': 15000,
      'Subscriptions': 9500,
      'Entertainment': 13000,
      'Home & garden': 15000,
      'Personal care': 8000,
      'Pets': 9000,
      'Gifts & giving': 12000,
    },
    bills: buildBills(thisKey),
    goals: [
      { id: 'goal_emerg',   name: 'Emergency fund',     targetCents: 1000000, savedCents: 645000, note: 'About three months of essentials.' },
      { id: 'goal_vacay',   name: 'Summer road trip',   targetCents: 240000,  savedCents: 112000, note: 'Two weeks up the coast, July.' },
      { id: 'goal_laptop',  name: 'New family laptop',  targetCents: 150000,  savedCents: 64000,  note: 'The 2019 one is on its last legs.' },
      { id: 'goal_gifts',   name: 'Holiday gifts',      targetCents: 80000,   savedCents: 30500,  note: 'Family + teachers + exchanges.' },
      { id: 'goal_fence',   name: 'Backyard fence',     targetCents: 320000,  savedCents: 78000,  note: 'So Biscuit can roam free.' },
    ],
  };
}
