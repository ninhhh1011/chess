# P3-T07 Independent Verification

**Verdict: PASS**  
**Date:** 2026-09-06  
**Baseline:** `main` at `7ecc6a6`; Node `v24.15.0`; npm `11.12.1`

## Acceptance result

| Acceptance criterion | Independent evidence | Result |
|---|---|---|
| Canonical full state survives reads and browser boundaries | A populated `profile.v2` containing review/fact, puzzle attempt, skill, training-plan, and sync state kept identical bytes across three service reads. Production kept exact bytes across two reloads and a same-origin new tab. | PASS |
| Native IDs, revisions, and cross-entity traces persist | `profileId`, revision, `sync:<profileId>`, review-to-fact IDs, attempt/event IDs, skill evidence, and the current plan/history relationship remained intact. Sync revision equaled profile revision. | PASS |
| Migration occurs once | A real `profile.v1` snapshot migrated to `profile.v2` while retaining progress and timestamps. A second read preserved the same profile/plan IDs and exact migrated bytes. | PASS |
| Corrupt state fails closed and can be restored | Truncated JSON, unsupported schema, and malformed nested persistence returned a safe volatile profile while leaving the exact corrupt bytes untouched. Reinstalling the prior valid snapshot restored the complete trace byte-for-byte in unit and production browser flows. | PASS |
| Write/validation failure preserves durable data | An injected `QuotaExceededError` returned only a volatile mutation while the prior localStorage bytes remained readable. A malformed persistence mutation failed validation before writing and left the durable snapshot unchanged. | PASS |
| Reload is idempotent | Repeated reads/reloads added no duplicate plan IDs or event IDs; the current plan remained present exactly once in unique history. | PASS |
| Production real-puzzle recovery is clean | Chromium against the clean candidate solved real `lichess-00008` after wrong/retry, persisted five attempt events and two exact skill evidence IDs, verified reload/new-tab bytes, preserved truncated JSON, restored the valid snapshot, and rendered the recovered `crushing` training state. Console/page/network errors: `0/0/0`. | PASS |
| Quality and clean deployment | Focused: 3 files/21 tests. Independent adversarial: 1/4. Full standalone including verifiers: 50/744. Lint, typecheck, workspace build, and diff check passed. A 1,133-file clean candidate omitted ignored `generatedPuzzles.json`, retained `public/corpus/current.json`, passed typecheck/build (4,064 modules; 34 PWA entries), emitted `dist/corpus/current.json`, and supplied the production browser build. | PASS |

## Verification history

The first verifier browser run issued the first correct drag before the Retry reset animation settled and observed a four-event partial trace. This was a verifier-harness timing defect already identified in the preceding workflow, not a product assertion failure. The verifier-only harness was changed to wait for the persisted retry event and reset settle; no product file changed. The corrected fresh run passed.

## Evidence

- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/commands.json`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/acceptance.json`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/adversarial.test.ts`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/clean-candidate.json`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/initial-browser-failure.json`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/production-browser.mjs`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/production.json`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/restored-progress.png`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_3/P3-T07/verifier/network-errors.json`

No implementation defect was found. No source, product test, task-report, roadmap, commit, or remote state was changed by this verifier.
