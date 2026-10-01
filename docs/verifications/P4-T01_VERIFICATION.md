# P4-T01 Independent Verification

Verdict: **PASS**

P4-T01 is independently VERIFIED for the canonical `coach.v1` transport contract. The browser sent one versioned request through the real production `/api/coach` route, both Edge and Express adapters returned the same canonical response shape, an unsupported schema was rejected, and the no-provider runtime disclosed its degraded `basic` source truthfully.

## Acceptance results

| Requirement | Result | Independent evidence |
| --- | --- | --- |
| One canonical client request | PASS | Production Chromium captured exactly one POST to `/api/coach` with `schemaVersion`, `question`, `fen`, `history`, `pgn`, `playerLevel`, and `responseStyle`; schema was exactly `coach.v1`. |
| One canonical response | PASS | Edge, Express, and browser responses used exactly `schemaVersion`, `reply`, `source`, `engineSource`, `knowledgeSource`, and `suggestedActions`; the response schema was `coach.v1`. |
| Source/error states constrained | PASS | Client validation admits only `llm | basic | unavailable`, `stockfish_wasm | fallback | none`, and `knowledgeSource: none`; focused tests reject an invalid legacy response and exercise provider-failure fallback. |
| Edge and Express adapters agree | PASS | Fresh direct probes returned HTTP 200 with identical key sets and `basic` source in the current no-key environment. |
| Invalid request schema rejected | PASS | Independent direct requests with unsupported schema versions returned HTTP 400 from both adapters. |
| Truthful degraded UI | PASS | Hashed-production UI visibly showed “Diễn giải cơ bản” and “Không dùng AI”; it did not show an AI Coach/provider claim. No provider was mocked and no live-LLM claim is made. |
| Runtime cleanliness | PASS | Browser console errors 0, page errors 0, failed network requests 0, and unexpected HTTP responses 0. |

The persisted evidence-ID resolution and live-provider success requirements are not overclaimed here; they remain assigned to later Phase 4 gates. Focused Coach grounding tests did independently cover trusted AnalysisFact-derived move, evaluation, classification, and engine-source behavior.

## Fresh gates

- Focused Coach suite: **1 file, 33/33 tests PASS**.
- Full standalone regression: **56 files, 760/760 tests PASS**.
- Lint, TypeScript, production build (**4,107 modules; 45 PWA entries**), and `git diff --check`: **PASS**.
- Direct canonical adapters: Edge **200**, Express **200**; unsupported schema: Edge **400**, Express **400**.
- Hashed-production Chromium: **1/1 request PASS**, canonical basic response, truthful disclosure, four runtime error buckets empty.

## Preserved verifier history

The first browser verifier run failed only because the owned harness expected a mojibake form of the Vietnamese question while the product correctly sent canonical Unicode `Nhận xét nhanh`. The failed JSON and screenshot are preserved as `initial-harness-failure.*`; after correcting only that verifier assertion, the full direct/browser run passed. This was not a product defect.

## Evidence

- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/contract.json`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/acceptance.json`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/commands.json`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/coach-basic.png`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/network-errors.json`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/unexpected-http.json`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/initial-harness-failure.json`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/initial-harness-failure.png`
- `artifacts/tech-verification/PHASE_4/P4-T01/verifier/verify.mjs`

No production source, product test, roadmap, task report, commit, or remote state was changed by this verifier.
