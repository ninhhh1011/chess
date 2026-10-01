# P3-T06 Independent Verification

**Verdict: PASS**  
**Date:** 2026-09-06  
**Baseline:** `main` at `7ecc6a6`; Node `v24.15.0`; npm `11.12.1`

## Acceptance result

| Acceptance criterion | Independent evidence | Result |
|---|---|---|
| Wrong, retry, and solution share one stable attempt | Production Chromium on real `lichess-00008` kept wrong `e6f6` off the board, restored the original FEN on retry, and persisted the exact ordered sequence `wrong, retry, correct, correct, correct(solved)` under one attempt with five unique event IDs. | PASS |
| Retry/intermediate moves are non-scoring and plan-stable | Independent service probes showed the wrong event changed score to `-1` and regenerated the plan; retry and both intermediate-correct events changed neither score/evidence nor plan ID; final solved restored score to `0` and regenerated the plan. | PASS |
| Solved boundary and replay are safe | Replaying the exact solved event preserved profile bytes and revision. A new event could not append to the solved attempt and left storage unchanged. Reset after solve emitted no persisted event; playing the solution afterward created a distinct attempt ID with three correct events. | PASS |
| Malformed identity, provenance, and sequencing fail closed | Independent adversarial probes rejected cross-puzzle/cross-source identity, conflicting tags/event payloads, decreasing event time, duplicate event IDs, source mismatch, and a non-final solved event without mutating stored bytes. | PASS |
| Next traverses distinct corpus puzzles | The independent component probe traversed every available real-shaped corpus entry once before wrap. Production Next moved from `lichess-00008` to distinct real corpus puzzles `lichess-0000D` and `lichess-0008Q`. | PASS |
| Reload and browser runtime remain clean | Production reload preserved the exact raw profile bytes. Console/page/network errors were `0/0/0`. | PASS |
| Quality and clean deployment | Focused: 3 files/10 tests. Independent adversarial: 2/5. Full standalone including verifiers: 48/737. Lint, typecheck, workspace build, and diff check passed. A 1,111-file clean candidate omitted ignored `generatedPuzzles.json`, retained `public/corpus/current.json`, passed typecheck/build (4,064 modules; 34 PWA entries), emitted `dist/corpus/current.json`, and supplied the production browser build. | PASS |

## Verification history

The first verifier browser run timed out on a mojibake localized-text locator after issuing the wrong move. This was a verifier-harness defect, not a product assertion failure. The verifier-only harness was changed to wait for the persisted wrong event and assert the unchanged FEN; no product file changed. The corrected fresh run passed.

## Evidence

- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/commands.json`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/acceptance.json`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/adversarial.test.ts`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/next-sequence.test.jsx`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/clean-candidate.json`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/initial-browser-failure.json`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/production-browser.mjs`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/production.json`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/next-real-puzzle.png`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_3/P3-T06/verifier/network-errors.json`

No implementation defect was found. No source, product test, task-report, roadmap, commit, or remote state was changed by this verifier.
