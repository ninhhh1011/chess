# Phase 2 Independent Gate Verification

**Verdict: PASS / VERIFIED**  
**Date:** 2026-09-06  
**Scope:** P2-T01 through P2-T08, fresh repository gates, 20,000-record import/validation/recovery, clean deployment, and full production phase self-play.

## Fresh repository and corpus gates

| Gate | Fresh result |
| --- | --- |
| P2-focused tests | PASS - 12 files, 117/117 tests |
| Full standalone suite | PASS - 42 files, 702/702 tests in 39.14s |
| Lint / typecheck | PASS / PASS |
| Workspace production build | PASS - 4,104 modules, 45 PWA entries |
| Clean-candidate typecheck/build | PASS - ignored generated corpus absent; 20k public and built corpus present |
| Official snapshot | PASS - 304,384,407 bytes; exact SHA-256 `a0ea9129...847f073` |
| Import/validator | PASS - 20,000 valid, 71,916 moves replayed, 0 invalid/illegal/quarantine/duplicate, 72 themes |
| Recovery/release | PASS - separate-process resume byte identity, no-op repeat, failed/corrupt safety, prior-run rollback |
| `git diff --check` | PASS - exit 0; conversion warnings only |

## Fresh hashed-production gate

The clean candidate ran at `http://127.0.0.1:4268` using hashed production assets.

- Exercises loaded active run `474266a1...e75f` with 20,000 real Lichess puzzles. Puzzle `00008` rejected legal wrong move `e6f6`, then accepted the complete five-ply solution. Lichess and CC0-1.0 links were visible; 22/22 corpus responses returned 200.
- Game A (White) completed 20 legal plies using board clicks and exercised Hint.
- Game B (Black) completed 21 legal plies using drag; Undo reduced move history from 3 to 1 before continuation.
- A pending bot search followed by New Game terminated its worker and discarded stale work.
- A 16-ply game resigned through the UI, produced a real `stockfish_wasm` review fact, navigated `9 / 16 -> 0 / 16 -> 1 / 16`, then New Game reset history.
- Worker telemetry recorded 168/168 completed legal bestmoves. A separate six-ply production smoke also replayed legally through `chess.js`.
- Console, page, and network error counts were 0/0/0.

## Phase acceptance

P2-T01 through P2-T07 already have separate independent verifier PASS reports. Fresh combined tests and production flows re-exercise their active boundaries: synthetic data remains outside production; `puzzle-record.v1` provenance is enforced; the importer streams the official source; the validator fails closed; checkpoint/restart and immutable release rollback work; and clean deployment uses the verified repo-native corpus without the ignored generated file.

P2-T08 closes the remaining scale criterion with 20,000 records and a full 100% replay. Historical failed candidates remain documented: rating 1400-1600 produced six duplicates/quarantines, and broad 0-4000 produced one. Only the exact `excludedThemes: ["zugzwang"]` candidate was promoted. The earlier source-pin defect found during P2-T07 verification was fixed by the executor and its adversarial rerun passed.

No unresolved Phase 2 defect, hidden synthetic fallback, checksum mismatch, browser regression, or Decision Gate remains. Evidence is in `artifacts/tech-verification/PHASE_2/P2-T08/verifier/`. No commit or push was performed.
