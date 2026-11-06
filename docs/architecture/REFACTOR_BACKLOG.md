# Refactor backlog

Ordered by correctness/security first, then boundaries. This is an audit backlog and progress ledger; product-scope removals follow accepted ADR-001. Tests listed are contracts for the implementation task; the baseline run is recorded separately in `docs/audit/BASELINE.md`.

## P0 Critical correctness/security

### P0-01 — Make promotion a single user-selected transaction

- **Status:** Implemented in the Phase 2 slice; click, drag, and keyboard share `attemptMove`; pending promotion lives in the game-session reducer; explicit choice commits q/r/b/n; cancel/reset/undo/resign invalidate it. Verified by context, domain, and board tests.

- **Historical problem (resolved):** legal promotions were auto-queened from click/drag paths before the UI choice.
- **Current evidence:** `ChessGameContext.attemptMove` returns `promotion_required` without committing; `gameSessionReducer` stores and clears `pendingPromotion`; explicit `choosePromotion` commits the selected q/r/b/n. The context and session tests cover explicit choice, cancellation, and reset invalidation.
- **Root cause (resolved):** move commitment previously accepted a default promotion before UI selection.
- **Target state:** both interaction paths attempt the same move; domain reports pending `{from,to,color}`; only explicit q/r/b/n selection commits.
- **Affected files/modules:** context/game actions, `ChessBoardPanel`, `PromotionModal`, play tests.
- **Dependencies:** game state ownership decision (P1-01); do not redesign board UI.
- **Implementation steps (completed):** route click, drag, and keyboard through `attemptMove`; commit/cancel without changing position on cancel.
- **Tests required:** promotion q/r/b/n; click and drag parity; cancel preserves FEN; non-promotion moves still commit.
- **Acceptance criteria:** no promotion path commits before selection; all legal promotion choices produce correct SAN/FEN.
- **Risk:** lifecycle transitions must continue to invalidate pending promotion.

### P0-02 — Enforce one evaluation perspective and truthful engine source

- **Status:** Core contract implemented and focused contracts pass. `AnalysisResult` requires `perspective: 'white'`; the Stockfish adapter converts centipawn and mate scores at the FEN boundary; live annotations and post-game review share mover CPL and classification; mate display preserves the winning side; `getBestMove` propagates cancellation. Full golden-path E2E and every deployment runtime remain to verify.

- **Problem:** consumers can interpret raw engine scores differently, affecting hints/review/CPL; fallback must remain distinct from Stockfish.
- **Evidence:** `src/domain/engine/evaluation.ts` performs the single sign conversion; `src/services/stockfishService.ts` returns results with required White perspective metadata; `src/services/analysis/gameAnalyzer.ts` and `src/components/chess/LiveEvaluationBar.jsx` consume White POV. Fallback results carry explicit `source: 'fallback'` and no evaluation.
- **Root cause:** perspective/source are not a single enforced engine result contract at the adapter boundary.
- **Target state:** every result/fact uses White POV and explicit source; positive means White advantage; one CPL/classification implementation consumes canonical values.
- **Affected files/modules:** Stockfish adapter/service, bot service, analysis hooks, game analyzer, evaluation/review consumers and types.
- **Dependencies:** none; preserve current bot and review behavior except confirmed correctness fixes.
- **Implementation steps (core complete):** traced score producers/consumers; pinned cp/mate conversion; return metadata at the engine boundary; removed consumer-side normalization; unified live/review CPL and classification; tested both movers and worker output. Continue E2E and deployed runtime verification.
- **Tests required:** white/black-to-move signs; positive/negative mate; both-color CPL/classification; fallback source; no component normalization.
- **Acceptance criteria:** one type-level contract, one conversion boundary, source is never labeled Stockfish for fallback.
- **Risk:** existing stored/review facts may encode a different perspective; keep schema migration/version strategy explicit.

### P0-03 — Close online-game data exposure

- **Status:** Client route and service removed; an additive forward migration now revokes `PUBLIC`, `anon`, and `authenticated` table privileges, removes every attached RLS policy, and leaves RLS enabled with default deny while preserving rows/table/publication. Deployment application/verification remains open because no deployed database inventory is available in this workspace.

- **Historical problem:** the original `online_games` migration enabled a public read policy, and multiplayer is excluded from v1.
- **Current source evidence:** the online route and service have been removed. `supabase/migrations/20261008010000_harden_retired_online_games.sql` revokes `PUBLIC`/`anon`/`authenticated` grants and drops policies catalog-wide, then keeps RLS enabled with no client policy. The table, rows, and publication are preserved. This is source migration evidence only; it does not prove that any deployed database applied the migration or currently has these policies.
- **Root cause:** the original spectator/link-sharing policy allowed unrestricted reads.
- **Target state:** retain the client removal and verify the forward migration/policy against each deployed project; decide table/publication disposition only after deployed data inventory.
- **Affected files/modules:** online-game migration/deployed Supabase policy, route/service, ADR-001.
- **Dependencies:** choose temporary containment before removal; deletion requires backup/retention and deployment check.
- **Implementation steps:** inspect deployed schema/data; apply and verify the forward-only deny-all migration; later remove table/publication only after data disposition is approved.
- **Tests required:** SQL/RLS tests or Supabase policy verification for anonymous, participant, and non-participant reads/writes.
- **Acceptance criteria:** deployed anonymous/authenticated clients cannot read or mutate rows; deployed policy matches the source migration. Remains open until deployment evidence exists.
- **Risk:** an unapplied local migration does not remediate an already deployed permissive policy.

### P0-04 — Secure and ground the Coach endpoint

- **Status:** Partial. Shared strict request validation, current FEN grounding, 8 KiB body/question limits, in-memory per-IP limiting, provider timeout/token cap, safe errors, server-only `CLAUDE_API_KEY`, explicit evidence metadata, and source disclosure are implemented. Durable production rate limiting and deployment verification remain open.
- **Problem:** optional guest Coach endpoint requires a strict request boundary and abuse controls; provider and board claims must reflect evidence actually used.
- **Evidence:** prior behavior accepted broad JSON, used a `VITE_*` secret alias, and ignored FEN in provider prompt. Current code lives in `shared/coachContract.js`, `api/coachHandler.js`, `api/coach.js`, and `server/routes/coach.js`; ADR-003 sets a stateless guest policy and current-FEN-only evidence contract.
- **Root cause:** transport, validation, and prompting grew independently of a truthful context contract and security boundary.
- **Target state:** server-only secret name; bounded validated request; guest access with abuse controls; provider timeout/token cap; server-safe errors; response says llm/basic and names evidence actually used.
- **Affected files/modules:** `api/`, `server/`, Coach client/panel, deployment env/config, tests.
- **Dependencies:** Coach is optional per ADR-001; supported fields and guest policy are set by ADR-003.
- **Implemented:** strict shared request validation; 8 KiB streaming body bound and 1,200-character question bound; validated current-FEN grounding; server-only `CLAUDE_API_KEY`; provider timeout/token cap; safe provider errors; explicit source/evidence metadata and labeled basic fallback. Local Express also has an in-memory per-IP limit.
- **Remaining:** configure and verify a durable Vercel rate limit before enabling the production endpoint; verify deployed secret/configuration and end-to-end behavior. The in-memory limiter is supplementary only and does not satisfy the production gate.
- **Tests required:** malformed schema/FEN, unsupported-field rejection, body/question limits, rate limiting, provider timeout/failure, safe error, truthful source/evidence assertions.
- **Acceptance criteria:** no secret in frontend config/bundle; provider failures are not labeled LLM; a board-specific claim requires validated evidence.
- **Risk:** local in-memory rate limiting is per instance. Confirm durable provider/platform rate limiting before production rollout; do not claim production abuse protection until that gate is verified.

### P0-05 — Prevent silent loss during profile synchronization

- **Status:** Partial. The profile-to-sync import cycle is removed, sync status is observable, cloud absence differs from read failure, and cloud writes use revision compare-and-swap. No-base progress detection includes legacy stats, training metadata, and persisted evidence so divergent snapshots surface a conflict. Field-aware evidence merge and deployed migration verification remain open.

- **2026-10-15 regression evidence:** upload acknowledgement now rereads local persistence, preserves progress/revision/timestamps written during cloud reads or saves, and never resurrects a reset profile. Only the uploaded revision is acknowledged; newer progress stays `local_only` and uploads on the next sync. `syncService.persistence.test.js` uses real localStorage/profile persistence with deferred cloud calls (9 cases); five data-loss regressions failed before the fix and all nine pass afterward. Failed/rejected saves also preserve newer local data. Explicit cloud adoption is unchanged.

- **Remaining problem:** safe field-aware merging requires shared-base data and field-level change detection; concurrent dirty profiles currently surface a conservative conflict.
- **Historical evidence (resolved in part):** sync previously chose whole snapshots by `updatedAt` and profile mutation triggered sync. Current implementation removes the import cycle, uses cloud revision compare-and-swap, and surfaces concurrent dirty snapshots as conflicts; field-aware merge and deployed migration verification remain open.
- **Historical root cause:** sync selected whole snapshots by timestamp and reused stale local snapshots after asynchronous cloud requests. Revision comparison, explicit sync ownership, and upload acknowledgement safety are now implemented; shared-base field merging remains open.
- **Target state:** versioned snapshots, explicit conflict detection, deterministic merging only for mergeable fields, and a user-visible resolution for conflicting non-mergeable data.
- **Affected files/modules:** profile service/schema, `syncService`, `cloudProfileService`, Training sync UI, persistence tests.
- **Dependencies:** P1-03 repository/service boundary; preserve existing local data shape through migration.
- **Implementation steps:** inventory profile fields and evidence identity; classify mergeability; add revisions/base revision; detect simultaneous updates; merge append-only evidence with dedupe; expose unresolved conflicts; migrate legacy timestamps safely.
- **Tests required:** local-only/cloud-only, offline local progress vs cloud changes, simultaneous divergent fields, repeated sync/idempotence, failed cloud request, evidence dedupe.
- **Acceptance criteria:** an older whole-profile timestamp can never silently discard independent progress; failed sync preserves local profile.
- **Risk:** deployed revision migration is unverified. Cross-tab writes and out-of-order acknowledgements from independent concurrent uploads need their own concurrency audit before a broader sync guarantee is claimed.

### P0-06 — Make completed-game results canonical

- **Status:** In progress under ADR-004.
- **Problem:** review, saved profile, statistics and end sounds can disagree about the same game.
- **Evidence:** `ChessGameBoard` compares `playerColor: 'w'|'b'` with `white`/`black`, making its win predicate false for every checkmate. `PostGameReview.getResultKind` computes the winner independently and parses Vietnamese notice text. `resignGame` changes lifecycle without a terminal chess.js position, so the recording effect skips resignation.
- **Root cause:** no session-owned outcome; UI and application side effects derive separate semantic results.
- **Target state:** one typed live outcome and one player-result derivation feed review, persistence and sound.
- **Affected files/modules:** `domain/game`, context, board orchestration, post-game review and contract tests.
- **Dependencies:** ADR-004; existing session generation and provider-lifetime recording claim.
- **Implementation steps:** reproduce player-win and resignation failures; define outcome in domain/session; migrate consumers; remove writable notice/string parsing; preserve deduplication and reset/analysis contracts.
- **Tests required:** both-color wins/losses, draws, resignation, reset/undo/analysis, persistence/UI/audio agreement and StrictMode/remount deduplication.
- **Acceptance criteria:** every completed live game has one result; player wins save a win; resignations save one loss; analysis never overwrites live outcome.
- **Risk:** historical result aggregates cannot be repaired reliably and remain unchanged.

### P0-07 — Keep game-stat defaults immutable

- **Status:** Confirmed source defect; implementation pending.
- **Problem:** recording a game from empty or invalid storage mutates the shared defaults, contaminating subsequent fresh statistics and reset values.
- **Evidence:** `useGameStats.loadStats` returns the module-level `defaultStats` object for absent/invalid storage; `recordGameResult` mutates the returned object. `resetStats` later copies those already-mutated defaults. `GameStats` is an active consumer through `BotSettings`.
- **Root cause:** persistence reads return the mutable default template by reference.
- **Target state:** every empty/error read gets independent zero-valued statistics; resets use untouched defaults.
- **Affected files/modules:** `src/hooks/useGameStats.js`, statistics contract tests, outcome-test setup.
- **Dependencies:** complete P0-06 first; do not merge the two production changes.
- **Implementation steps:** reproduce consecutive fresh-storage recordings/reset in one module lifetime; return a fresh default object at both fallback exits; remove the new outcome tests' explicit zero-storage workaround.
- **Tests required:** clear storage after a recorded game and record again; invalid JSON after a recorded game; explicit reset returns all counters to zero.
- **Acceptance criteria:** a fresh stats record starts at one game, never includes prior wins/losses, and reset returns zero.
- **Risk:** existing stored statistics may already contain inflated counts; do not infer a historical repair.

## P1 Architectural debt

### P1-01 — Extract game lifecycle and use cases from ChessGameContext

- **Status:** In progress. `src/domain/game/gameSession.ts` owns the live `Chess` position, player side, lifecycle, and pending promotion; `ChessGameContext` dispatches actions and exposes the snapshot. Board selection/highlight styles live in `GameLayout`; board orientation and flip commands now belong to the `Play` route and are passed to play UI consumers. Bot request thinking is owned by `useBotMove` and passed from `ChessGameBoard` through `GameLayout` to board, control, keyboard, and status consumers. Review state and bot ELO remain in the adapter and still need narrower owners. The LOCAL/BOT mode selector and mode field have been removed; live play is bot-only.

- **Problem:** context remains a broad play adapter with unrelated presentation/review/engine state despite the live chess session now being extracted.
- **Evidence:** `src/domain/game/gameSession.ts` owns the live session and replacement generation; `RESET_POSITION` increments `gameGeneration`, while moves/undo/lifecycle preserve it. `Play.jsx` owns board orientation; `GameLayout.jsx` owns selection/highlight styles; last-move display derives from game history. `useBotMove.ts` owns request thinking/cancellation, and `ChessGameBoard.jsx` threads its `isThinking` value to play UI consumers; context move guards use the player-turn invariant. `ChessGameContext.tsx` retains bot ELO and result presentation alongside review coordination. Completed-game recording uses a private provider-lifetime claim keyed by `${gameGeneration}:${currentPgn}`, so route-level board remounts cannot repeat side effects; reset and undo to a non-terminal position clear the claim.
- **Root cause:** context became the shared destination for every play feature without a separate owner model.
- **Target state:** game domain owns position/turn/legal move/status/promotion/player side/lifecycle; React adapter exposes snapshot + commands; board selection/evaluation/review/bot state stay in their own UI/application owners.
- **Affected files/modules:** context, `ChessGameBoard`, `ChessBoardPanel`, play hooks/components, game tests.
- **Dependencies:** ADR-001; P0-01 promotion flow; P0-02 evaluation boundary.
- **Implementation steps:** document state ownership; define lifecycle transitions; create focused use cases; migrate one command/caller at a time; remove legacy context fields after caller scan.
- **Tests required:** move/illegal/castling/en passant/promotion/check/mate/draw/undo/reset/resign; stale bot response; lifecycle transition contract.
- **Acceptance criteria:** no UI-only, engine, review, or bot request state in chess core; only explicit commands mutate game.
- **Risk:** broad current hook contract; incremental compatibility adapter may be needed while callers migrate.

### P1-02 — Remove multiplayer and local two-player paths

- **Status:** Client route, page, service, Home CTA, local mode selector, and mode-specific runtime branches removed after ADR-001 acceptance. Database rows are retained and access is disabled by a forward migration pending deployed-data disposition; verify migrations before dropping table/publication.

- **Historical problem:** online route/service and local two-player mode coexisted with bot play, and the online page expected absent context APIs.
- **Current evidence:** `src/App.jsx` routes `/play` but has no online route; `OnlinePlay.jsx` and `onlineGameService.js` are absent; client mode selection/branches are removed. The original database migration remains in history and the forward deny-all migration is not proof of deployed application.
- **Root cause:** product concepts changed without synchronized changes across route, context, persistence, and database.
- **Target state:** bot-only game route; no reachable online/local multiplayer behavior, route, mode branch, or stale database policy.
- **Affected files/modules:** router, Home, OnlinePlay, onlineGameService, Game Context/board/settings, SQL migrations/schema, E2E/unit tests, docs.
- **Dependencies:** ADR-001 acceptance; P0-03 policy containment and database retention plan.
- **Implementation steps:** route/client/mode removal and forward DB retirement migration are present; maintain reference scans and verify deployed policy/data before any table/publication deletion.
- **Tests required:** route not reachable, bot play both colors remains, no local selection or multiplayer imports, SQL migration/policy state.
- **Acceptance criteria:** online/local multiplayer absent end-to-end while guest/local persistence remains.
- **Risk:** deployments with existing online-game rows may require explicit archival/export before table removal.

### P1-03 — Split profile persistence, planning, progress recording, and sync

- **Problem:** `userProfileService` combines migration, localStorage, progress mutations, recommendations/evidence, revision, and sync trigger; sync imports it back.
- **Historical evidence (partly resolved):** profile and sync previously imported each other and status had no subscription. The cycle is removed and status is observable; profile mutation, migration, recommendations, and progress recording still share `userProfileService.js`.
- **Root cause:** storage was used as both domain service and synchronization coordinator.
- **Target state:** pure profile/training functions; one local repository; explicit progress recorder; sync use case outside repository; observable sync result.
- **Affected files/modules:** profile/sync/cloud services, Training, SyncStatusBadge, profile/sync tests.
- **Dependencies:** P0-05 conflict model; inspect existing `persistenceContract.ts` and profile migrations first.
- **Implementation steps:** map profile fields and writers/readers; extract pure transforms; route local writes through storage boundary; remove sync calls from persistence; make user action invoke sync; expose status through component subscription/state.
- **Tests required:** migration/persistence/revision/evidence dedupe; local-only/cloud-only/conflict/failure; UI observes status transitions.
- **Acceptance criteria:** no profile↔sync import cycle; storage never initiates cloud IO; status updates render without polling.
- **Risk:** many pages import profile mutation functions; preserve public call behavior during migration.

### P1-04 — Consolidate Coach contract and business implementation

- **Status:** Core consolidation implemented. Shared request/response types and runtime validation, one server handler, and thin Vercel/Express transports are in place. Obsolete mock/prompt/wrapper files were removed after repository-wide caller scans. Durable production rate limiting and deployment E2E remain open under P0-04.
- **Problem:** Coach previously had competing contracts, fallbacks, prompt builders, and transport business logic.
- **Historical evidence (resolved):** `src/services/mockCoachService.ts`, `api/utils/buildCoachPrompt.js`, `api/prompts/coachSystemPrompt.js`, `server/prompts/coachPrompt.js`, and `server/services/aiCoachService.js` had no source/runtime caller and were removed. `shared/coachContract.js` and `api/coachHandler.js` are canonical; both transports call them.
- **Root cause (resolved in source):** browser/server semantics grew independently without a shared contract or handler.
- **Target state:** one runtime-validated CoachRequestV1/CoachResponseV1; one server business service; Vercel production route and thin local Express transport; explicit basic fallback.
- **Affected files/modules:** Coach client/types/components, API/server transports/prompts, tests.
- **Dependencies:** P0-04 security/grounding; ADR-001 optional Coach decision.
- **Implemented:** shared runtime schema and handler, bounded Vercel/Express transports, and removal of unused duplicate implementations after caller scans. The client rejects response evidence that is absent from its request.
- **Remaining:** complete deployment E2E and verify durable Vercel rate limiting under P0-04; no additional contract/business consolidation is pending.
- **Tests required:** schema compatibility, bounded/unsupported fields, FEN context, truthful source/evidence, provider failure, both transport contracts.
- **Acceptance criteria:** one canonical contract and business handler; both transports preserve its semantics. Core source-level contract is implemented; deployment-wide limit/E2E evidence remains outstanding under P0-04.
- **Risk:** Vercel's per-process limiter is not durable across instances; deployment configuration must supply a shared rate limit before production enablement.

### P1-05 — Make Stockfish and fallback responsibilities explicit

- **Status:** Partial. Engine requests, cancellation, queue settlement, worker identity, timeout restart, explicit fallback source, White POV, shared move CPL/classification, and mate display are covered by deterministic contracts. The unused `useEngineAnalysis` hook was removed. `stockfishService` still owns fallback policy and UCI parsing, and full application-level fallback selection remains.
- **Problem:** one service owns worker/UCI/queue/timeout/cooldown/parsing and fallback semantics; cancellation exists across service and hooks.
- **Evidence:** `src/services/stockfishService.ts`, `src/services/botService.ts`, and `src/hooks/useBotMove.ts` still coordinate lifecycle/request/fallback behavior. `useEngineAnalysis.js` had no production caller and was removed.
- **Root cause:** engine adapter and application policy were combined over time.
- **Target state:** Stockfish adapter handles UCI/worker lifecycle; fallback is a separate move/analysis source; application use case decides when/if to fall back; request identity/cancellation is deterministic.
- **Affected files/modules:** stockfish/bot services, hooks, app unmount/dispose, tests and E2E.
- **Dependencies:** P0-02 result contract; P1-01 game use cases for stale-FEN commit protection.
- **Implementation steps:** request lifecycle/cancellation/worker identity are centralized and tested; remove unused hook; next separate worker adapter behavior from fallback policy at the application call sites without hiding result source.
- **Tests required:** White POV, mate, fallback source, cancel, timeout recovery, worker disposal/unmount, concurrent requests, stale FEN bot result.
- **Acceptance criteria:** one owner for each worker/request; all callers settle once; stale request cannot overwrite/commit.
- **Risk:** changing the singleton worker lifetime may affect app StrictMode and review throughput.

### P1-06 — Decide and remove dormant RAG subsystem

- **Status:** Runtime RAG code, dead tests, and seeding/generation tools removed after full source scans. RAG objects are removed from the fresh snapshot and a forward migration revokes client access while retaining data; applied state/data inventory is a deployment gate.
- **Problem:** unused vector objects were publicly queryable although no canonical Coach path retrieves them.
- **Evidence:** repository-wide scan found no active consumer; service/tests/scripts were deleted; `DATABASE_OWNERSHIP.md` records legacy objects and unknown deployed row counts; `20261007010000_retire_rag_client_access.sql` denies client access without deleting rows.
- **Root cause:** retrieval schema and public policies outlived the Coach feature path.
- **Target state:** no RAG in v1; no client/runtime retrieval; preserve deployed rows until export/retention disposition, then remove vector tables/function/extension by an explicit verified migration.
- **Affected files/modules:** embedding/vector services, schema/function, scripts, tests, package dependencies if uniquely used, Coach metadata/docs.
- **Dependencies:** ADR-001; P1-04 contract consolidation; inspect deployed DB and stored embeddings first.
- **Implementation steps:** keep client access disabled; verify migration, grants, RPC and row inventory in every project; export if required; drop objects/extension only after the retention decision.
- **Tests required:** Coach reports `knowledgeSource: 'none'`; source scan has no RAG imports; SQL migration applies with/without existing objects and leaves unrelated tables intact.
- **Acceptance criteria:** client/runtime retrieval is absent now; physical deployed objects are removed only after data disposition and migration evidence.
- **Risk:** checked-in SQL does not prove deployed schema; extension may be shared by other database features.

### P1-07 — Define database schema ownership and canonical migrations

- **Problem:** a broad schema snapshot mixes active profile tables, Coach messages, pgvector, and online games; migration history contains only online games.
- **Evidence:** `docs/architecture/DATABASE_OWNERSHIP.md` maps source tables and policies; `supabase/schema.sql` remains a legacy snapshot; the migration folder still lacks a complete canonical history for its user tables.
- **Root cause:** schema snapshot is not an auditable ordered change history and table ownership is undocumented.
- **Target state:** forward migrations are the source of truth; each table has owner, purpose, writers/readers, retention, and RLS policy documented.
- **Affected files/modules:** `supabase/schema.sql`, migrations, auth/profile/cloud services, deployment docs.
- **Dependencies:** ADR-001 and RAG decision; cloud sync and table data inventory.
- **Implementation steps:** inventory deployed and local schemas; map every table to current callers; document policies; baseline existing schema; add forward migrations to reach target; preserve data and verify RLS.
- **Tests required:** migration apply/rollback policy, RLS ownership matrix, client/server role checks, profile persistence contract.
- **Acceptance criteria:** fresh and deployed DBs converge; no unexplained table/policy; no destructive migration without data disposition.
- **Risk:** snapshot and deployed schema may have drifted; never assume source SQL is the deployed database.

### P1-08 — Narrow AuthContext to session/auth adapter

- **Status:** Partial. `refreshUser` had no caller and is removed; context now exposes user/session/loading, config required by pages, and auth actions. Screens derive authentication from `user`; the auth listener is registered before the initial session fetch, so a newer auth event cannot be missed or overwritten by initialization.
- **Problem:** operation APIs still couple form use cases to context methods, and configured/unconfigured route flows need fuller tests.
- **Evidence:** `src/contexts/AuthContext.jsx` is the Supabase adapter; `src/contexts/AuthContext.test.jsx` asserts listener registration precedes the initial fetch and that a late fetch cannot overwrite a newer event; `src/services/authService.js` performs input validation and returns UI messages; Login/Signup call the service with context actions.
- **Root cause:** validation/use case and provider adapter boundaries are undefined.
- **Target state:** one auth flow: form/application action → auth port → Supabase adapter; context exposes user/session/loading and auth actions only.
- **Affected files/modules:** AuthContext, authService, Login, Signup, Navbar, Training auth consumers, tests.
- **Dependencies:** none; keep guest mode and current auth behavior.
- **Implementation steps:** map every auth caller; choose whether form validation stays in page or a use case; remove duplicate config/auth surface; correct redirects and await/error handling in the same contract migration.
- **Tests required:** configured/unconfigured, login/signup/logout, session change, guest paths, failed request/redirect.
- **Acceptance criteria:** no duplicate auth API or React hook calls outside components; AuthContext contains no profile business rule.
- **Risk:** async session initialization may race protected navigation; verify with route-level tests.

## P2 Maintainability

### P2-01 — Establish feature ownership without mass-moving files

- **Problem:** global `pages/`, `components/`, `services/`, and `hooks/` are cross-feature buckets; page/container and presentational responsibilities overlap.
- **Evidence:** `ChessGameBoard.jsx` owns bot/review/live analysis and calls persistence; `OpeningDetail`, `Exercises`, and `Training` mix route orchestration with service logic; `components/review` and `components/chess` both contain review components.
- **Root cause:** file placement follows artifact type, not capability ownership.
- **Target state:** feature folders only when a completed use-case boundary makes a move useful; route/container orchestrates; presentational component renders props/emits events.
- **Affected files/modules:** play/review/exercises/openings/training/auth/coach pages, hooks/components/services.
- **Dependencies:** game, engine, profile, auth, and Coach boundaries (P1-01 through P1-08).
- **Implementation steps:** resolve duplicate/unique import graph; pick one feature at a time; move only cohesive modules; preserve public entry points until tests/build pass.
- **Tests required:** feature contract tests and existing golden-path E2E after each moved capability.
- **Acceptance criteria:** each feature's UI/use case/dependencies are discoverable; no circular feature imports; no mass move without behavior tests.
- **Risk:** path churn can obscure behavior changes and create merge conflicts.

### P2-02 — Audit dead code and duplicate artifacts before deletion

- **Problem:** disabled Coach/RAG, online/local paths, duplicate review components, old design reports, screenshots, and temporary outputs coexist.
- **Evidence:** `src/services/mockCoachService.ts`, embeddings/vector services, `src/components/chess/PostGameReview.jsx`, `src/components/review/PostGameReview.tsx`, `artifacts/` (772 files), `ui-lab/` (69 files), `.superpowers/` (10 files).
- **Root cause:** completed experiments and historical verification material remain alongside production source.
- **Target state:** production and current source-of-truth docs are clear; reproducible or legally/operationally useful evidence is retained in an appropriate archive; disposable outputs are removed/ignored.
- **Affected files/modules:** candidate modules above, `artifacts/`, `ui-lab/`, `.superpowers/`, old root docs.
- **Dependencies:** import/route/dynamic import/test/build scans and data retention; no delete based only on folder name.
- **Implementation steps:** classify each candidate; capture needed verification evidence; search route/import/build refs; archive useful historical docs; remove temporary/generated output from version control only with owner confirmation of retention needs.
- **Tests required:** import/build/route checks; corpus and review contracts after removal.
- **Acceptance criteria:** no shipped dead module or stale source-of-truth doc; retained evidence has purpose and owner.
- **Risk:** artifacts can contain unique release evidence not reproducible from current checkout.

## P3 UX/design cleanup

### P3-01 — Reconcile design documentation and tokens

- **Problem:** `DESIGN.md` describes Supabase-like light UI; redesign plan uses another light theme; UI Option C and repo AGENTS define charcoal/pine/copper with HeroUI v3; components still have hard-coded values.
- **Evidence:** `DESIGN.md`, `REDESIGN_PLAN.md`, `UI_OPTION_C_REPORT.md`, `src/styles/theme-charcoal-pine.css`, `src/ui/*`, `AGENTS.md`.
- **Root cause:** multiple design generations were not retired or reconciled.
- **Target state:** one approved token source, HeroUI v3 primitives/wrappers, no parallel design system; chess domain visuals remain custom.
- **Affected files/modules:** design docs, styles, `src/ui`, page styles.
- **Dependencies:** architecture stabilization and applicable AGENTS rules; visual redesign is a separate phase.
- **Implementation steps:** adopt token source; remove stale conflicting docs or archive them; audit direct HeroUI and `src/ui` usage; convert only after product visual approval.
- **Tests required:** lint/build, accessibility and 360/390px overflow checks, reduced-motion check, key route visual review.
- **Acceptance criteria:** one token authority; all interactive primitives use HeroUI v3 or documented chess exceptions; no redesign hidden in architecture work.
- **Risk:** broad visual changes can mask functional regressions and need separate review.
