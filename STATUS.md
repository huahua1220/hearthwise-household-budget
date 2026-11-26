# STATUS — ready for bundle/check/submit

**Built:** Hearthwise — a household budget site. Vanilla ES modules, no framework,
no network references, all charts hand-drawn inline SVG, localStorage persistence
(`hearthwise.v1`), original identity (spruce/cream/copper, serif headings, invented
brand + copy + dataset: the Alvarez household).

## Pages (all reachable from sidebar nav / bottom tabbar on phone)

| Route | Contents |
|---|---|
| `#/` | Dashboard: month KPIs, budget-health ring, category donut (click legend → filtered ledger), upcoming bills w/ Pay buttons, overdue badge, budget-watch bars, recent activity, goals strip |
| `#/transactions` | Day-grouped ledger, live search + type/category filters (persist across re-renders, `?cat=` deep links), filtered totals, add/edit/delete via modal |
| `#/budgets` | 14 category limits, click-to-edit amounts, spent/left, progress bars, NEAR/OVER/OK badges, totals row, add-budget dialog |
| `#/bills` | Overdue / due-soon / later / paid / next-month sections, paid toggles, autopay badges, add/edit/delete |
| `#/goals` | 5 savings goals, progress + ETA at current pace, contribute (writes a matching savings transaction), edit/delete/new |
| `#/reports` | 6-month income/spend/save trend bars, savings-rate line, category breakdown, top payees, stat cards |

Seed: deterministic ~6 months (Jun–Nov 2026), 240 transactions, 12 bills, 14 budgets,
5 goals — every screen opens populated. Month stepper walks all 6 months.

## Screenshots (in `screenshots/`)

| file | view | px | KiB |
|---|---|---|---|
| `1-dashboard.jpg` (cover) | `#/` | 1280×800 | 119 |
| `2-budgets.jpg` | `#/budgets` | 1280×800 | 97 |
| `3-reports.jpg` | `#/reports` | 1280×800 | 107 |
| `4-phone.jpg` | `#/transactions` | 390×844 | 46 |

## Verification done

- Every control clicked through with agent-browser at 1280×800 and 390×844:
  add/edit/delete tx, search+filters, month stepper, budget inline edit, bill paid
  toggle, add bill, goal contribute (ledger stays consistent), reset demo.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` → builds `out/`; two runs byte-identical.
- `makefun check --kit kit --repo repo`: pass on competition_open, snapshot,
  license_osi, entrypoint; expected FAIL on transcripts_present (bundle at submit);
  repo_public/owner/created/commit/duplicate are marked "at submission".
- Gate self-checks: app/ = 18 files, 160 KB; index.html 2.4 KB; zero external URLs
  in sources (dossier confirms `URLs in the source: 0`); screenshots all ≤ 1280
  long side, ≥ 360 short side, ≤ 256 KiB, JPEG. First load 37 KB gzip / 17 files.
- `vendor/makefun-frontend.ts` byte-identical to kit (sha256 4c8da1c8…).

## For the supervisor

1. README.md contains `{owner}`/`{repo}` placeholders in the three badge URLs —
   replace with the real GitHub owner/repo **and commit before pushing** (the
   repo_readme check rejects placeholders).
2. GitHub About needs a make.fun website link + topic `makefun`; repo must be
   created after the opening (2026-11-26T14:57Z) — it was.
3. `.makefun/owner.json` may be needed if not submitting as repo owner.
4. Bundle transcripts from this session, then `submit --repo-url … --commit <sha>`.
   Do not submit from this session — per prompt_spec.md the supervisor submits.
