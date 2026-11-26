// ui.js — tiny DOM helpers shared by every view: element builder, icon set, toasts,
// and a small promise-based modal so every add/edit form uses the same dialog.

import { esc } from './format.js';

/** h('div', {class:'x', onclick:fn}, children...) — compact DOM builder. */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(9)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* Stroke icons, 24 viewBox, currentColor. */
const ICON_PATHS = {
  dashboard: '<rect x="3.5" y="3.5" width="7" height="9" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.6"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.6"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.6"/>',
  transactions: '<path d="M4 7h13M4 7l3-3M4 7l3 3M20 17H7m13 0-3-3m3 3-3 3"/>',
  budgets: '<path d="M12 3v18M12 3a9 9 0 0 1 9 9h-9z"/><circle cx="12" cy="12" r="9"/>',
  bills: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8M15 4V2.8M8.5 10h7M8.5 14h7M8.5 18h4"/>',
  goals: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2m-7 0 1 13h8l1-13"/>',
  warn: '<path d="M12 4 3 20h18zM12 10v4m0 3v.5"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  piggy: '<path d="M5 12a6.5 6.5 0 0 1 13 0c0 1.5-.4 2.4-1.2 3.2.6.5 1.2 1.8 1.2 3H6c0-1.2.6-2.5 1.2-3C5.9 14.4 5 13.5 5 12z"/><path d="M18.5 11h.01M9 9.5c1-1 2.5-1.5 4-1.3"/>',
};

export function icon(name, cls = '') {
  const span = document.createElement('span');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${ICON_PATHS[name] ?? ''}</svg>`;
  return span.firstChild;
}

export function iconHTML(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] ?? ''}</svg>`;
}

let toastTimer = null;
export function toast(msg, kind = 'ok') {
  const root = document.getElementById('toast-root');
  root.innerHTML = '';
  const t = h('div', { class: `toast ${kind === 'err' ? 'err' : ''}`, role: 'status' }, msg);
  root.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

/**
 * modal({title, build(bodyEl, close), actions:[{label, class, onClick(formEls, close)}]})
 * build() fills the body; an action's onClick may return false to keep the dialog open.
 */
export function modal({ title, build, actions = [] }) {
  const root = document.getElementById('modal-root');
  const close = () => { veil.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  const body = h('div');
  build?.(body, close);

  const actionRow = h('div', { class: 'modal-actions' },
    h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
    ...actions.map((a) => h('button', {
      class: `btn ${a.kind ?? 'primary'}`, type: 'button',
      onclick: () => { if (a.onClick(body, close) !== false) close(); },
    }, a.label)),
  );

  const box = h('div', { class: 'modal', role: 'dialog', 'aria-label': title },
    h('h2', {}, title), body, actionRow);
  const veil = h('div', {
    class: 'modal-veil',
    onclick: (e) => { if (e.target === veil) close(); },
  }, box);

  root.innerHTML = '';
  root.append(veil);
  document.addEventListener('keydown', onKey);
  box.querySelector('input, select, textarea, button')?.focus();
  return close;
}

export function confirmModal(title, text, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    modal({
      title,
      build: (body) => body.append(h('p', { class: 'note', style: 'font-size:14px' }, text)),
      actions: [
        { label: 'Keep it', kind: '', onClick: () => resolve(false) },
        { label: confirmLabel, kind: 'danger', onClick: () => resolve(true) },
      ],
    });
  });
}

/** A labelled form field: field('Amount', inputEl, hint?) */
export function field(label, control, hint) {
  return h('div', { class: 'field' },
    h('label', {}, label), control, hint ? h('span', { class: 'hint' }, hint) : null);
}

export function emptyNote(text) {
  return h('div', { class: 'empty' }, text);
}

export { esc };
