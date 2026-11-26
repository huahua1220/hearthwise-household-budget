// main.js — app bootstrap: hash router, sidebar + bottom-tab navigation, the shared
// "viewing month" state every view steps through, and the footer with demo-data reset.

import { renderDashboard } from './views/dashboard.js';
import { renderTransactions } from './views/transactions.js';
import { renderBudgets } from './views/budgets.js';
import { renderBills } from './views/bills.js';
import { renderGoals } from './views/goals.js';
import { renderReports } from './views/reports.js';
import { getState, knownMonthKeys, overdueBills, resetDemoData, subscribe } from './store.js';
import { daysInMonth, monthLabel, shiftMonth, thisMonthKey, todayISO } from './format.js';
import { h, icon, toast } from './ui.js';

const ROUTES = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', render: renderDashboard },
  { path: '/transactions', label: 'Transactions', icon: 'transactions', render: renderTransactions },
  { path: '/budgets', label: 'Budgets', icon: 'budgets', render: renderBudgets },
  { path: '/bills', label: 'Bills', icon: 'bills', render: renderBills },
  { path: '/goals', label: 'Goals', icon: 'goals', render: renderGoals },
  { path: '/reports', label: 'Reports', icon: 'reports', render: renderReports },
];

const appEl = document.getElementById('app');
let viewMonth = thisMonthKey();
let currentPath = '/';

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path: ROUTES.some((r) => r.path === path) ? path : '/', params: new URLSearchParams(qs ?? '') };
}

function monthStepper() {
  const keys = knownMonthKeys();
  const first = keys[0];
  const now = thisMonthKey();
  const canBack = viewMonth > first;
  const canFwd = viewMonth < now;
  return h('span', { class: 'month-step' },
    h('button', {
      'aria-label': 'Previous month', disabled: !canBack,
      onclick: () => { viewMonth = shiftMonth(viewMonth, -1); render(); },
    }, '‹'),
    h('span', { class: 'mlabel' }, monthLabel(viewMonth)),
    h('button', {
      'aria-label': 'Next month', disabled: !canFwd,
      onclick: () => { viewMonth = shiftMonth(viewMonth, 1); render(); },
    }, '›'));
}

function buildNav() {
  const side = document.getElementById('side-nav');
  const tab = document.getElementById('tabbar');
  side.innerHTML = '';
  tab.innerHTML = '';
  for (const r of ROUTES) {
    const mkLink = () => {
      const a = h('a', { href: `#${r.path}`, class: currentPath === r.path ? 'active' : '' });
      a.append(icon(r.icon), document.createTextNode(r.label));
      return a;
    };
    side.append(mkLink());
    tab.append(mkLink());
  }
}

function render() {
  const { path, params } = parseHash();
  currentPath = path;
  buildNav();

  const route = ROUTES.find((r) => r.path === path);
  document.getElementById('topbar-house').textContent = getState().household;
  appEl.innerHTML = '';
  const ctx = {
    month: viewMonth,
    params,
    today: todayISO(),
    daysLeftInMonth: daysInMonth(viewMonth) - Number(todayISO().slice(8, 10)),
    overdue: overdueBills(),
    monthStepper,
  };
  route.render(appEl, ctx);
  window.scrollTo({ top: 0 });
}

function buildFooter() {
  document.getElementById('sidebar-foot').append(
    h('span', { class: 'foot-house' }, getState().household),
    h('span', {}, 'Data lives only in this browser’s localStorage — nothing leaves the device.'),
    h('button', {
      type: 'button',
      onclick: () => {
        if (confirm('Reset back to the original demo household? Your edits will be lost.')) {
          resetDemoData(); toast('Demo data restored');
        }
      },
    }, 'Reset demo data'),
  );
  const foot = document.getElementById('page-foot');
  foot.append(
    h('p', {}, 'Hearthwise keeps your ledger in localStorage on this device — no account, no sync, no network.'),
    h('p', {}, 'Made for the make.fun household-budget bounty.'),
  );
}

window.addEventListener('hashchange', render);

subscribe(() => render());
buildFooter();
render();
