# P2-T01 Independent Verification

**Verdict: PASS**  
**Decision Gate: not required**  
**Scope:** corpus-origin audit only; this does not claim that Phase 2 has a production external corpus.

## Findings

- Production external corpus count is **0**. `src/services/corpusLoader.ts` exposes `available: false`, `puzzleCount: 0`, resets the in-memory corpus, and imports neither generated JSON nor a seed dataset.
- `src/pages/Exercises.jsx` uses exactly **5 local bundled drills** from `src/data/exercises.js` and truthfully labels them as not being an external corpus.
- The ignored generated artifact is synthetic: **40,000** records, **40,000** unique IDs, **285** full FEN strings, only **23** normalized positions, and **39,977** normalized duplicates. Every row lacks `sourceId`, `sourcePuzzleId`, `licenseId`, `rawSha256`, `recordSha256`, and `rating`.
- Generated JSON SHA-256: `e9e12f397bad4b6ab9dd9180cfc3f6c402fcc1f0875cccdaea4a9b607a1ee6ad`. Manifest SHA-256: `183232fac3d727e07f4a1281b4b2ed8c8c211c31eab7cf83108b6311aa169ac8`. Both are ignored by `.gitignore:15`.
- `scripts/ingest-corpus.cjs` repeats templates, changes only the FEN fullmove counter for its variations, and self-assigns `generated-corpus-v2` plus CC0. That is not external provenance.
- `src/data/corpusPuzzles.ts` is a dormant **28-record synthetic seed** with `internal://seed-corpus` and placeholder checksum text; no source file imports it.
- `src/services/corpusService.ts#initializeCorpus` is a synthetic seed adapter used by `src/test/corpus.test.ts`, whose two seed groups contain **3** and **12** test records. It is not invoked by production.
- `src/test/benchmarkCorpus.ts` is an unused engine test fixture. `src/services/analysis/pgnFixtures.ts` is a PGN test/benchmark fixture re-exported by the parser for compatibility, but its fixture markers are tree-shaken from the production build.
- The legacy `node scripts/verify-corpus.cjs` defect is reproduced: exit **0** and “All validations passed” despite no manifest checksum, sampled provenance **0/10**, **39,977** duplicate warnings, and only string-length checking for the first 100 solutions.

## Approved source

The roadmap-approved `https://database.lichess.org/` is reachable (HTTP 200). The official page explicitly states that database exports are Creative Commons CC0 and currently publishes **6,057,356** puzzles. The puzzle download HEAD request returns HTTP 200, `application/octet-stream`, **304,384,407 bytes**, and `Last-Modified: Sun, 02 Aug 2026 07:23:55 GMT`.

Current official CSV schema:

`PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate`

Because the approved source is reachable and its license/source are explicit, P2-T01 does not trigger the master prompt's dataset-source Decision Gate. A later task must still import, checksum, validate, and deliver real records before any production-corpus or Phase 2 PASS claim.

## Fresh verification

| Gate | Result |
|---|---|
| Independent origin/import-graph/source audit | PASS |
| Focused corpus tests | 4 files, 46/46 PASS |
| Full lint | PASS |
| Full typecheck | PASS |
| Full unit/integration suite | 33 files, 592/592 PASS |
| Production build | PASS, 4,103 modules |
| Synthetic markers in `dist` | none found |
| `git diff --check` | PASS |

## Production self-play

Fresh Chromium against `vite preview` observed hashed production assets, the exact truthful external-corpus-unavailable notice, and a real `/stockfish-worker.js?v=2026-05-30-simplified` worker. The game completed six legal plies (`e4 e5 Nf3 d6 d3 Nf6`), the final FEN replayed successfully, eight real `bestmove` messages were observed, and console/page/network error counts were all zero.

Evidence:

- `artifacts/tech-verification/PHASE_2/P2-T01/verifier/audit.json`
- `artifacts/tech-verification/PHASE_2/P2-T01/verifier/self-play.json`
- `artifacts/tech-verification/PHASE_2/P2-T01/verifier/commands.json`
- `artifacts/tech-verification/PHASE_2/P2-T01/verifier/harness-failures.json`

The first audit-harness attempt failed only because its verifier regex did not account for the official count being wrapped in `<strong>`; the failure is preserved and the complete audit was rerun successfully. No production source, tests, dependency, prior evidence, commit, or push was changed by this verifier.
