# P2-T08 Independent Verification

Verdict: **PASS / VERIFIED**  
Date: 2026-09-06  
Baseline: `main` at `7ecc6a6`; no implementation/test edits, commit, or push

## Acceptance result

| Requirement | Fresh independent evidence | Result |
| --- | --- | --- |
| Approved source is pinned | The 304,384,407-byte official snapshot hashes to `a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073`. Builder, delivery manifest, and runtime loader pin that SHA, dataset `2026-08-02`, official Lichess URL, and CC0-1.0 license. | PASS |
| Exact clean configuration | Only rating 0-4000, no positive theme filter, exact exclusion `zugzwang`, limit 20,000 passed. It parsed 20,217, filtered 217, and accepted 20,000. | PASS |
| Full validation | Independent validator replayed all 71,916 solution moves. Valid 20,000/20,000; illegal/invalid/quarantine/reason count/duplicates all zero; unique source IDs and normalized positions both 20,000. | PASS |
| Provenance and motif breadth | All records passed record checksum/source/license/version/URL validation. The report contains 72 themes, exceeding the required 12 meaningful motifs. | PASS |
| Reproducibility and resume | A separately spawned import was interrupted after 3,000 parsed records (exit 75), then resumed to 20,000. Resumed and clean accepted/quarantine bytes were identical and both content identities were `474266a1...e75f`. | PASS |
| Idempotency and rollback | In-place rerun was refused, repeated delivery was a no-op, active 20k delivery published atomically, and rollback restored prior verified run `c836c447...338`. Focused tests also prove failed validation cannot move the pointer and corrupt rollback targets are refused. | PASS |
| Clean deployment | A candidate assembled only from `git ls-files --cached --others --exclude-standard` omitted ignored `generatedPuzzles.json`, retained the public corpus, passed typecheck/build, and emitted the active 20k corpus into `dist` with all 20 chunk hashes matching. | PASS |
| Product puzzle flow | Production Chromium loaded real `lichess-00008`; the legal wrong move `e6f6` was rejected, then `e6e7 / b2b1 / b3c1 / b1c1 / h6c1` completed the puzzle. Lichess and CC0 links were visible and all 22 corpus responses were HTTP 200. | PASS |
| Runtime smoke | A separate `/play` run completed six legal plies through `chess.js` using a ready real Stockfish WASM worker. Console/page/network errors were 0/0/0. | PASS |

## Rejected configurations retained

The first local rating-1400-1600 candidate was not silently promoted: it accepted 20,000 but quarantined six normalized duplicates (`0B1GK`, `0gcW1`, `0p3J3`, `0uwi5`, `1Qrvw`, `1iARm`), and its validator failed the clean-manifest gate after replaying 74,364 moves. The later broad 0-4000 candidate was also rejected because it quarantined duplicate `0B1GK`. Excluding `zugzwang` removed that known duplicate class without weakening the validator; the exact promoted run has zero duplicate/quarantine records.

The earlier P2-T07 adversarial verifier initially found that arbitrary source-version/source-SHA values could cross the delivery boundary. The executor corrected the pins and record checks; the corrected rerun passed 7/7 focused delivery/UI/source-pin tests. This failure and rerun history is retained rather than overwritten.

## Fresh gates

- P2 importer/validator/release/delivery/contract/UI focus: 12 files, 117/117 tests PASS.
- Full standalone suite: 42 files, 702/702 tests PASS in 39.14s.
- ESLint, TypeScript, workspace build, and `git diff --check`: PASS.
- Clean-candidate typecheck/build: PASS; active 20,000-puzzle corpus and 20 verified chunks present in `dist`.
- Production Chromium corpus flow and six-ply Stockfish WASM: PASS with zero console/page/network errors.

Evidence is in `artifacts/tech-verification/PHASE_2/P2-T08/verifier/`. P2-T08 meets every roadmap criterion without a new dependency, provider, license, storage system, or Decision Gate.
