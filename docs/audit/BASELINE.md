# Executable baseline

Date: 2026-10-07 (Asia/Saigon)  
Checkout: clean detached worktree at `dd9a4aa978b2d69b783e21e440caff78841ffdf9`  
Runtime: Node `v24.15.0`, npm `11.12.1`; `.nvmrc` says Node 22 and CI config uses Node 22. This is a clean commit checkout but not a Node 22 run.

No product source was changed before or during these checks. The main workspace has pre-existing user edits; baseline ran in `E:\chess-baseline-head` to keep those edits intact.

## Commands

| Command | Result | Evidence / notes |
| --- | --- | --- |
| `npm ci` | PASS | Clean install: 686 packages in 46s. Warning: deprecated `glob@11.1.0`. npm audit reports 19 advisories: 1 low, 5 moderate, 10 high, 3 critical. No `npm audit fix` was run. |
| `npm run lint` | PASS | ESLint exited 0, no warnings under `--max-warnings 0`. |
| `npm run typecheck` | PASS | `tsc --noEmit` exited 0. |
| `npm run test` | PASS | 58 files, 753 tests passed; duration 93.54s. |
| `npm run build` | PASS | Vite 8.0.10 + PWA build exited 0. Warning: plugin timing reports significant time in `vite:terser`. Build contains `OnlinePlay` and `onlineGameService` chunks. |
| `npm run test:e2e -- --list` | PASS | 72 tests discovered in 4 files (not the 68 stated in README/CURRENT_RUNTIME). |
| `npm run test:e2e` | FAIL | 51 passed, 21 failed, 13.6 minutes. Failures are setup selectors targeting controls/DOM that the current UI no longer renders; see E2E findings below. |

## Warnings and runtime observations

- Playwright/Vite repeatedly logs HeroUI warnings: `<Pressable> child must be focusable` and `A PressResponder was rendered without a pressable child`. These are browser-console warnings, not test failures on the successful page-load paths.
- Playwright's Node processes warn that `NO_COLOR` is ignored while `FORCE_COLOR` is set.
- The E2E no-console-errors-on-load checks pass in `chess.spec.js` and `smoke.spec.js`; the learning-flow no-page-errors check passes. The Stockfish worker no-uncaught-exceptions check passes. The network-issue handling test passes. No distinct uncaught browser exception or network error was reported in the passing flows.
- This was one E2E run; no flakiness rate can be inferred. The 21 observed failures are repeatable setup/selector mismatches within this run, not evidence of intermittent engine failure.
- Responsive overflow checks pass at 360px and 390px. The 375px chessboard test does not reach its viewport assertion because it cannot start a game.
- The passing E2E learning/exercise flow exercises the static corpus loader. `public/corpus/current.json` points to a verified Lichess CC0 delivery whose manifest declares 20,000 records; this contradicts README and `docs/CURRENT_RUNTIME.md` claims that no external corpus is shipped.

## Finding evidence

Each finding includes a reproduction path, expected behavior, and observed behavior. Source-only findings are marked static; no credentialed production Supabase or live Coach provider was available or called in this baseline.

### B-01 — E2E setup selectors do not match the current lobby

- **Evidence:** `e2e/chess.spec.js:58-67,84-92,154-160` looks for `button` controls named “Người mới”/“Đen”; `e2e/productFlow.spec.js:82-88` looks for a button named `Dễ - …`; `e2e/stockfish.spec.js:134-136` depends on `div[aria-label] button` positions. Current `src/components/chess/PreGameLobby.jsx` renders difficulty/color through `AppRadioGroup` and `AppRadioCard`.
- **Reproduction:** run `npm run test:e2e`; Playwright waits 30 seconds on those selectors. The error-context snapshots show radio options such as `radio "Dễ"`, not the expected button. All 21 failures originate from old game/lobby selectors across 3 E2E files.
- **Expected:** tests should select the current accessible radio controls and start button, then exercise the intended game/Coach/worker behavior.
- **Actual:** tests time out before the behavior under test begins. `stockfish.spec.js` also times out on a positional DOM selector (`div[aria-label] button`).
- **Classification:** E2E contract drift. It does not establish a game-domain or Stockfish correctness failure.

### B-02 — Promotion is committed before the promotion dialog can choose

- **Evidence:** `src/contexts/ChessGameContext.tsx:221` defaults `makeMove` promotion to `'q'`; `src/components/chess/ChessBoardPanel.jsx:165-167,206-208` explicitly passes `'q'` on drag and click; `src/components/chess/PromotionModal.jsx:19-35` expects `pendingPromotion` then commits a selected piece.
- **Reproduction:** static trace of a legal pawn move to the last rank through either board event.
- **Expected:** attempt move → pending promotion → choose q/r/b/n → commit; cancel leaves the position unchanged.
- **Actual:** click/drag calls `makeMove(..., 'q')` immediately. No path in `ChessBoardPanel` sets `pendingPromotion`, so the modal cannot arbitrate that move.
- **Classification:** source-audited correctness defect; promotion UI was not reached by the stale E2E setup.

### B-03 — Online route expects absent Game Context actions

- **Evidence:** `src/pages/OnlinePlay.jsx:15-19,35-45` reads `setGameMode`, `setPlayerColor`, and `resetGameToFen`; `src/contexts/ChessGameContext.tsx` exposes `changeGameMode` and `changePlayerColor`, and no `resetGameToFen` or `setGameMode` contract.
- **Reproduction:** static route-to-context contract trace; `/play/online/:gameId` is registered in `src/App.jsx` and the page calls these values during its game setup/subscription flow.
- **Expected:** every route consumes the current public context contract.
- **Actual:** these destructured values are undefined under the current contract, so the page cannot complete its setup. Live Supabase multiplayer was not configured in this baseline.
- **Classification:** source-audited contract drift. Product decision in ADR-001 proposes removal rather than repair.

### B-04 — Profile and sync modules import each other

- **Evidence:** `src/services/userProfileService.js:9,207` imports and calls `syncOnAction`; `src/services/syncService.js` imports profile read/migrate/save functions.
- **Reproduction:** follow ES module imports in either direction.
- **Expected:** persistence stores profile state; an application action explicitly requests sync.
- **Actual:** profile mutation can trigger cloud sync and sync imports profile functions, creating a circular dependency and hidden cloud side effect. Runtime impact was not separately reproduced without auth credentials.
- **Classification:** source-audited architecture/coupling defect.

### B-05 — Sync can replace a whole profile by timestamp

- **Evidence:** `src/services/syncService.js:67-87` returns the cloud profile wholesale when cloud `updated_at` is later; `syncOnLogin` saves that result.
- **Reproduction:** static path with local-only progress and a later-timestamp cloud profile missing that local progress.
- **Expected:** independent offline/concurrent progress is merged or reported as a conflict.
- **Actual:** the newer whole cloud object replaces local profile fields. Cloud conflict behavior was not sent to a live database during baseline.
- **Classification:** source-audited data-loss risk.

### B-06 — Sync status changes are not observable to the badge

- **Evidence:** `src/services/syncService.js:11-18` stores one module variable and exposes getter/setter; `src/components/SyncStatusBadge.jsx:16-25` reads it in an effect dependent only on `user`.
- **Reproduction:** static path: with a signed-in user, change sync status after mount without changing `user`.
- **Expected:** badge renders each status transition.
- **Actual:** no subscription or state event triggers a render, so the displayed status can remain stale.
- **Classification:** source-audited UI state defect.

### B-07 — Coach UI context is not sent to the model

- **Evidence:** `src/services/coachService.ts` defines FEN/history/PGN/level/style; `api/coach.js` extracts only schema/question/FEN/playerLevel; `api/coachHandler.js:getCoachResponse` calls `callAIProvider(question)` and the provider sends only that string.
- **Reproduction:** static request-to-provider trace; the Coach response schema states `engineSource: 'none'` and `knowledgeSource: 'none'`.
- **Expected:** board-specific Coach claims use validated chess context/evidence or are clearly general advice.
- **Actual:** FEN/history/PGN/review evidence does not reach the provider, even though the panel can submit it. Client and server also independently return basic fallback prose.
- **Classification:** source-audited correctness/truthfulness defect.

### B-08 — Coach endpoint lacks the stated security boundary

- **Evidence:** `api/coach.js` calls `req.json()` and validates only schema version/question presence; `server/index.js` sets a 1 MB body limit but no auth/rate limit; `server/routes/coach.js` has no field length/history/PGN validation; `api/coachHandler.js` reads `VITE_CLAUDE_API_KEY` as a secret alias.
- **Reproduction:** static transport/handler audit. No malformed or abusive request was sent to a deployed endpoint.
- **Expected:** bounded schema, auth policy, rate limit, provider timeout/max tokens, safe client errors, and server-only secret naming.
- **Actual:** those limits/policies are absent in the inspected handlers; the provider failure is converted into basic prose.
- **Classification:** security design gap requiring endpoint verification before enabling live Coach.

### B-09 — RAG schema/services are not on the Coach request path

- **Evidence:** `src/services/embeddingService.js` is disabled; `vectorSearchService.js` is test-only; `api/coachHandler.js` returns `knowledgeSource: 'none'`; `supabase/schema.sql` still defines pgvector tables and `match_chess_knowledge`.
- **Reproduction:** static import/runtime trace from Coach request; no retrieval call occurs.
- **Expected:** either retrieval supplies cited evidence to Coach or the unused subsystem is retired safely.
- **Actual:** DB/services represent a dormant RAG implementation; deployed row counts were not available.
- **Classification:** source-audited dead capability/data-retention question.

### B-10 — Product/design/data documentation disagrees with shipped behavior

- **Evidence:** `REDESIGN_PLAN.md` excludes multiplayer, but `src/App.jsx`, `Home.jsx`, `OnlinePlay.jsx`, and `BotSettings.jsx` expose online and local modes. `DESIGN.md` is a Supabase-inspired light theme, while user-supplied `AGENTS.md`, `UI_OPTION_C_REPORT.md`, and `src/styles/theme-charcoal-pine.css` define charcoal/pine/copper. `README.md` and `docs/CURRENT_RUNTIME.md` say no external corpus is bundled; `public/corpus/current.json` points to the 20,000-record manifest and `src/services/corpusLoader.ts` fetches it.
- **Reproduction:** compare route/component contracts and shipped `public` pointer/manifest with docs.
- **Expected:** one current product scope, one design-token authority, and docs matching the current static corpus delivery.
- **Actual:** the repository contains conflicting generations of product scope, design decisions, and corpus status.
- **Classification:** source/docs drift; no files were deleted or rewritten during audit.

## E2E failure groups

The 21 failed cases comprise 19 tests in `e2e/chess.spec.js` waiting for lobby/game state through old button names, one Coach test in `e2e/productFlow.spec.js:82-88` waiting for a `Dễ - …` button while the lobby renders radio options, and one Stockfish cancellation test in `e2e/stockfish.spec.js:134-136` waiting for positional `div[aria-label] button` elements. The runner summary confirms the 19 + 1 + 1 split. The other 51 tests pass.

## Follow-up verification — 2026-10-07

This is a dated follow-up to the historical clean-checkout baseline above; it does not rewrite baseline results.

| Command | Result |
|---|---|
| `npm ci` | Passed earlier in this execution; 686 packages installed. npm reported 19 audit advisories (1 low, 5 moderate, 10 high, 3 critical) and a `glob@11.1.0` deprecation. No automatic audit fix was applied. |
| `npm run lint` | Passed (exit 0). |
| `npm run typecheck` | Passed (exit 0). |
| `npm test` | Passed: 58 files, 752 tests. |
| `npm run build` | Passed. Vite reported plugin timing (terser 88%); no build failure. |
| `npm run test:e2e -- --list` | Passed: 72 tests in 4 files. |
| `npm run test:e2e` | Passed: 72/72 in 4.6 minutes, one Chromium worker. Includes 360px and 390px overflow checks, bot lifecycle cancellation, Coach and learning flows. |

Observed non-failing runtime warnings: HeroUI emitted repeated `<Pressable> child must be focusable` / `PressResponder was rendered without a pressable child` warnings across route loads, plus visible-label warnings in game controls. The Playwright web server also reported `NO_COLOR` ignored because `FORCE_COLOR` is set. These are console warnings, not exceptions; `No Console Errors` and unhandled-rejection E2E checks passed. The warning sources still need caller-level tracing before a fix is claimed. No deployed Supabase requests/data were available to verify migration state, policies, row counts, or external network behavior.

The prior baseline selector failures were addressed against the current radio/tab semantics. The full current E2E run passed after also fixing bot orchestration to avoid starting a bot search while the game is in the lobby; test evidence for new-game cancellation passed. Stale response rejection remains covered by the `useBotMove` generation tests, not by the E2E cancellation test itself.

The built `dist/assets` scan found no `CLAUDE_API_KEY`, `VITE_CLAUDE_API_KEY`, or `sk-ant-` provider-secret markers.

## Phase 2 ownership follow-up — 2026-10-08

The Play UI now owns board orientation and manual flip state; `ChessGameContext` no longer exposes these UI commands. Post-change gates: lint and typecheck passed; `npm test` passed with 58 files / 754 tests; `npm run build` and E2E listing passed (72 tests / 4 files). The first full E2E rerun had 71/72 pass; the Stockfish difficulty-contract test exceeded 30 seconds and its page evaluation was destroyed. The test passed alone in 5.7 seconds, and a second full run passed 72/72 in 4.2 minutes. No code change was made for that timeout. Current E2E still prints non-failing HeroUI Pressable and missing-label warnings; see the prior follow-up section. The orientation slice passed 360px and 390px overflow checks.

The subsequent game-generation and unused-settings slices passed focused tests (63 tests for game generation; 56 for the settings/context slice), lint, typecheck, and source diff checks. A full suite/build/E2E was not rerun after these later source changes; the prior full-run results above remain the latest full verification.

### Bot request ownership follow-up - 2026-10-08

After moving bot thinking status to `useBotMove`, full verification passed: `npm test` (58 files / 757 tests), `npm run lint`, `npm run typecheck`, and `npm run build`. Targeted Playwright overflow checks passed at 360px and 390px (and 375px, 768px, 1024px, 1366px). E2E emitted the already-recorded non-failing HeroUI Pressable warnings. Independent spec and quality reviews passed after fixes for reset-while-thinking replacement and same-generation stale response rejection.

## Sync and result-recording checkpoint - 2026-10-15

This checkpoint precedes implementation of ADR-004's canonical game outcome. Provider-lifetime result-recording deduplication and the legacy-progress/upload-acknowledgement sync fixes passed independent spec and quality reviews. The new upload tests use real localStorage/profile persistence; five data-loss cases failed before the fix and all nine cases pass afterward.

| Command | Result |
|---|---|
| `npm run lint` | Passed (exit 0). |
| `npm run typecheck` | Passed (exit 0). |
| `npm test` | Passed: 59 files / 777 tests, 71.61 seconds. |
| `npm run build` | Passed; Vite reported plugin timing for terser. |
| `npm run test:e2e -- --list` | Passed: 72 tests in 4 files. |
| `npm run test:e2e` | Passed: 72/72 in 4.6 minutes; includes 360px/390px overflow, bot cancellation, keyboard/accessibility, Coach and learning flows. |

An earlier full unit run timed out in the importer SIGINT-resume test and the board result-recording/remount test (15-second limits). Running both files together subsequently passed 34/34 tests, and the fresh full suite above passed without changing timeout settings. The exact cause of those intermittent timeouts is not established.

E2E continues to emit the recorded non-failing HeroUI Pressable and missing-label warnings plus `NO_COLOR`/`FORCE_COLOR` warnings. Console-error and unhandled-rejection assertions passed. Deployed Supabase state, durable Vercel rate limiting, and live-provider configuration remain unverified.
