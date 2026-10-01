# P3-T01 Independent Verification

Verdict: **PASS / VERIFIED**  
Date: 2026-09-06  
Baseline: `main` at `7ecc6a6`; no implementation/test edits, commit, or push

## Acceptance result

| Requirement | Fresh independent evidence | Result |
| --- | --- | --- |
| Versioned serializable entities | The runtime contract defines `profile.v2` with nested `learningPersistence.v1`, plus `gameReview.v1`, `analysis.v1`, `puzzleAttempt.v1`, `skillState.v1`, `training.v1`, and `sync.v1`. JSON round-trip and populated-contract tests passed. | PASS |
| Stable native IDs and timestamps | Fresh production state used browser-native UUID-backed profile and plan IDs, deterministic `sync:${profileId}`, and UTC ISO timestamps. Reads and reloads preserved IDs, timestamps, revision, and the exact serialized bytes. | PASS |
| Migration without progress loss | The v1-to-v2 migration preserved games played, puzzle totals, streak, rating, preferences, weaknesses, and historical timestamps; migration persisted once and remained byte/revision stable on later reads. | PASS |
| Invalid/unsupported-state safety | Unsupported and malformed stored profiles failed closed to an ephemeral default while leaving the original localStorage bytes untouched. Invalid nested IDs, timestamps, schemas, duplicates, references, and sync state were rejected. | PASS |
| Revision behavior | A mutation increments profile and sync revisions exactly once; reads do not increment them. Sync revision and profile revision remain aligned. | PASS |
| Sync normalization/conflict | Both local and cloud candidates are normalized and validated before conflict selection; newer valid state wins, and malformed candidates cannot destructively replace stored progress. | PASS |
| Production self-play/reload | A clean production Chromium profile completed six legal plies through a ready real Stockfish WASM worker. After reload/reopen, persisted profile bytes were exactly identical. Console/page/network errors were 0/0/0. | PASS |
| Clean deployment | A candidate assembled from exactly `git ls-files --cached --others --exclude-standard` contained 1,023 files, omitted ignored `src/data/generated/generatedPuzzles.json`, and passed TypeScript plus production build (4,064 modules, 34 PWA entries). The production browser run used this candidate. | PASS |

## Independent defect and correction history

The first adversarial boundary check found that `assertAnalysisFactV1` accepted the locale string `September 6, 2026` as `analyzedAt`. The executor added a regression and tightened the validator. The first correction was too strict: it rejected the valid UTC ISO form `2024-01-01T00:00:00Z`, causing 10 Coach grounding failures in the fresh full suite (700 passed, 10 failed). The final correction accepts equivalent UTC ISO forms with `.sssZ` or omitted `.000`, while rejecting locale strings, offsets, and non-equivalent inputs. The final direct boundary probe, focused suite, and standalone full suite all pass.

The implementation ledger also retains its initial browser-harness failure: storage was cleared on every navigation rather than once per browser session. The corrected harness then verified reload stability. During independent clean-candidate setup, one preliminary `New-Item -LiteralPath` invocation failed because that parameter is unsupported for `New-Item`; candidate assembly immediately continued with an explicit parent path and the final candidate was independently rebuilt and verified. Neither harness/configuration failure is hidden or counted as a product defect after correction.

## Fresh gates

- Persistence/AnalysisFact/learning/plan/Coach focus: 5 files, 90/90 tests PASS.
- Full standalone suite: 43 files, 710/710 tests PASS in 35.58s.
- ESLint, TypeScript, workspace production build, and `git diff --check`: PASS.
- Workspace build: 4,105 modules and 45 PWA entries.
- Clean-candidate TypeScript/build: PASS; 4,064 modules and 34 PWA entries.
- Production Chromium: 6 legal plies, `stockfish_wasm`, stable serialized bytes after reload, errors 0/0/0.

Evidence is in `artifacts/tech-verification/PHASE_3/P3-T01/verifier/`. P3-T01 meets every roadmap criterion without a schema/provider Decision Gate or destructive user-data overwrite.
