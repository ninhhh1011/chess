# Chess Refactor Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the staged refactor so product scope, game state, engine results, profile/sync, auth, Coach, database, and UI boundaries each have one truthful source of truth, with deployed data preserved.

**Architecture:** Continue from the accepted product-scope ADR and current implementation; do not restart Phase 0/1 or mass-move files. Close correctness contracts first, then narrow ownership one capability at a time, and remove dormant paths only after import/runtime/data-retention evidence. Use sequential implementation subagents per task with spec review followed by code-quality review; parallelize read-only research only.

**Tech Stack:** React 19, Vite, TypeScript/JavaScript, chess.js, Stockfish WASM Worker, Supabase, Vitest, Playwright, HeroUI v3, Tailwind CSS 4.

**Source documents:** `docs/architecture/ADR-001-product-scope.md`, `TARGET_ARCHITECTURE.md`, `CURRENT_SYSTEM.md`, `REFACTOR_BACKLOG.md`, `docs/audit/BASELINE.md`, and the repository `AGENTS.md`.

---

## Current checkpoint

- Phase 0 and Phase 1 artifacts exist. `BASELINE.md` is historical evidence from clean commit `dd9a4aa`; do not rewrite it to describe current uncommitted code.
- Phase 2 promotion, lifecycle/session ownership, and online/local client removal are implemented. The online table is retained behind a forward deny-all migration pending deployed data inventory.
- Phase 3 WHITE POV conversion now occurs at the Stockfish service boundary; `AnalysisResult` requires `perspective: 'white'`; consumer-side normalization has been removed from game review and the live evaluation bar. Fallback disclosure, missing scores, worker failure paths, and mate-distance CPL are covered by focused tests.
- The workspace already contains unrelated uncommitted changes. Never reset/clean the worktree or stage the whole repository. Implementers must inspect `git status` and stage only files assigned to their task.
- No production database mutation is authorized by this plan alone. Any task that requires access to or mutation of a deployed Supabase project stops at a documented data/policy report until the project owner supplies access and confirms data disposition.
- Task 2 progress: removed write-only `botMoveSource` and unread game-over modal flag; derived board last-move highlights from `activeGame` history; moved engine hints to `ChessGameBoard`, keyed them to the requested FEN, and guarded stale responses from manual and panel requests. Review position/navigation now use an owned reducer with custom-root replay, and move annotations plus pending live analysis are owned there with request-ID guards, undo trimming, and reset behavior. Bot request identity no longer lives in `ChessGameContext`; the board cancels its `useBotMove` request when position, side-to-move, lifecycle, or game generation changes. `GameSession.generation` is the sole replacement identity: `RESET_POSITION` increments it once, and move/undo/color/lifecycle actions preserve it. `Play` orientation reset, bot request identity, and board remount consume the adapter's `gameGeneration`. Board orientation belongs to the `Play` route and mobile controls live under `Play`. Human-readable result notice remains UI adapter state outside the game-session domain reducer. Focused orientation and game/context tests pass.
- Latest execution checkpoint (2026-10-08): Play owns board orientation/flip; `ChessGameContext` no longer exposes those UI commands, and `MobileControls` is mounted inside the Play route. Removed unused goal/time-control settings from the game context and `startGame` contract. `GameSession.generation` is now the sole game-replacement identity; orientation reset, bot request key, and board remount consume it. The full suite before these final two Phase 2 slices passed lint, typecheck, 754 unit tests, build, E2E listing, and 72/72 E2E. After the slices, focused context/board/lobby/game-session suite (63 tests), lint, typecheck and Graphify pass. One prior full E2E run had a single 30-second Stockfish difficulty test timeout; the isolated test and the full retry passed without code changes. 360px/390px overflow and keyboard checks pass. HeroUI PressResponder and missing-label warnings persist; exact evidence is recorded in `docs/audit/BASELINE.md`.
- P1-01 follow-up slice (2026-10-08): removed `recordedGamePgn` from `ChessGameContext`; the provider now exposes one private-ref-backed `claimGameResultRecording` command keyed by `${gameGeneration}:${currentPgn}`. The claim survives board route remounts and clears on reset/undo to a non-terminal position. Focused coverage exercises result-flow rerenders, board remount, and recording identical PGN in a replacement generation.

## Execution rules

1. Work in the dependency order below. A phase is complete only when its acceptance criteria and documentation updates are satisfied.
2. Use one implementation subagent at a time because tasks touch a shared checkout. For each task: provide its complete instructions, use TDD for behavior changes, run focused checks, dispatch a spec reviewer, then a code-quality reviewer; fix and re-review findings before the next task.
3. Use read-only subagents in parallel for independent inventories or review. Do not have multiple implementers edit the shared checkout concurrently.
4. Preserve behavior during boundary refactors. Product behavior changes require an ADR/update and explicit tests.
5. Keep `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e -- --list`, and full `npm run test:e2e` as release gates. Verify 360px and 390px mobile layouts for UI-facing phases.
6. Generated Graphify output stays out of commits. After source structure changes, run `graphify extract src --code-only --no-cluster --out .` and refresh the current map only if its result changes a documented relationship.

## Dependency order

```text
Task 0: reconcile stale source maps and backlog evidence
  ├─ Task 1: close WHITE POV / truthful engine result contract
  │    ├─ Task 2: finish game domain and context ownership
  │    └─ Task 3: isolate engine lifecycle, fallback, and cancellation
  ├─ Task 4: profile conflict safety and persistence/sync boundary
  ├─ Task 5: narrow auth boundary
  └─ Task 6: secure/ground Coach, then consolidate its implementation
       └─ Task 7: deployed-data inventory + RAG/database convergence
            ├─ Task 8: feature boundaries and UI token cleanup
            └─ Task 9: repository hygiene and evidence disposition
Task 10: full regression, E2E repair, and final documentation audit
```

Tasks 2–6 may be scheduled independently after Task 1 where noted, but implementation remains sequential in the shared worktree. Task 7 is gated on access to deployed database inventory for destructive decisions; code/schema work that preserves all data may proceed while waiting.

---

## Task 0 — Reconcile current documentation against source — COMPLETE

**Files:** `docs/CURRENT_RUNTIME.md`, `docs/architecture/CURRENT_SYSTEM.md`, `docs/architecture/REFACTOR_BACKLOG.md`, `docs/architecture/FILE_CLASSIFICATION.csv`, and only the affected claims in `README.md`/the documentation index.

- [x] Search route, mode, corpus, Coach, profile-table, and evaluation claims against current source and build output.
- [x] Update stale statements: online route/service are removed; promotion is explicit; WHITE POV is encoded in `AnalysisResult`; cloud profile table naming is verified from `cloudProfileService.js`; corpus availability is verified against actual assets and runtime loaders.
- [x] Preserve baseline test counts/failures as historical, dated evidence. Add a separate current verification entry when new full checks run.
- [x] Regenerate file classification from the exact current discovery roots; verify row count equals `rg --files --hidden src api server supabase e2e scripts .github docs artifacts ui-lab .superpowers | Measure-Object` and every discovered path has one category.

**Acceptance:** no current source map asserts removed routes, modes, or unverified data claims; historical records remain clearly dated; classification count matches discovered paths.

**Checks:** targeted searches for `/play/online`, `OnlinePlay`, `GAME_MODES`, corpus loader paths, `profiles`/`user_progress`, and `normalizeEvalToWhite`; `git diff --check`.

---

## Task 1 — Close engine evaluation perspective and source contract — COMPLETE

**Files:** `src/domain/engine/evaluation.ts`, `src/types/ChessTypes.ts`, `src/types/analysis.ts`, `src/services/stockfishService.ts`, `src/services/analysis/gameAnalyzer.ts`, `src/services/analysis/analysisFact.ts`, `src/services/analysis/orientation.ts`, `src/components/chess/LiveEvaluationBar.jsx`, `src/components/analysis/EngineAnalysisPanel.jsx`, `src/components/ChessGameBoard.jsx`, `src/utils/moveQuality.js`, `src/test/stockfish.test.ts`, `src/test/stockfishWorker.test.ts`, `src/test/analysisOrientation.test.ts`, `src/test/gameAnalyzer.test.ts`, `src/test/analysisFactContract.test.ts`, `src/utils/moveQuality.test.js`, and `src/hooks/useEngineAnalysis.test.js`.

- [x] Trace every evaluation producer/consumer with `rg` and inspect each caller; document whether source is Stockfish, fallback, or absent.
- [x] Add adapter-level tests for White-to-move and Black-to-move cp scores and positive/negative mate scores, including display sign and `perspective: 'white'` metadata.
- [x] Require consumers to accept only canonical WHITE POV values; remove any remaining sign conversion or FEN-based evaluation flip outside `src/domain/engine/evaluation.ts`.
- [x] Verify `calculateMoverCPL` for both movers with canonical scores. Review CPL preserves mate-distance ordering; live annotations keep the existing ±99 mate band so their labels/thresholds do not change. Both operate on canonical White-POV evaluations, while their distinct presentation semantics remain explicit.
- [x] Treat absent evaluation as unknown: live annotations must not convert fallback/null evaluation into a neutral zero and label a move good/best. Cover this and the no-score Stockfish result path.
- [x] Correct stale evaluation perspective comments in `orientation.ts` and `types/analysis.ts`; persisted `analysis.v1` facts use White POV but do not add a schema field unless evidence shows mixed-perspective stored facts.
- [x] Define and test result semantics for unavailable engine, fallback move, fallback evaluation (if one exists), invalid worker output, and no legal moves. Never label fallback as Stockfish.
- [x] Verify persisted `analysis.v1` facts carry the same WHITE POV contract; version/migrate facts only if current evidence proves a stored perspective mismatch.

**Acceptance:** one conversion boundary; the engine result type carries perspective and source; no component/analyzer normalizes engine output again; missing/fallback values cannot create false move-quality claims; live and persisted loss calculations agree for both sides while their established display vocabularies remain explicit; review facts and live UI agree for both sides to move.

**Checks:** `npm test -- src/test/stockfish.test.ts src/test/stockfishWorker.test.ts src/test/analysisOrientation.test.ts src/test/gameAnalyzer.test.ts src/test/analysisFactContract.test.ts src/utils/moveQuality.test.js src/hooks/useEngineAnalysis.test.js`; then `npm run typecheck` and `npm test`.

---

## Task 2 — Finish game domain and remove remaining context ownership

**Files:** `src/contexts/ChessGameContext.tsx`, `src/domain/game/gameSession.ts`, `src/domain/game/gameLifecycle.ts`, `src/components/ChessGameBoard.jsx`, `src/components/chess/GameLayout.jsx`, `src/components/chess/PostGameReview.jsx`, `src/components/review/PostGameReview.tsx`, `src/components/chess/ReviewNavigator.jsx`, `src/hooks/useBotMove.ts`, `src/hooks/useEngineAnalysis.js`, `src/contexts/ChessGameContext.test.jsx`, `src/contexts/ChessGameContext.integration.test.jsx`, `src/components/ChessGameBoard.integration.test.jsx`, `src/components/chess/ChessBoardPanel.test.jsx`, `src/domain/game/gameSession.test.ts`, and `src/domain/game/gameLifecycle.test.ts`.

- [ ] Re-audit context state and every consumer. Keep live position/turn/legal move/result/player side/promotion/lifecycle in the session reducer.
- [ ] Move review/analysis position, annotations, and review navigation to the review owner; move board orientation and last-move display state to play UI; keep engine state out of domain; keep bot request identity/cancellation in the bot application flow. Review position/navigation and annotations are complete; last-move display is derived. Board orientation and manual flip ownership moved to `Play`; bot request ownership is paired with Task 3. `gameGeneration` now comes from `GameSession` and drives reset identity, board remount and stale bot request protection.
- [ ] Replace context convenience methods that make components mutate multiple unrelated state values with explicit commands/use-case functions only where multiple callers need the same behavior.
- [ ] Retain a compatibility context adapter during migration; remove an exposed field only after `rg` confirms callers, tests, and route usage have migrated.
- [x] Replace the context-owned board remount counter with `gameGeneration` in `GameSession`. `RESET_POSITION` increments it exactly once per replacement; ordinary moves, undo, and lifecycle transitions leave it unchanged. Use this single generation for Play orientation reset, board remount, and bot position identity so a new game at the same FEN is distinct. Context start/restart integration verifies one increment per replacement.
- [ ] Pin move/illegal/castling/en-passant/promotion/check/mate/draw/undo/reset/resign/review/analysis transitions and reset/route replacement invalidation.
- [x] Verify stale bot replies from an old FEN/session cannot commit after undo, reset, route exit, or a new game. `useBotMove.test.ts` covers generation-based stale response rejection; the targeted E2E verifies the old search is aborted and the replacement game can make a bot move. The bot effect cancels and returns outside `playing`.
- [x] Remove `isBotThinking` from the context; use `useBotMove.isThinking` as the sole request-status source and pass it into board interaction, controls, keyboard navigation, and status UI. Reset/FEN changes replace pending requests, while a private monotonic request token rejects stale completions even when successive requests share one game generation.
- [ ] Implement ADR-004's canonical live-game outcome in `domain/game`: winner/reason only, one player-result derivation. Pin the current failed win/resignation expectations before changing production code. Migrate context, result recording/sounds and post-game review to the same snapshot; delete writable result notice and UI string parsing. Preserve provider-lifetime recording claims and existing result copy. Verify both colors, all supported draws, resignation, reset/undo, analysis preservation, and StrictMode/remount recording.

**Acceptance:** the context is a React snapshot/command adapter; no UI selection, review, engine, or bot request state is in game domain; only explicit session commands mutate live chess facts.

**Checks:** `npm test -- src/contexts/ChessGameContext.test.jsx src/contexts/ChessGameContext.integration.test.jsx src/components/ChessGameBoard.integration.test.jsx src/components/chess/ChessBoardPanel.test.jsx src/domain/game/gameSession.test.ts src/domain/game/gameLifecycle.test.ts src/hooks/useBotMove.test.ts`; then `npm run typecheck`, `npm run lint`, and focused Play E2E.

---

## Task 3 — Separate Stockfish adapter, fallback policy, and request lifecycle

**Files:** `src/services/stockfishService.ts`, `src/services/fallbackChessEngine.js`, `src/services/botService.ts`, `src/hooks/useBotMove.ts`, `src/hooks/useEngineAnalysis.js`, analysis callers, and engine service/worker tests.

- [x] Assign single ownership for Worker creation/disposal, UCI parsing, queueing, timeout settlement, cancellation, and crash cooldown; the Stockfish service owns the worker request lifecycle.
- [x] Return an explicit result for success, abort, timeout, worker failure, and no legal move. Each request settles once; worker identity and request IDs prevent old callbacks from resolving newer requests.
- [x] Keep fallback results source-tagged at the Stockfish service boundary; callers can distinguish fallback from Stockfish.
- [x] Thread `AbortSignal` through live analysis, annotations, manual/panel hints, and bot requests; cancel on request replacement, position/game change, and unmount; ignore stale completion.
- [x] Add deterministic worker tests for queueing, timeout recovery, cancellation/disposal, old-worker callbacks, fallback source, and recovery; focused worker/lifecycle, panel, board, and bot tests pass.

**Acceptance:** one owner per worker/request lifecycle; all requests settle once; stale results cannot overwrite UI or commit a bot move; fallback never masquerades as Stockfish.

**Checks:** focused lifecycle/contract, panel, board hint, and bot suites pass; `npm run typecheck` and `npm run lint` pass. Full unit suite and Play E2E golden path remain final Task 10 gates.

---

## Task 4 — Make profile persistence and cloud sync conflict-safe

**Files:** `src/services/userProfileService.js`, `src/services/syncService.js`, `src/services/cloudProfileService.js`, `src/services/persistenceContract.ts`, `src/components/SyncStatusBadge.jsx`, Training/profile callers, `supabase/schema.sql` and forward migrations, and profile/sync tests.

- [ ] Inventory profile fields, migration versions, writers/readers, evidence IDs, local revisions, cloud columns, and deployed schema requirements before changing storage format.
- [x] Distinguish “cloud row absent” from “cloud read failed”; `.maybeSingle()` returns absent as `null`, while read errors propagate and login sync does not upload local data.
- [x] Define revision/base-revision and conflict policy in ADR-002: stable evidence IDs and completion sets are merge candidates, derived recommendations recompute, non-mergeable state must surface conflict, and timestamps never choose a whole profile. The current implementation conservatively surfaces conflict for concurrent dirty snapshots; automatic field-aware merge remains open.
- [x] Remove the `userProfileService` ↔ `syncService` import cycle. Profile writes have no sync side effect; explicit Training/sync actions own cloud requests.
- [ ] Extract only proven pure transformations from profile IO. Keep schema migration in persistence; keep recommendations deterministic/pure; keep evidence dedupe in the progress write path.
- [x] Add a sync status subscription consumed by `SyncStatusBadge`; the badge now reacts to state changes and maps the lowercase status values correctly.
- [x] Add cloud compare-and-swap using `cloud_revision`; failed reads and stale writes do not overwrite snapshots. Existing local `sync.v1` metadata migrates to `sync.v2` without inventing a base. No stored fields or evidence are deleted.
- [x] Detect all current user-progress families when no shared base exists, including legacy exercise/opening statistics and persisted evidence; generated recommendations/plans alone do not create a conflict. Conflict tests preserve the original local snapshot and assert neither local nor cloud writes occur.
- [x] Preserve local changes made while an upload waits. Reread current persistence at acknowledgement, acknowledge only the uploaded revision, keep newer revisions dirty, and preserve replacement profile identities. Real-persistence regressions cover cloud-read/save waits, resets, failures, and a subsequent dirty upload.

**Progress:** import cycle, cloud absence/error distinction, reactive status, additive cloud revision migration, optimistic compare-and-swap, conservative legacy-progress conflict detection, and in-flight upload acknowledgement safety are implemented. The upload fix reproduced five real-persistence data-loss cases before all nine new tests passed. On 2026-10-15, 54 focused sync/persistence/cloud/UI tests and the full 777-test suite passed. Automatic safe-field merges, cross-tab/overlapping-request concurrency, lifecycle integration, and deployed migration verification remain open.

**Acceptance:** no circular imports; no silent whole-profile overwrite; cloud absence differs from cloud error; local-only/offline/cloud-only progress survives; repeat sync is idempotent; UI reacts to status changes.

**Checks:** `npm test -- src/test/persistenceContract.test.ts src/test/syncService.test.js src/test/cloudProfileService.test.js src/test/userProfileService.test.js src/components/SyncStatusBadge.test.jsx`; create `src/test/userProfileService.test.js` and `src/components/SyncStatusBadge.test.jsx` if absent; then relevant route E2E.

---

## Task 5 — Narrow authentication to one adapter/use-case flow

**Files:** `src/contexts/AuthContext.jsx`, `src/services/authService.js`, `src/pages/Login.jsx`, `src/pages/Signup.jsx`, `src/components/ui/Navbar.tsx`, Training guards/callers, `src/test/authService.test.js`, and new AuthContext/page contract tests.

- [x] Trace auth initialization, Supabase config, signup/login/logout, form validation, redirects, and guest callers. `refreshUser` had no callers and is removed.
- [ ] Choose one form validation owner (page/application action) and one Supabase auth adapter; remove overlapping APIs only after caller scan.
- [x] Context now exposes user/session/loading, Supabase configuration needed by auth pages, and auth actions; views derive `isAuthenticated` from `user`.
- [x] Preserve guest paths when Supabase is unconfigured; prevent a late initial `getSession()` from overwriting a newer auth event; Login redirect runs in an effect.
- [ ] Expand tests for configured/unconfigured, login/signup/logout, session-change, failure, redirect, and guest-flow contracts. Initial-versus-auth-event race plus existing auth service tests pass (5 focused tests).

**Progress:** context boundary/race correction and unused refresh API removal are implemented. Auth service duplication and configured/unconfigured page tests remain open.

**Acceptance:** one UI → auth action → adapter path; no profile/business logic in AuthContext; guest paths work in configured and unconfigured environments.

**Checks:** `npm test -- src/test/authService.test.js src/contexts/AuthContext.test.jsx src/pages/Login.test.jsx src/pages/Signup.test.jsx`; create the named context/page tests if absent; then protected-route and guest E2E, `npm run lint`, and `npm run typecheck`.

---

## Task 6 — Secure and consolidate AI Coach

**Files:** new `shared/coachContract.js` with a matching declaration for TypeScript consumers, `src/types/ChessTypes.ts`, `src/services/coachService.ts`, `src/services/mockCoachService.ts`, `src/components/AICoachPanel.tsx`, `src/components/review/AnalysisCoach.tsx`, `api/coach.js`, `api/coachHandler.js`, `api/utils/buildCoachPrompt.js`, `api/prompts/coachSystemPrompt.js`, `server/routes/coach.js`, `server/services/aiCoachService.js`, `server/prompts/coachPrompt.js`, `src/test/coach.test.ts`, `src/test/coachBenchmark.test.ts`, and `server/routes/coach.test.js`.

- [x] Trace client payload/provider inputs and establish `CoachRequestV1`: bounded question, optional validated FEN, level, and response style. History/PGN/engine fact IDs/profile/RAG are excluded.
- [x] Add shared runtime validation for schema, fields, FEN, body/question bounds, with unsupported fields rejected.
- [x] Establish guest/abuse policy, per-process rate limit, provider timeout/token cap, and safe errors. Production-wide durable limiting still needs deployment verification.
- [x] Remove `VITE_CLAUDE_API_KEY`; the server reads only `CLAUDE_API_KEY`. Bundle scan remains.
- [x] Route Vercel and local Express through one validator and business handler.
- [x] Ground provider requests only in validated FEN/question/level and disclose source/evidence used.
- [ ] Retire obsolete mock/prompt/adapter implementations after static/dynamic/build/test scans.
- [x] Add contract, unsupported-context, malformed FEN, size, rate-limit, failure, and source/evidence tests; add transport E2E and final bundle scan.

**Progress:** shared contract, one handler, two thin transports, server-only key, streaming 8 KiB request cap, per-instance limit, timeout, truthful basic fallback, response-evidence guard, bundle scan, and 289 focused tests are implemented. Durable production rate limiting and transport E2E remain open.

**Acceptance:** one shared request/response contract and one business implementation; server-only secrets; bounded/validated requests; identical local/production semantics; no Coach claim exceeds validated evidence; failures are visible and truthful.

**Checks:** `npm test -- src/test/coach.test.ts src/test/coachBenchmark.test.ts server/routes/coach.test.js`; add `api/coach.test.js` for the Vercel transport contract; inspect generated `dist/` for provider key names/values; run local endpoint E2E with provider mocked; lint/typecheck/build.

---

## Task 7 — Converge database and retire unused multiplayer/RAG safely

**Files:** `supabase/schema.sql`, all files in `supabase/migrations/`, `src/services/embeddingService.js`, `src/services/vectorSearchService.js`, `scripts/generateChessKB.js`, `scripts/seedChessKB.js`, `src/services/cloudProfileService.js`, deployment documentation, and SQL/schema tests.

- [ ] Create a table inventory with owner, purpose, writer, reader, retention, RLS, source migration, deployed row count, and disposition. Include `online_games`, profile/progress tables, coach messages, openings/reviews, `chess_knowledge`, and `chat_embeddings`.
- [ ] Verify whether the online-games retirement migration is applied in every deployed environment; export/archive any retained online rows before considering table/publication removal. Source migration presence is not deployment proof.
- [x] ADR-001 excludes RAG from v1. Source scans found no production caller; runtime services, tests and seeding/generation scripts are removed. No RAG-specific package dependency existed.
- [x] Remove vector schema from fresh bootstrap and add a forward migration that revokes client access/RPC execution and denies RLS while preserving deployed rows.
- [ ] Inventory and export/count deployed embeddings and knowledge rows; drop vector objects and extension only after retention disposition and verification that no other feature uses the extension.
- [ ] Establish canonical ordered migrations for active schema. Treat `schema.sql` as a generated/verified snapshot only if the repo's deployment workflow uses it; otherwise document its exact role. Do not rewrite history or assume snapshot equals production.
- [ ] Add role/policy matrix tests for anonymous, authenticated owner, non-owner, and server role for every active table. Remove broad public policies; keep server-role secrets out of browser code.
- [ ] Verify fresh database migration and deployed upgrade converge without dropping unrelated or user data.

**Acceptance:** every table has documented ownership/RLS/retention; fresh/deployed schemas converge; online/RAG data disposition is explicit; no migration silently deletes data; no dead feature remains reachable.

**External gate:** if deployed Supabase access/data export is unavailable, stop only destructive cleanup, record exact migration status/data questions, and continue independent local work. Do not mark P0-03/P1-06/P1-07 complete until deployment evidence is recorded.

**Checks:** migration lint/apply on disposable Supabase/local DB; policy matrix; migration upgrade from current schema; source/import/build scan.

---

## Task 8 — Establish feature boundaries and reconcile UI system

**Files:** affected Play/review/exercises/openings/training/auth/coach pages and components; `src/ui/*`; `src/styles/theme-charcoal-pine.css`; `DESIGN.md`, `REDESIGN_PLAN.md`, `UI_OPTION_C_REPORT.md`, current design docs, and applicable HeroUI usage tests.

- [ ] Move one cohesive capability at a time only after its use-case boundary is stable. Prefer feature-local files; do not mass-move global folders.
- [ ] Make pages/containers orchestrate use cases and make presentational components render props/emit intents; remove direct persistence/Supabase calls from UI where the completed repositories/use cases now provide a boundary.
- [ ] Pick the existing charcoal/pine/copper token source and HeroUI v3 rules in AGENTS.md as the current authority. Mark/archive conflicting historical visual docs; do not redesign screens in this task.
- [ ] Audit HeroUI dependency and `src/ui` wrappers. Remove only proven unused wrappers/dependencies; preserve chess-specific board, notation, evaluation, and drag interactions as documented exceptions.
- [ ] Fix interactive elements to HeroUI v3 primitives or documented chess exceptions; verify keyboard/accessibility and reduced-motion behavior without introducing a second design system.

**Acceptance:** feature ownership is discoverable; no circular feature imports; design tokens have one authority; generic interactive elements follow AGENTS.md; visual behavior is preserved apart from correctness/retired features.

**Checks:** lint/typecheck/build, route E2E, keyboard/accessibility checks, reduced-motion review, 360px/390px overflow.

---

## Task 9 — Remove dead code and artifacts with evidence

**Files:** candidate modules identified in `REFACTOR_BACKLOG.md`, `artifacts/`, `ui-lab/`, `.superpowers/`, historical root docs, generated corpus/debug files, `package.json` and lockfile only when dependency scans prove safe.

- [ ] For every candidate, record static import, dynamic import, route, test, build, script/CI, SQL, and deployment references before deletion.
- [ ] Sort candidates into production, current source-of-truth documentation, historical/release evidence, generated reproducible output, and experiment. Obtain retention/disposition before removing unique production evidence or deployed data.
- [ ] Archive only useful historical documents under `docs/archive/` with a clear historical label; delete duplicate/temporary files only when reproducible or unnecessary evidence is established.
- [ ] Remove duplicate review implementations and disabled Coach/RAG modules only after the canonical replacements pass their contract suites.
- [ ] Remove dependencies/scripts only after searching all source, scripts, workflows, and build configuration; update lockfile with the package manager.

**Acceptance:** no dead runtime route/service or duplicate business implementation; current docs have a short source-of-truth list; generated artifacts are reproducible or explicitly retained; no unverified evidence/data is lost.

**Checks:** reference scans, `npm ci`, `npm run test:e2e -- --list`, focused tests, build, Git diff review.

---

## Task 10 — Final regression and ship-readiness audit

**Files:** tests and docs only where a specific gap is found; `docs/audit/BASELINE.md` remains immutable historical evidence and a new dated final verification report records final results.

- [x] Repair the known baseline E2E selector failures by updating tests to current semantic UI contracts, not by restoring removed online/mode UI. Preserve tests that expose genuine behavior failures. Full rerun passed after fixing current selectors and preventing bot search from starting in the lobby.
- [ ] Verify the golden paths: guest bot game as White/Black, explicit promotion, undo/reset, hint/review, lessons, exercise completion, opening practice, local progress, configured auth/sync, Coach enabled/disabled/failure.
- [x] Run verification: `npm ci` (earlier in this execution), `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e -- --list`, `npm run test:e2e`. Results and command limitations are recorded in `docs/audit/BASELINE.md`.
- [x] Record current run warnings, browser-console status, and E2E results in `docs/audit/BASELINE.md`. Non-failing HeroUI Pressable and visible-label warnings remain open for evidence-led diagnosis; no deployed Supabase/network state was available.
- [x] Verify 360px and 390px layouts have no horizontal overflow; the full E2E run also passed keyboard navigation, Escape/focus restoration, touch target, and reduced-motion checks.
- [ ] Run final source-of-truth scans: no local/online multiplayer source path; no second evaluation convention; no profile/sync cycle; one Coach contract/business service; no client provider secret; no RAG path in v1; all active tables have owner/RLS docs.
- [ ] Review final diff against pre-existing user changes; preserve the dirty checkout and never use blanket staging or discard unrelated edits.

**Acceptance:** all required unit/build/E2E gates pass; deployed DB gates have evidence or remain explicitly open; every final-definition-of-done item maps to source/test/docs evidence; no unrelated pre-existing edits are discarded.

---

## Subagent execution protocol

- Use the subagent-driven-development skill for implementation: one fresh implementer per task, followed by a spec-compliance reviewer and then a code-quality reviewer. The implementer fixes review findings and the same reviewer rechecks them.
- Keep implementation sequential in this shared worktree to avoid overlapping edits. Use parallel subagents for read-only scans/reviews (engine consumers, database inventory, Coach security, auth callers) when scopes are disjoint.
- Before every implementation task, the orchestrator gives the agent the full task text, current acceptance criteria, exact owned files, current `git status`, and the instruction to preserve all edits by others.
- Do not begin a task if its contract is unclear. Resolve it from ADR-001/current source, or ask the user only for unavailable product/data decisions. Never ask for permission to perform reversible repository audit/refactor work already authorized by the master brief.

## Coverage and deferred scope

- Master brief P0–P12 are represented in Tasks 0–10; Task 7/9 handle migration and repository cleanup with explicit data safeguards.
- UI redesign is not part of this completion plan. Only reconcile tokens and preserve the approved visual language; a redesign requires its own scope and plan.
- Supabase production changes cannot be verified by local source/tests alone. Report them as open until actual deployed policy/schema/data evidence exists.
- No new abstraction is required by folder name. Create repositories, ports, or use-case modules only when the task proves a real boundary and names the current caller/implementation being separated.
