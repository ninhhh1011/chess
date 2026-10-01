# Current Runtime Source Map

**Snapshot:** 2026-09-06  
**Overall status:** technical stabilization in progress; no whole-product readiness claim

This file is the canonical documentation index for the current runtime. It must yield to observed runtime behavior, current source, fresh tests, and current contracts. Dated phase/final reports are historical snapshots and do not override current evidence.

## Verified baseline

| Area | Current evidence |
| --- | --- |
| P0-T01 bot concurrency | Verified locally and by an independent agent; real Stockfish happy path completed six plies |
| P0-T02 corpus truthfulness | Verified locally and by an independent agent; external corpus is unavailable and the UI discloses that state |
| P0-T03 E2E discovery | Verified locally and by an independent agent; npm discovers the same 68 tests in 4 files as direct Playwright |
| P0-T04 CI parity | Verified locally and by an independent agent on Node 22; 563 unit/integration tests in 31 files and 68 E2E tests in 4 files pass |
| P0-T05 documentation | Verified locally and by an independent agent after correcting evidence precedence |
| P0-T06 Coach truthfulness | Verified locally and by an independent agent; 569 unit/integration tests pass and real provider failure degrades to explicitly non-AI basic output |
| P0-T07 exercise/training contracts | Verified locally and by an independent agent after correcting false-promotion validation; 572 tests pass and the real browser loop persists a solved exercise |
| Phase 0 gate | Independently VERIFIED: current tree and clean candidate pass lint, typecheck, 572 tests, build, and 68/68 E2E; production browser replay covers White 20-ply click+hint, Black 21-ply drag+undo, lifecycle isolation, real `stockfish_wasm`, and zero browser/runtime errors |
| P1-T01 Stockfish lifecycle | Independently VERIFIED: cold-init and active-analysis disposal settle promptly, terminate only the old worker, and re-init remains ready beyond the stale-timeout horizon; 8/8 Stockfish E2E and two 10-ply production games use real `stockfish_wasm` |
| P1-T02 bot difficulty | Independently VERIFIED: displayed Elo/depth/movetime/skill values increase strictly; production UI sends Skill 0/3/6 then valid UCI_Elo 1600, resets correctly in reverse, and never emits Elo outside Stockfish's advertised 1320–3190 range |
| P1-T03 cancellation isolation | Independently VERIFIED: new-game and timeout cancellation terminate the active worker, stale searches cannot return a move or clear a newer timer, and real-WASM replacement requests produce exactly one legal bot move for White and Black flows |
| P1-T04 PGN replay | Independently VERIFIED: parser delegates legal replay to chess.js, preserves mainline comments and SetUp/FEN, ignores RAV/NAG syntax correctly, rejects malformed PGN explicitly, and reproduces stable FENs for the exact 47/94 Lichess source and its named first-40/80 benchmark prefix; production clipboard PGN replay matched 10-ply SAN/FEN exactly |
| P1-T05 two-pass review | Independently VERIFIED: pass 1 evaluates the initial plus every played position once, pass 2 deep-analyzes deterministic pre-move candidates, and the production review route renders those facts; real-WASM production evidence covered 14 plies, 15/15 ordered shallow positions, three deep candidates/facts, navigation, and zero errors |
| P1-T06 AnalysisFact contract | Independently VERIFIED: `analysis.v1` facts are runtime-validated, use stable `${gameId}:ply:${ply}` evidence identity, and carry legal FEN/move/evaluation/candidate/Stockfish evidence into review, learning, and Coach; 587 tests pass and production selection navigated to the exact fact with zero browser errors |
| P1-T07 orientation/CPL | Independently VERIFIED: mover orientation comes from pre-move FEN, signed mate scores are ordered, CPL is non-negative, thresholds remain unchanged, every candidate PV is legally replayed, and two-color production review labels matched real Stockfish WASM evidence with 45/45 legal latest PVs |
| P1-T08 exact benchmark | Independently VERIFIED: exact `rklpc7mk` first-40/80 prefix yields 80 ordered facts and 83/83 real-WASM searches per cold/warm run; fresh median 42,764 ms and max 42,997 ms with zero fallback/error/timeout. The old 5,365 ms jsdom/no-Worker fallback result is not a comparable engine baseline |
| Later tasks/phases | Not yet verified by the current execution plan |

The repository is not declared production-ready. The live provider, cloud, online-play, offline/PWA, security, corpus provenance, and later-phase product-loop claims remain unverified until their assigned tasks run.

## Active production paths

| Capability | Canonical path | Truthful current state |
| --- | --- | --- |
| App entry and routes | `src/main.jsx` → `src/App.jsx` | BrowserRouter routes to home, learn, play, online play, exercises, training, openings, login, and signup |
| Local/bot play | `src/pages/Play.jsx` → `src/components/ChessGameBoard.jsx` → `src/contexts/ChessGameContext.tsx` | Board state and UI are active |
| Bot move | `src/hooks/useBotMove.ts` → `src/services/botService.ts` → `src/services/stockfishService.ts` → `public/stockfish-worker.js` | Real Stockfish WASM lifecycle and AbortSignal cancellation are verified; new-game/timeout cancellation terminates the old worker and stale results cannot reach the board; heuristic/fallback code paths also exist and their user disclosure still needs verification |
| Board analysis | `src/components/analysis/EngineAnalysisPanel.jsx` and `src/hooks/useEngineAnalysis.js` → `src/services/stockfishService.ts` | Uses the same serialized worker service; fallback analysis exists |
| PGN replay | review/benchmark callers → `src/services/analysis/pgnParser.ts` → `chess.js` | Uses chess.js verbose mainline history as the single legality/parser implementation; the official 47/94 source and deliberate first-40/80 benchmark prefix are separate fixtures |
| Post-game analysis | `src/components/ChessGameBoard.jsx` → `src/services/analysis/gameAnalyzer.ts` → `src/services/stockfishService.ts` | Production review uses one two-pass service: N plies require N+1 ordered shallow positions, selected candidates are deep-analyzed from their pre-move FEN, and engine failures are explicit |
| Exercises | `src/pages/Exercises.jsx` → `src/services/exerciseValidator.js` → `src/data/exercises.js` | Five bundled exercises pass shared FEN/move/objective validation; invalid records are excluded |
| External corpus status | `src/pages/Exercises.jsx` → `src/services/corpusLoader.ts` → `src/services/corpusService.ts` | Independently audited: loader reports unavailable and zero external records; five bundled drills are local seeds, the dormant 28-record seed and ignored 40,000-row/23-position generator artifact are synthetic and absent from the production bundle. The roadmap-approved Lichess CC0 export is reachable but not yet imported or delivered |
| Training profile | `src/pages/Training.jsx` → `src/services/userProfileService.js` and `src/services/recommendationService.js` | Local `profile.v1` and `training.v1` persistence is active; legacy plans migrate and malformed plans regenerate |
| Optional cloud sync | `src/pages/Training.jsx` → `src/services/syncService.js` → `src/services/cloudProfileService.js` → `src/lib/supabaseClient.js` | Code path exists; real credentials and deployed behavior are not yet verified |
| Coach UI/client | `src/components/AICoachPanel.tsx` → `src/services/coachService.ts` → `POST /api/coach` | Uses strict `coach.v1`; disclosure follows the actual response and basic output explicitly says it does not use AI |
| Coach server | Vercel: `api/coach.js`; local server: `server/routes/coach.js`; both use `api/coachHandler.js` | Shared handler and provider-failure degradation are verified; live external-provider success is not yet verified |

## Dormant or non-production paths

- `src/services/mockCoachService.ts`: no production importer found.
- `src/services/embeddingService.js`: explicitly disabled; imported only by tests.
- `src/services/vectorSearchService.js`: imported only by tests in the current graph.
- `src/data/corpusPuzzles.ts`: legacy corpus fixture with no production importer; absent from the current build graph.
- `scripts/ingest-corpus.cjs`: development/import tooling, not part of `npm run build` and not evidence of a deployed real corpus.

## Evidence precedence

1. Observed runtime behavior and current production source/entry points.
2. Fresh runnable tests and current contracts.
3. The active execution roadmap.
4. Current task and independent verifier reports.
5. This documentation index, then older phase/final reports, which are historical only.

Counts are dated task evidence, not permanent guarantees. The latest full unit/integration count is 592 tests from P1-T07; re-run the commands in `README.md` after runtime changes.
