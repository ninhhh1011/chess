# Phase 1 Independent Gate Verification

**Verdict: PASS**  
**Date:** 2026-09-06  
**Scope:** P1-T01 through P1-T08, fresh repository gates, exact 80-ply benchmark, and hashed-production phase self-play.

The current Phase 1 implementation satisfies its gate. I independently read the plan, all eight task reports and task-verifier reports, relevant engine/analyzer/review source, and parsed all 91 Phase 1 task JSON evidence files without error. I changed no production source, tests, dependency, or prior task evidence.

## Fresh repository gates

| Gate | Fresh result |
|---|---|
| `npm run lint` | PASS — 0 warnings/errors |
| `npm run typecheck` | PASS — `tsc --noEmit` |
| `npm run test` | PASS — 33 files, 592 tests |
| `npm run build` | PASS — Vite 8.0.10, 4,103 modules, hashed assets |
| `npx playwright test --list` | PASS — 72 tests in 4 files |
| skip/fixme source scan | PASS — zero markers |
| `npm run test:e2e` | PASS — 72/72 Chromium tests in 3.7 minutes |

## Exact `rklpc7mk` benchmark

Native Chromium loaded the live Vite module graph and instrumented the real Worker without mocks. The fixed first 40 full moves/80 plies replayed legally to `8/p3k1p1/2p3P1/1p2K2P/8/8/P7/2b5 w - - 0 41`.

| Run | Duration | Facts | Worker searches | Result |
|---|---:|---:|---:|---|
| Cold | 43,011 ms | 80 ordered | 83/83 complete and legal | PASS |
| Warm 1 | 42,810 ms | 80 ordered | 83/83 complete and legal | PASS |
| Warm 2 | 42,721 ms | 80 ordered | 83/83 complete and legal | PASS |

Median was **42,810 ms** and maximum was **43,011 ms**. Every fact reported `stockfish_wasm`; every search used `go movetime 500`; Worker bridge, Stockfish JavaScript and WASM returned HTTP 200; source violations, illegal moves, errors and timeouts were all zero.

The nominal change from 5,365 ms is +697.9%, but source inspection at historical commit `c5a33af` proves that number is not comparable: Vitest/jsdom supplied no Worker, Stockfish fell back, the analyzer and test hardcoded aggregate `stockfish_wasm` provenance, pass one did not forward the requested 500 ms move time, and the historical report recorded zero pass-two searches. The fresh workload performs 83 real 500 ms searches, a nominal engine-work floor of 41,500 ms, and remains below the historical 60-second per-run gate. This is a corrected real-engine baseline, not evidence of a like-for-like regression.

## Fresh hashed-production self-play

The fresh build ran at `http://127.0.0.1:4231` using `/assets/index-CozSBo6p.js`; no `/src/` development module loaded.

- Game A: White completed 20 legal plies using board clicks and exercised Hint.
- Game B: Black completed 21 legal plies using drag; Undo changed the history from 3 to 1 before normal continuation.
- Lifecycle: a pending expert-bot search was followed by New Game; its worker was terminated and no stale move entered the reset board.
- Resign/review: the reset game continued for 16 plies, resigned through the UI, and produced real review fact `review-1788638616911:ply:9`, White to move, 616 CPL, `blunder`, source `stockfish_wasm`.
- Review navigation moved `9 / 16 -> 0 / 16 -> 1 / 16`; the final New Game returned history to zero.
- Worker telemetry recorded 172/172 completed legal bestmoves. Console, page and network error counts were 0/0/0.

Screenshots were visually inspected and agree with the asserted White, Black orientation, review, navigation and reset states.

## Combined acceptance audit

P1-T01 through P1-T08 each have a task report and a separate task-verifier PASS. Their evidence covers worker lifecycle/source, monotonic engine constraints, cancellation/stale isolation, exact PGN replay, the two-pass analyzer, `analysis.v1`, mover/mate/CPL/PV correctness, and the final exact benchmark. The historical Phase 1 document is explicitly marked superseded, the official 47-move game is not confused with its fixed 40-move prefix, and no dependency/provider/model/storage/schema change is hidden in Phase 1.

No unresolved Phase 1 inconsistency was found. Corpus provenance, cloud learning, live Coach-provider and RAG requirements remain explicitly assigned to later phases and are not used to justify this verdict.

Evidence: `artifacts/tech-verification/PHASE_1/GATE/verifier/`.

No commit or push was performed.
