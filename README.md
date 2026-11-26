# Hearthwise — a calm ledger for the household

[![make.fun competition](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/huahua1220/hearthwise-household-budget/rank.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/huahua1220/hearthwise-household-budget/reward.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)

A household budget site that runs fully offline in a browser — no build step, no
framework, no network requests. Built for the make.fun best-household-budget-site
bounty.

- `app/` — the site (plain HTML/CSS/ES modules). Serve it statically, e.g.
  `node serve.ts` then open http://localhost:8080.
- `main.ts` — the hand-in program (Node 22): copies `app/` + `screenshots/` to
  `/output` and writes `dossier.json` via `vendor/makefun-frontend.ts`.
  `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`

Features: dashboard (income/spending/savings, budget health, upcoming bills),
transactions with search/filters/add/edit/delete, per-category budgets with
progress bars, recurring bills with paid toggles, savings goals, and reports
(hand-drawn SVG trend/donut/bar/line charts). Data persists in localStorage.
