# Current system map

Snapshot: current source and worktree inspected 2026-10-15. This map includes game/session, engine, sync, auth, Coach and RAG retirement slices; runtime baseline counts in `docs/audit/BASELINE.md` describe the historical pre-refactor commit.

## Repository classification

The counts below cover exactly the discovery roots used for [FILE_CLASSIFICATION.csv](FILE_CLASSIFICATION.csv): `src api server supabase e2e scripts .github docs artifacts ui-lab .superpowers`. They total 1,207 paths. Root-level files and `public/` are outside these roots and are not included. Classification is by file role; tests and fixtures embedded under `src/` remain tests/data, not production modules.

| Area | Files | Classification and role |
| --- | ---: | --- |
| `src/` | 204 | Production app, data, domain, UI, and tests. `src/test/`, `*.test.*`, and `*.integration.test.*` are tests; `src/assets/` and `src/data/` are bundled assets/data; remaining files are production source. |
| `api/` | 3 | Vercel Coach transport/test plus the single Coach business handler. |
| `server/` | 4 | Local Express transport/test and environment templates; it calls the shared API handler. |
| `supabase/` | 6 | Legacy bootstrap snapshot and five ordered migrations, including online/RAG access retirement, online privilege hardening, and profile sync revision. |
| `e2e/` | 4 | Playwright acceptance tests. |
| `scripts/` | 13 | Corpus import/release/validation and browser evidence tooling; `*.test.*` are script tests, the rest are operational tooling. |
| `.github/` | 1 | CI infrastructure (`workflows/ci.yml`). |
| `docs/` | 118 | Documentation: current runtime/index/security/corpus references, plans/specs, reports, and manual test material. Dated task reports and verifier reports are historical evidence, not runtime truth. |
| `artifacts/` | 775 | Generated verification inputs/outputs: JSON reports, logs, screenshots, browser scripts, and temporary corpus work products. They are not imported by the application. |
| `ui-lab/` | 69 | Isolated visual experiment with its own Vite app, prototype components, fixtures, screenshots, and smoke test; not production UI. |
| `.superpowers/` | 10 | Design experiment HTML plus transient launcher PID/log state; not production code. |

The disjoint discovery-root counts above sum to 1,207. Hidden files ignored by ripgrep are excluded consistently from the table and CSV.

The complete 1,207-path file-by-file classification is in [FILE_CLASSIFICATION.csv](FILE_CLASSIFICATION.csv). It assigns each current discovered file one category and role; no unknown category was needed. Counts include the current plan and docs. The executable baseline was measured from the clean `dd9a4aa` worktree before the refactor slices.

**Other classifications:** Coach mock/prompt wrappers and RAG client services/tests/seeding tools were removed after reference scans. `src/data/corpusPuzzles.ts` remains unimported and is a cleanup candidate. Online and vector database objects remain retained behind forward client-access retirement migrations until deployed row inventories and retention decisions exist. `docs/CODEX_TECH_EXECUTION_PLAN.md` and historical task/verifier reports are not current architecture instructions. Generated `artifacts/**/work/**` contents are temporary evidence.

## Module and dependency map

```text
src/main.jsx
  -> src/App.jsx
     -> React Router lazy pages (Home, Play, Learn, Exercises,
        Openings, OpeningDetail, Training, Login, Signup)
     -> AuthProvider + ChessGameProvider + Layout/ErrorBoundary

Play page -> ChessGameBoard -> ChessGameContext -> gameSessionReducer -> chess.js
                         -> analysis/review, bot and engine UI state (remaining context responsibilities)
                         -> useBotMove -> botService -> stockfishService
                                              -> public Stockfish worker/WASM
                         -> useEngineAnalysis -> stockfishService
                         -> gameAnalyzer -> stockfishService -> AnalysisFactV1
                         -> userProfileService (game/review progress)

Learning pages -> page/components -> userProfileService
                                -> recommendationService/trainingRules
                                -> localStorage
Exercises -> corpusLoader -> /corpus/current.json -> versioned static chunks

Training -> userProfileService + recommendationService
         -> syncService -> cloudProfileService -> supabaseClient -> Supabase

Login/Signup/Navbar -> AuthContext (session/actions) <- authService wrappers
                    -> supabaseClient -> Supabase Auth

AICoachPanel/AnalysisCoach -> coachService -> POST /api/coach
    production: Vercel api/coach.js -> api/coachHandler.js -> Anthropic
    local: Express server/index.js -> server/routes/coach.js
         -> same api/coachHandler.js -> Anthropic
```

The profile/sync import cycle is removed: profile writes are local-only and explicit sync flows call profile and cloud services. React Context still exposes broad live-game, review, settings, and presentation state, while the game-session reducer owns only core position/lifecycle/promotion state.

## Runtime and state ownership after the Phase 2 slice

| State/fact | Current owner | Notes |
| --- | --- | --- |
| Live chess position, moves, turn, player side, lifecycle | `gameSessionReducer` (`src/domain/game/gameSession.ts`) | One state object owns live `Chess`, player color, and phase. `ChessGameContext` dispatches start/move/undo/lifecycle actions and publishes the snapshot. Analysis position remains separate review state. |
| Game replacement identity | `gameSessionReducer.generation` | `RESET_POSITION` increments once per replacement; ordinary moves, undo, and lifecycle/color actions preserve it. Play orientation, bot request identity, and board remount use the same `gameGeneration` snapshot. |
| Completed-game side-effect deduplication | `ChessGameContext` private claim ref, invoked by `ChessGameBoard` | `${gameGeneration}:${currentPgn}` is claimed synchronously before effects and survives a board route remount; reset and undo to a non-terminal position clear it. |
| Engine evaluation | `stockfishService` adapter with `src/domain/engine/evaluation.ts` conversion | `AnalysisResult` requires `perspective: 'white'`; the single Stockfish score conversion occurs at the service boundary. Fallback results carry `source: 'fallback'`. Broader consumer, worker, and cancellation audit remains open. |
| Bot settings | `ChessGameProvider` | The LOCAL/BOT mode selector and mode field are removed; all live games are bot games. Difficulty remains as context configuration; unused goal/time-control settings were removed from the contract. |
| Selection and legal-move highlight styles | `GameLayout` | These UI-only values are local to the play layout and passed to the board/keyboard consumers; CSS styles no longer cross the game context contract. |
| Orientation and last-move highlight | Play route and board | `Play` owns orientation/flip state and passes it to board/player/controls; last-move squares are derived from the current game history. Neither presentation value lives in `ChessGameContext`. |
| Pending promotion transaction | `gameSessionReducer` | The session stores `{from,to,color}`; `attemptMove` requests it, `choosePromotion` commits q/r/b/n, and cancel/reset/undo/resign clear it. |
| Bot request and worker lifecycle | `useBotMove`, `botService`, `stockfishService` | Hook cancels requests and ignores stale results; service serializes a shared worker and also has fallback-related behavior. |
| Review and live evaluation | `ChessGameBoard`, analysis hooks/services | Review facts are validated as `analysis.v1`; review/UI consume canonical White POV. Broader consumer, worker-output, and cancellation audit remains open. |
| User profile/training progress | `userProfileService` | Local storage schema/migration, mutations, recommendations, and evidence remain in one service. Profile writes no longer trigger network sync. |
| Sync status | `syncService` observable store | Status changes notify subscribers. Cloud reads distinguish missing rows from errors; cloud writes use a cloud revision compare-and-swap. Upload acknowledgements preserve newer local contents and acknowledge only the uploaded revision; a reset identity cannot be resurrected. Concurrent dirty snapshots, including legacy stats/evidence without a base, surface a conflict; field-aware evidence merge remains unimplemented. |
| Auth session | `AuthContext` | Owns user/session/loading, Supabase configuration used by pages, and auth actions. A late initial session cannot overwrite a newer auth event; unused refresh API was removed. |
| Coach request and source display | shared Coach contract, `coachService`, Coach UI, API handler | Client and both transports use a bounded question/FEN/level/style contract. Server validates FEN, applies size/rate limits, uses a server-only secret, and passes validated position context to the provider. Basic fallback is source-labeled and evidence metadata is displayed. |

## API and storage boundaries

- Browser routes are same-origin. Exercises load the verified corpus from checked-in static assets under `public/corpus`. Production Coach requests use `POST /api/coach`; local development can proxy to Express when `VITE_USE_LOCAL_COACH=true`. Both transports share one validator and handler.
- Browser → Supabase is direct for auth and optional cloud profiles. Multiplayer route/service/CTA were removed. Forward migrations revoke `PUBLIC`/client grants and remove every `online_games` RLS policy, leaving RLS enabled with default deny; the table, rows, and realtime publication remain pending deployed-data inventory and migration verification.
- Local profile/training state is browser `localStorage`, accessed by `userProfileService`; sync is an explicit flow. Cloud revision migration is checked in, but deployed application remains unverified.
- `supabase/schema.sql` is a legacy bootstrap snapshot for profiles/progress/events/openings/reviews/Coach messages; vector objects were removed from the fresh snapshot. Forward migrations retire online and RAG client access while preserving rows. Their deployed status remains unverified. See `DATABASE_OWNERSHIP.md` for table-by-table ownership and evidence.
- Coach reads `CLAUDE_API_KEY` only in the server handler. Vercel reads request streams with an 8 KiB cap; the in-memory 10-requests/minute per-IP limiter is per process, so durable production rate limiting remains a deployment requirement.

## AI Coach flow

`AICoachPanel` calls `askCoach` with bounded question, optional FEN, player level, and response style. History, PGN, client Stockfish claims, profile snapshots, and RAG are excluded. In production the client calls `/api/coach`; in local mode it does so only when opted in, otherwise it returns deterministic basic text locally. Both Vercel and Express use the shared validator and handler. The handler validates FEN and supplies it with question/level to Anthropic; it never claims Stockfish or retrieval evidence. Provider/network failure produces a source-labeled basic response. `AICoachPanel` discloses whether current-position context was used.

Duplicate mock/prompt/wrapper Coach files and dormant vector/embedding client services, tests, and seeding scripts were removed after repository-wide source scans. `knowledgeSource` remains `'none'`; legacy deployed vector objects are retained behind `20261007010000_retire_rag_client_access.sql` until migration application and data retention are verified. See `DATABASE_OWNERSHIP.md` for table/policy ownership and deployment gates.

The separate exercise corpus is configured, unlike Coach RAG: `public/corpus/current.json` points to run `474266a1953635fef5a03406a2dcd5831cc891085104d19e39c8f2470a40e75f`; its manifest declares 20,000 Lichess CC0 records across 20 chunks. The current `dist/corpus` contains those delivery assets and `corpusLoader.ts` fetches, checksums, and validates them. This source/build evidence does not establish a fresh successful browser load; loader failure falls back to the five bundled exercises.

## Stockfish flow

The board and analysis paths request bot moves or analysis through `botService.ts` / `stockfishService.ts`. The Stockfish service owns UCI parsing, one worker lifecycle, queueing/timeout, and fallback policy; `toWhitePerspective` converts scores once at the service boundary, and `AnalysisResult` requires `perspective: 'white'`. Bot service checks legal UCI moves and can produce heuristic/random fallback moves with distinct source strings. `useBotMove` carries an `AbortSignal`, request generation, timeout, and stale-response check. Live annotation and post-game review share the same CPL/classification functions. Focused worker output, fallback-source, cancellation, and evaluation tests pass; moving fallback selection out of the engine service remains architectural work. `analysis.v1` facts document White POV and validate legal FEN/moves plus engine evidence.

## Authentication and synchronization flow

`Login`/`Signup` call `authService` wrappers with auth actions from `useAuth`; `AuthContext` initializes Supabase session and listens to auth changes. It protects newer auth events from a late initial session result. Guest/local functionality remains available when Supabase is not configured. Auth callers derive authentication from `user`. Profile writes update local storage only. Training actions explicitly upload/download through `syncService` and `cloudProfileService`; login sync remains an available coordinator path but is not automatically wired. Cloud writes compare `cloud_revision`; simultaneous dirty snapshots expose conflict instead of using timestamps. The SyncStatusBadge subscribes to status. Local migration and additive SQL migration are checked in; deployed schema/data state is not verified here.

## Product/docs drift

- `REDESIGN_PLAN.md` defines a Vietnamese single-player learning product and explicitly excludes both online and local multiplayer. It proposes bot, Stockfish, lessons/exercises/openings, deterministic progress, optional cloud sync/auth, and Coach disabled by default until protected/grounded.
- The online route, page, client service, home CTA, and local two-player mode were removed in the Phase 2 slice. The historical table-creation migration stays in history; the new forward migration retires client access while preserving existing rows until data retention is decided.
- Root `DESIGN.md` is a Supabase-inspired light design spec, while `UI_OPTION_C_REPORT.md`, `src/styles/theme-charcoal-pine.css`, the user-supplied AGENTS rules, and current UI wrappers describe charcoal/pine/copper + HeroUI v3. These are not one design source of truth.
- `docs/CURRENT_RUNTIME.md` and README include historical verification counts; a current full regression run is recorded in `docs/audit/BASELINE.md`. The current source/build contain the 20,000-record corpus delivery, while successful runtime fetch remains unverified in this task.
