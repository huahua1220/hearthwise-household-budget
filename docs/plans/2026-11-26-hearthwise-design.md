# Hearthwise — household budget site (design)

Entry for best-household-budget-site-20261126-1457. Plain static files under `app/`, no build
step, no framework, no network references. Judge sees mostly screenshots: aim for dense,
working, readable-at-a-glance screens on desktop and phone.

## Identity
- Name: **Hearthwise** — "a calm ledger for the household". Original brand, invented here.
- Palette: cream paper `#f7f2e9`, spruce ink `#22332f`, deep teal `#1f6f6b`, copper `#c26f33`,
  sage, brick-red for over-budget. Headings in a serif system stack (Georgia/Iowan), UI in
  system sans. Currency USD. Household persona: the Alvarez family (two adults, two kids).

## Pages (hash routes, all in nav)
- `#/` Dashboard: month KPIs (income / spent / saved / left), budget health bar, spending
  donut, upcoming bills (14d), budget watch (over/near), recent activity, goal strip.
- `#/transactions` Search + type/category/month filters, totals of filtered set, add via
  modal form, edit, delete. Grouped, signed amounts.
- `#/budgets` Per-category monthly budget editor: spent vs budget, progress bar, remaining /
  over-by, totals row, add/remove budget lines.
- `#/bills` Recurring bills: due-soon / later / next-month sections, paid toggle per month,
  autopay badge, add/edit/delete.
- `#/goals` Savings goals: progress cards, contribute form, edit target, add/delete goal.
- `#/reports` 6-month income/expense/savings trend, category bar breakdown, savings-rate
  line, top payees, biggest expense. All charts hand-drawn inline SVG (charts.js).

## Data (localStorage `hearthwise.v1`)
`{ transactions[], budgets{}, bills[], goals[] }` seeded by `seed.js` (deterministic PRNG,
~3.5 months ending today: salaries, rent, utilities, groceries, transport, subscriptions,
kids, healthcare, dining, savings transfers). Mutations in `store.js`; every control persists.

## Files (one job each)
`app/index.html`; `styles/{base,components,pages}.css`;
`js/{format,seed,store,charts,ui,main}.js`; `js/views/{dashboard,transactions,budgets,bills,goals,reports}.js`.

## Layout
Desktop: left sidebar (brand, nav, month switcher). Phone (<760px): top bar + fixed bottom
tab nav with SVG icons. Readable at 390px.

## Verification
Serve with `node serve.ts`; click through every control with agent-browser at 1280×800 and
390×844; 4 screenshots (cover dashboard, transactions, reports, phone view) ≤256KiB, JPEG.
Run `MAKEFUN_OUTPUT_DIR=out node main.ts`, check gate rows by hand.
