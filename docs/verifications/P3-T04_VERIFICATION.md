# P3-T04 Independent Verification

**Verdict: PASS**  
**Date:** 2026-09-06  
**Baseline:** `main` at `7ecc6a6`; Node `v24.15.0`; npm `11.12.1`

## Acceptance result

| Acceptance criterion | Independent evidence | Result |
|---|---|---|
| Review mistakes update `skillState.v1` from exact trusted facts | A two-tag mistake created two `skillState.v1` records at score `-1`; both reference only `verify-game:ply:1`, which uniquely resolves to the persisted matching-tag `AnalysisFact`. Replaying the exact review preserved profile bytes and revision. | PASS |
| Puzzle scoring is deterministic and exactly once | For all four real corpus tags, wrong produced `-1`; retry and intermediate correct left score/evidence unchanged; final solved added `+1`, yielding score `0` with exactly the wrong and solved event IDs. Replaying the final event preserved bytes and revision. | PASS |
| Skill trace is complete and unambiguous | Every stored skill evidence ID resolved exactly once to a persisted fact or attempt event whose source tags included the same `skillId`. | PASS |
| Malformed/conflicting state is rejected without mutation | Independent probes rejected dangling, duplicate, mismatched-tag, cross-attempt, and cross-kind evidence; non-finite score; empty/duplicate tags; noncanonical and inverted timestamps. Every service-bound rejection preserved the prior raw local-storage bytes. | PASS |
| Legacy compatibility | A legacy `puzzleAttempt.v1` with omitted `events` and `skillTags` normalized to empty arrays without losing its native IDs or timestamps. | PASS |
| Production real-puzzle trace and reload | Chromium against the clean candidate production build opened `lichess-00008`, recorded the wrong move and completed the real solution, created four corpus-tag skill records with the exact wrong/final evidence IDs, and preserved exact profile bytes after reload. Console/page/network errors: `0/0/0`. | PASS |
| Quality and clean deployment | Focused: 4 files/26 tests. Independent adversarial: 1/4. Full standalone including verifier: 45/725. Lint, typecheck, workspace build, and diff check passed. A 1,070-file clean candidate omitted ignored `generatedPuzzles.json`, retained `public/corpus/current.json`, passed typecheck/build (4,064 modules; 34 PWA entries), emitted `dist/corpus/current.json`, and supplied the browser build. | PASS |

## Evidence

- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/commands.json`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/acceptance.json`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/adversarial.test.ts`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/clean-candidate.json`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/production-browser.mjs`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/production.json`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/skill-state-trace.png`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_3/P3-T04/verifier/network-errors.json`

No implementation defect was found. No source, product test, task-report, roadmap, commit, or remote state was changed by this verifier.
