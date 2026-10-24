# Engine tests

A safety net that never touches real data: the app is built from `source/` into a temporary folder, served locally and driven by Chromium with every external host blocked (no Supabase, intervals.icu, Open Food Facts, AI or weather). Fixtures are synthetic (`fixtures/synthetic.js`).

## Set up (once)
```
cd tests && npm install            # terser, lightningcss, playwright (Chromium: npx playwright install chromium)
```
Already have the tools somewhere else? Point to them: `ENGINE_NM=/path/to/node_modules` (must contain `terser` and `lightningcss`); Playwright is also looked up in the global npm folder.

## Commands (from `tests/`)
| Command | What it checks |
|---|---|
| `npm run smoke [-- <git-ref>]` | The app boots and renders on phone (390×844), tablet (820×1180) and desktop (1440×900) with **no script errors**, then opens the main tabs. With a git ref it builds that commit instead (`node smoke.js 02f43a9` fails with the blank-page bug). Screenshots: `$ENGINE_SHOTS` or a temp folder. |
| `npm run check-build` | The committed `index.html`, `sw.js`, `manifest.webmanifest` are byte-identical to a fresh build of `source/` (build id ignored). Fails when the published build is stale. |
| `npm test` | Domain tests (running VDOT, e1RM, energy/TDEE identity, recipes, day totals, shopping/pantry), M3 extras and spending (`shop-extras-spend.test.js`), M4b Journal (`journal.test.js`), M4c Check-in/habits/faces (`ux-habits.test.js`), M4d plan↔pantry↔list rule (`stock-model.test.js`), M6 audit (`security`, `intervals-writes`, `off`, `recipe-scan`, `ux-fit`), M4f (`neat-steps`, `food-price`, `m4f`), M5 (`recipe-engine`, `meal-plan`, `food-filters`), M3b (`stores`, `stores-swap`, `stores-food`, `shop-quick`), M8a (`foods-m8a`), M8b (`scan-clarity`, `ai-import`), ritocchi (`ai-chain`, `nav-return`), M9a (`planner-range`), marca e verifica (`brand-everywhere`), M10a (`preview-suggestions`, `pre-start`: pagina pre-avvio, passo, anelli, badge Pantry) and persistence tests (reload, offline, backup→wipe→restore, API keys left out of backups). |
| `npm run verify` | Smoke + tests. Run before every commit that touches `source/`. |
| `npm run release-check` | `verify` plus `check-build`: run after rebuilding the root files, before a merge or publication. During a milestone the root build is intentionally left stale (see `AGENTS.md`). |

## Conventions
- A test named **KNOWN (<id>)** pins a behaviour the backlog plans to change (id = requirement in `docs/PRODUCT_REQUIREMENTS.md`). When that requirement is implemented, update the test in the same commit.
- Every bug fix gets a regression test first (reproduce, then fix).
- A top-level `const` used before its declaration aborts the whole app (blank page). The smoke test catches this, so keep it green.
