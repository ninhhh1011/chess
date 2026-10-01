# P4-T04 Independent Verification

**Verdict: VERIFIED**

The corrected candidate resolves the selected evidence ID through the current persisted `analysisFacts` collection and its owning `gameReviews.factIds` relationship before Coach receives move context. Independent adversarial, focused, full-suite, static, build, and hashed-production checks all pass.

## Historical failure and corrected rerun

The initial independent run was **REJECTED** because Coach accepted an in-memory `AnalysisFact` even when no matching persisted fact/review relationship existed. That original reproduction remains preserved in `failure.json`.

After the product fix, the verifier updated only its owned adversarial harness to the new `focusedEvidenceId` interface. One intermediate run exposed an obsolete harness expectation: it attempted to click Coach after the corrected component had already failed closed and omitted the button. The final adapted adversarial rerun passed all three cases: forged transient context is ignored, missing persistence fails closed, and removing the owning review after a valid resolution fails closed on the next request.

## Acceptance results

| Check | Result |
| --- | --- |
| Valid persisted fact resolution | PASS — selected evidence resolves through persisted `analysisFacts` and the owning review's `factIds`. |
| Missing/deleted persisted relationship | PASS — Coach is unavailable or fails closed after the owning review is removed. |
| Forged transient move context | PASS — forged played/best values cannot override the persisted fact. |
| Production game and engine | PASS — 12 legal plies; 42/42 native Worker searches completed with real Stockfish WASM. |
| UI-to-persistence trace | PASS — evidence `game:72f57513-9a1a-4f3a-9b9e-b4879d99f053:ply:9` belongs to review `review:43285353-3a01-46cb-a2db-cc979eeade48`; source is `stockfish_wasm`; played `a4a5`; best `b1a3`; best move is present in candidates. |
| Coach grounding | PASS — Coach returned `Nước gợi ý: Nxa3`, matching the persisted fact; forged DOM data was ignored. |
| Exact reload | PASS — canonical profile bytes were byte-identical after reload. |
| Live Supabase and cleanup | PASS — endpoint reachable; no pre-cleanup test row remained; disposable profile rows and auth account were deleted, with zero rows remaining. |
| Runtime errors | PASS — zero console, page, network, and unexpected HTTP errors. |

## Verification gates

- Final adversarial verifier: 1 file, 3/3 tests PASS (8.90s).
- Focused product plus adversarial coverage: 4 files, 59/59 tests PASS (37.78s).
- Full suite: 58 files, 765/765 tests PASS (62.29s).
- Lint, typecheck, production build, and `git diff --check`: PASS.
- Production build: Vite 8.0.10, 4,107 modules, 45 PWA entries, hashed assets.

## Evidence

- `artifacts/tech-verification/PHASE_4/P4-T04/verifier/failure.json` — preserved original blocking reproduction.
- `artifacts/tech-verification/PHASE_4/P4-T04/verifier/persisted-resolution.adversarial.test.jsx` — independent persisted-resolution and fail-closed cases.
- `artifacts/tech-verification/PHASE_4/P4-T04/verifier/production.mjs` — independent hashed-production browser harness.
- `artifacts/tech-verification/PHASE_4/P4-T04/verifier/production.json` — production trace, persistence, engine, cloud, cleanup, and error-bucket results.
- `artifacts/tech-verification/PHASE_4/P4-T04/verifier/production.png` — selected production evidence and Coach result.
- `artifacts/tech-verification/PHASE_4/P4-T04/verifier/commands.json` and `acceptance.json` — command ledger and acceptance summary.
- `browser-console.json`, `page-errors.json`, `network-errors.json`, and `unexpected-http.json` — empty runtime error buckets.

The verifier changed no production source, product tests, task report, roadmap, commit, or remote state.
