# PHASE_1_GATE Task Report

Phase: 1 — Engine, bot and post-game review  
Status: VERIFIED  
Baseline: `main` at `7ecc6a6`; no commit or push.

## Fresh repository gate

- Lint and typecheck: PASS with zero errors/warnings.
- Unit/integration: PASS, 33 files / 592 tests.
- Production build: PASS, 4,103 modules and hashed assets.
- Browser discovery: 72 tests / 4 files; zero skip/fixme markers.
- Full Chromium suite: PASS, 72/72.

## Exact real-WASM benchmark

The independent phase reviewer replayed the exact first 40 full moves / 80 plies of Lichess `rklpc7mk` in native Chromium. Cold/warm/warm durations were 43,011 / 42,810 / 42,721 ms (median 42,810; max 43,011). Every run returned 80 ordered facts and 83/83 legal real-worker searches using `go movetime 500`; Worker/JavaScript/WASM assets returned HTTP 200 and fallback/illegal/error/timeout counts were zero.

The nominal +697.9% change from 5,365 ms is not a like-for-like regression. Historical commit `c5a33af` ran in jsdom without a Worker, could fall back, hardcoded aggregate engine provenance, omitted the requested first-pass move time, and recorded no second pass. The fresh 83-search workload has a nominal 41,500 ms engine-work floor and is the corrected production baseline.

## Hashed-production phase gate

- White: 20 legal click plies and Hint.
- Black: 21 legal drag plies; Undo changed history 3 → 1 before continuation.
- Lifecycle: pending expert search → New Game terminated the worker and discarded the stale move.
- Resign/review: a reset 16-ply game produced a real `stockfish_wasm` fact at ply 9 with 616 CPL / blunder; navigation moved 9/16 → 0/16 → 1/16, then New Game reset history.
- Worker/runtime: 172/172 legal completed best moves; console/page/network errors 0/0/0.

## Independent acceptance audit

The phase reviewer audited P1-T01 through P1-T08, their separate verifier reports, relevant runtime source, and all Phase 1 JSON evidence. It found no unresolved inconsistency and no hidden dependency, provider, model, storage or schema change. Later corpus, cloud and Coach/RAG work was not used to justify the verdict.

Evidence: `docs/verifications/PHASE_1_VERIFICATION.md` and `artifacts/tech-verification/PHASE_1/GATE/verifier/`.

Verdict: VERIFIED
