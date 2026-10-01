# P3-T03 Independent Verification

Verdict: **PASS / VERIFIED**  
Date: 2026-09-06  
Baseline: `main` at `7ecc6a6`; no implementation/test edits, commit, or push

## Acceptance result

| Requirement | Fresh independent evidence | Result |
| --- | --- | --- |
| Versioned provenance-backed attempt | `puzzleAttempt.v1` requires non-empty attempt/puzzle/source identities and the exact `puzzleId = lichess-${sourcePuzzleId}` relationship. Production resolved `lichess-00008` to source puzzle `00008` and visible `https://lichess.org/training/00008`. | PASS |
| One attempt through the full flow | Production retained one native UUID attempt ID across wrong, retry, two intermediate correct moves, and the final solved move. | PASS |
| Canonical events | All five production events had unique native UUID event IDs, canonical millisecond UTC timestamps, valid lowercase UCI moves (or null only for retry), correct solved flags, nondecreasing time, and final solved status. | PASS |
| Exact-event idempotency | Replaying the exact final event left serialized bytes and revision unchanged and retained one attempt with five events. Conflicting reuse of that event ID was rejected without mutation. | PASS |
| Malformed/conflicting safety | The corrected shared validator rejects inverted attempt ranges, decreasing event time, multiple solved events, a non-final solved event, duplicate event IDs, invalid provenance/UCI/timestamp/type/solved combinations, attempt identity conflicts, conflicting event payloads, and events after solve. Service rejections preserved stored bytes. | PASS |
| Legacy migration | A legacy `puzzleAttempt.v1` without `events` normalized to an empty event array without losing its attempt identity or provenance. | PASS |
| Production wrong → retry → solve | Chromium submitted legal wrong `e6f6`, retried, then completed `e6e7 / b2b1 / b3c1 / b1c1 / h6c1`. Persisted user events were `e6f6`, retry, `e6e7`, `b3c1`, `h6c1`; automatic opponent replies were correctly not recorded as user attempts. Exact profile bytes survived reload; console/page/network errors were 0/0/0. | PASS |
| Clean deployment | A candidate assembled from exactly `git ls-files --cached --others --exclude-standard` contained 1,051 files, omitted ignored `src/data/generated/generatedPuzzles.json`, and passed TypeScript plus production build (4,064 modules, 34 PWA entries). The retained production browser evidence came from this candidate. | PASS |

## Independent defect and correction history

The first verifier adversarial run found four malformed persisted states accepted by `assertPersistenceState`: a solved event followed by another event, decreasing event timestamps, multiple solved events, and an empty legacy attempt with `createdAt > updatedAt`. The executor reproduced all four RED, fixed the shared validator, and added regressions. The corrected independent probe rejects all four (`malformedAccepted=[]`), and the focused suite increased from 16 to 20 passing tests.

The first probe command itself also failed early because its expected error regex was narrower than the actual `sync.updatedAt` validation error; this was a verifier-harness assertion issue, not a product acceptance. After broadening only the temporary probe expectation, it exposed the four product defects above.

The first production browser run after the validator fix observed only the wrong event immediately after clicking retry, with no console/page/network error. The unchanged standalone harness was rerun twice on the same clean build; both subsequent runs produced the exact five-event chain and passed reload/error assertions. This intermittent first run is retained as timing history rather than hidden; the final two independent product runs passed.

## Fresh gates after correction

- P3-T03 focused suite: 5 files, 20/20 tests PASS.
- Independent adversarial persistence probe: canonical five-event flow/idempotency PASS; 7 service rejection cases and all 4 originally accepted malformed states now rejected.
- Full standalone suite: 44 files, 719/719 tests PASS in 39.73s.
- ESLint, TypeScript, workspace production build, and `git diff --check`: PASS.
- Workspace build: 4,105 modules and 45 PWA entries in 8.69s.
- Clean-candidate TypeScript/build: PASS; 4,064 modules and 34 PWA entries in 7.84s.
- Production Chromium: final two unchanged runs PASS; real `lichess-00008`, five-event attempt, byte-stable reload, errors 0/0/0.

Evidence is in `artifacts/tech-verification/PHASE_3/P3-T03/verifier/`. P3-T03 meets every roadmap criterion without a new dependency, provider/storage change, or Decision Gate.
