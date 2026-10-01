# P0-T03 Independent Verification

- Task: make the canonical E2E command discover and run the complete Playwright suite.
- Verifier: independent subagent `/root/p0_t03_verifier`.
- Base: `main` at `7ecc6a6` (`feat(ui): migrate production to Option C (Charcoal + Pine + Copper) with HeroUI v3.2.4 & Tailwind v4`).
- Verdict: **PASS**.

## Severity findings

- Critical: none.
- High: none.
- Medium: none.
- Low: none.

## Baseline defect and implemented scope

`git show HEAD:package.json` proves that the committed command was filtered to one file:

```text
"test:e2e": "npx playwright test e2e/chess.spec.js"
"test:e2e:ui": "npx playwright test e2e/chess.spec.js --ui"
```

The working-tree change is limited to the two script values in `package.json`:

```text
"test:e2e": "playwright test"
"test:e2e:ui": "playwright test --ui"
```

`package-lock.json`, `playwright.config.js`, and `.github/workflows/ci.yml` have no diff. The workflow still runs `npm run test:e2e` at `.github/workflows/ci.yml:41`, so CI now reaches the same unfiltered command. No dependency or version changed. No Option C theme/style file changed. The other existing source and test changes belong to preceding Phase 0 tasks and were not edited by this verifier.

## Discovery equivalence

Both commands exited 0:

- `npm run test:e2e -- --list`: `Total: 68 tests in 4 files`.
- `npx playwright test --list`: `Total: 68 tests in 4 files`.

After removing only npm's script header, the retained 69 lines (68 cases plus total) were an exact case-sensitive match. The inventory is:

| Project | Spec file | Discovered |
|---|---|---:|
| Chromium | `e2e/chess.spec.js` | 29 |
| Chromium | `e2e/productFlow.spec.js` | 24 |
| Chromium | `e2e/smoke.spec.js` | 9 |
| Chromium | `e2e/stockfish.spec.js` | 6 |
| **Total** | **4 files** | **68** |

The repository-wide E2E marker search found no `test.only`, `test.skip`, `test.fixme`, `describe.only`, or `describe.skip` usage (`rg` exit 1, zero matches). The only E2E diff outside `package.json` adds the earlier Stockfish concurrency regression test with three positive assertions; no assertion was removed or weakened.

## Full unfiltered execution

`npm run test:e2e` ran the canonical `playwright test` command with no file or title filter:

```text
Running 68 tests using 4 workers
68 passed (2.5m)
```

Results: 68 discovered, 68 executed, 68 passed, 0 failed, 0 skipped, 0 filtered. Each file's executed count matched its discovered count in the table above.

## Production self-play

`npm run build` exited 0. Against `vite preview --host 127.0.0.1 --port 4177`, an independent headless Chromium session followed the visible `/play` UI, selected Easy/White, and completed six legal plies:

```text
e4 e6 Nf3 d5 d3 c5
```

- Ply counts after each player/bot pair: `2`, `4`, `6`; a 750 ms stability check found no extra/double move.
- `chess.js` replay passed and returned `rnbqkbnr/pp3ppp/4p3/2pp4/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4`.
- Turn returned to White after every bot response; no stale or stuck request occurred.
- The page started `/stockfish-worker.js?v=2026-05-30-simplified`, observed `{ type: "ready", success: true }`, and captured 11 real `bestmove` messages. Engine source is `stockfish_wasm`; no mock/fallback was used.
- Browser console errors: 0. Page errors: 0. Failed/HTTP >=400 requests: 0.

Evidence: `artifacts/tech-verification/PHASE_0/P0-T03/verifier/self-play.json`, `self-play.png`, the three telemetry JSON files, and `self-play.mjs`.

## Static gates

| Command | Result |
|---|---|
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `npm run build` | PASS, exit 0 |
| `git diff --check` | PASS, exit 0 |

## Acceptance decision

P0-T03 passes: the npm script no longer hides three spec files, npm and direct discovery are identical, CI calls the canonical full command, all 68 tests execute and pass without filters, and the production Stockfish play path independently completes six legal plies without console, page, network, double-move, stale-request, or stuck-engine failures.
