# P3-T08 Independent Verification

Verdict: **PASS**

P3-T08 is independently VERIFIED. The local adapter and failure semantics pass, and a fresh restored-provider run proved the real authenticated Supabase path without mocks: production Chromium signed in a disposable user, triggered two manual upload retries, and read back exactly one durable `user_progress` row with stable row identity and identical profile content.

## Acceptance results

| Requirement | Result | Independent evidence |
| --- | --- | --- |
| `user_progress` idempotent upsert on `user_id` | PASS | `supabase/schema.sql` declares `unique(user_id)` and `saveCloudProfile` uses `onConflict: 'user_id'`. Live retries returned HTTP 201 then 200 while row counts stayed `[1, 1]`. |
| Stable row and payload across exact retry | PASS | Both independent readbacks produced the same row-identity hash and the same profile-content hash. |
| No duplicate events | PASS | The disposable user's `training_events` count remained `[0, 0]` across both uploads. |
| Successful sync only after saved cloud row | PASS | Focused and adversarial tests prove null/error/throw results remain `error`; the live UI completed only after successful adapter responses. |
| Auth and production UI path | PASS | Production Chromium at `127.0.0.1:4175` authenticated the disposable user and exercised the real Training upload control twice. |
| Runtime cleanliness | PASS | Zero page errors, console errors, failed requests, and HTTP responses at or above 400. |
| Reversible live test | PASS | Exactly the created test user's row was deleted, readback confirmed zero remaining rows, the disposable account was deleted, and lookup confirmed it absent. |

## Fresh gates

- Focused P3-T08: **5 files, 13/13 tests PASS**.
- Independent adversarial: **2 files, 5/5 tests PASS**.
- Full standalone regression: **56 files, 759/759 tests PASS**.
- Lint, TypeScript, workspace production build (**4,105 modules**), and `git diff --check`: **PASS**.
- Clean candidate from `git ls-files --cached --others --exclude-standard`: **PASS**. It contained 1,163 source files, omitted ignored `generatedPuzzles`, included the public corpus, passed typecheck/build (**4,064 modules**), and emitted the dist corpus.
- Restored live Supabase: **PASS**; real login, two manual retries (`201`, `200`), exactly one stable row, unchanged profile hash, zero duplicate events, clean runtime, and verified cleanup.

## Historical blocker and corrected rerun

The initial independent live probe correctly failed because the configured project host returned DNS `ENOTFOUND`; production login likewise failed `ERR_NAME_NOT_RESOLVED`. After the project was restored, this verifier reran only the previously blocked live portion from a fresh disposable account. The restored run passed every live assertion, so the earlier Decision Required status is resolved rather than hidden.

## Evidence

- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/acceptance.json`
- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/commands.json`
- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/clean-candidate.json`
- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/live-restored.json`
- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/live-restored.png`
- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/live-restored.mjs`
- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/live-probe.json`
- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/production-login.json`
- `artifacts/tech-verification/PHASE_3/P3-T08/verifier/production-login.png`
- Independent adversarial sources: `cloud-adversarial.test.js`, `sync-adversarial.test.js`
