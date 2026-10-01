# P1-T06 Independent Verification

**Verdict:** PASS  
**Date:** 2026-09-06  
**Verifier scope:** read-only review of production source/tests plus independently generated evidence under `artifacts/tech-verification/PHASE_1/P1-T06/verifier/`. No production source or test was edited.

## Fresh gates

| Gate | Result |
|---|---|
| Targeted contract/analyzer/Coach/learning/UI tests | PASS — 5 files, 81 tests |
| Full unit suite | PASS — 33 files, 587 tests |
| ESLint | PASS — 0 errors, 0 warnings |
| TypeScript | PASS — `tsc --noEmit` |
| Production build | PASS — Vite 8, 4103 modules transformed |
| Diff hygiene | PASS — `git diff --check` exit 0; line-ending notices only |
| Production self-play | PASS — 14 plies, real Stockfish WASM |

Exact commands and exit codes are recorded in `artifacts/tech-verification/PHASE_1/P1-T06/verifier/commands.json`.

## Acceptance evidence

| Requirement | Independent evidence | Result |
|---|---|---|
| One canonical fact schema | Source search found only `analysis.v1`/`AnalysisFactV1`; evidence identity is derived without a schema change as `${gameId}:ply:${ply}`. | PASS |
| One fact per analyzed ply | Contract/analyzer tests verify contiguous unique plies. Production pass 1 searched the exact 15-position chain for a 14-ply game once and pass 2 searched three selected positions. | PASS |
| Required valid evidence | Runtime validator checks FENs, SAN/UCI/resulting FEN, evaluations, Stockfish source, timestamps, nonempty candidates, best-move membership, and PV anchoring. The targeted suite rejects inconsistent played moves, missing/duplicate plies, and wrong schema versions. | PASS |
| Review consumer | Production rendered selectable IDs `review-1788633256755:ply:5`, `:ply:13`, and `:ply:14`, all with `stockfish_wasm`, legal played/best UCI moves, and best moves matching a real worker search for the fact's `fenBefore`. | PASS |
| Learning consumer | The fresh contract test exercised the real `recordAnalysisFacts` adapter: canonical tags were persisted and invalid facts rejected. The production sample emitted only `unclassified`; the stored profile remained empty, proving `unclassified` did not leak. | PASS |
| Coach consumer | Fresh contract/Coach tests show Coach rejects invalid facts and carries the same evidence ID and pre-move FEN into focused context. | PASS |
| Review selection/navigation | After ending the game and entering review mode, selecting ply 13 changed the navigator to `13 / 14`. | PASS |
| Stale-info-PV normalization | The selected ply-13 deep search emitted changing PV heads (`d2d3`, `b1c3`, `a5a6`, `d2d4`, `f2f3`) and finalized with `bestmove d2d4`; the rendered fact used `d2d4`. The analyzer regression test independently supplied a stale PV head and verified normalization to `[bestMove]`. | PASS |
| Browser integrity | Console errors: 0; page errors: 0; failed/HTTP-error requests: 0. | PASS |

## Production run

- URL: `http://127.0.0.1:4195` from the fresh production build.
- Moves: `a3 d5 Nh3 Bxh3 g3 Bxf1 a4 Bh3 Rf1 Qc8 a5 Bg4 e3 Nf6`.
- Worker: `/stockfish-worker.js?v=2026-05-30-simplified`.
- Pass 1: 15/15 ordered positions for the initial position plus every resulting position.
- Pass 2: 3 real candidate searches.
- Selected evidence: `review-1788633256755:ply:13`; played `e2e3`; final deep best `d2d4`; navigation `13 / 14`.
- Evidence: `production.json`, `selected-fact.png`, `browser-console.json`, `page-errors.json`, and `network-errors.json` in the verifier artifact directory.

## Findings

No blocking findings for P1-T06. The production sample's facts were all legitimately tagged `unclassified`; canonical-tag persistence is therefore evidenced at the validated adapter boundary, while production proves the exclusion rule.
