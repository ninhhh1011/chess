# Task Report: P2-T01 — Corpus Contracts and Source Registry

**Task ID:** P2-T01
**Phase:** Phase 2 — Real Corpus and Provenance
**Goal:** Implement versioned schemas for corpus management with full provenance tracking

---

## Baseline

Phase 1 baseline confirmed:
- 40-move/80-ply benchmark: PASS (Cold: 5306ms, Warm 1: 5377ms, Warm 2: 5365ms)
- Engine source: stockfish_wasm
- All 252 unit tests pass
- All 60 E2E tests pass
- Build: PASS
- Lint: PASS
- Typecheck: PASS

## Files Inspected

- `src/data/exercises.js` - Legacy exercise format
- `src/types/corpus.ts` - Created for Phase 2
- `src/services/corpusService.ts` - Created for Phase 2
- `src/test/corpus.test.ts` - Created for Phase 2

## Files Changed

- `src/types/corpus.ts` (NEW)
- `src/services/corpusService.ts` (NEW)
- `src/test/corpus.test.ts` (NEW)

## Files Intentionally Not Changed

- All Phase 1 implementation files
- All Phase 0 implementation files
- All configuration files

---

## Implementation

### Schema Definitions

Created comprehensive type definitions in `src/types/corpus.ts`:

1. **LicenseInfo** - License metadata with commercial use, attribution, modification flags
2. **CorpusSource** - Source registration with SHA-256, version, retrieval timestamp
3. **ImportRun** - Import tracking with counts and manifest
4. **QuarantinedRecord** - Invalid record tracking with reason codes
5. **Puzzle** - Full puzzle with provenance (sourceId, licenseId, SHA-256, corpusVersion)
6. **OpeningEntry** - Opening tree with position and moves
7. **ValidationResult** - Structured validation with errors and warnings
8. **CorpusManifest** - Import summary with distributions
9. **CorpusQualityReport** - Quality metrics with quarantine reasons

### Provenance Fields (all puzzles)

Every puzzle includes:
- `sourceId` - Source identifier
- `sourceUrl` - Original source URL
- `sourcePuzzleId` - Original puzzle ID from source
- `licenseId` - License identifier
- `sourceVersion` - Version of source data
- `retrievedAt` - ISO timestamp
- `rawSha256` - SHA-256 of raw download
- `recordSha256` - SHA-256 of processed record
- `importRunId` - Import batch identifier
- `parserVersion` - Parser version used
- `validationVersion` - Validation version used
- `engineVersion` - Engine version used
- `corpusVersion` - Corpus version

### Service Implementation

Created `src/services/corpusService.ts` with:

- `initializeCorpus()` - Initialize from seed data
- `validatePuzzle()` - Schema validation
- `validateSolutionReplay()` - Move sequence validation with chess.js
- `addPuzzle()` - Add with validation and deduplication
- `quarantineRecord()` - Track invalid records
- `generateManifest()` - Produce corpus manifest
- `generateQualityReport()` - Produce quality metrics
- `getCorpusStats()` - Get corpus statistics
- `startImportRun()` / `completeImportRun()` / `rollbackImport()` - Import lifecycle

### Tests

Created 37 tests covering:
- Corpus initialization
- Puzzle validation (valid/invalid FEN, missing fields)
- Solution replay validation (legal/illegal moves)
- Deduplication (FEN normalization)
- Puzzle retrieval (by ID, motif, difficulty, phase)
- Random puzzle selection
- Manifest generation
- Quality report generation
- Import run management
- Quarantine handling

---

## Acceptance Criteria

| Criterion | Evidence |
|-----------|----------|
| Schema rejects records without required provenance | Test: "rejects puzzle without source ID" PASS |
| License metadata is explicit | CORPUS_LICENSE type includes id, name, url, commercialUse, attributionRequired, modificationAllowed |
| Source URLs and checksums are preserved | Puzzle interface includes sourceUrl, rawSha256, recordSha256 |
| Production code cannot promote unverified fixture | `addPuzzle()` validates before adding; quarantine mechanism |

---

## Targeted Tests

```bash
npm run test -- src/test/corpus.test.ts --reporter=verbose
```

**Result:** 37 passed, 0 failed

**Exit code:** 0

---

## Diff Review

```
?? src/types/corpus.ts (NEW)
?? src/services/corpusService.ts (NEW)
?? src/test/corpus.test.ts (NEW)
```

No unrelated files changed.
No user-owned changes overwritten.
No secrets added.
No test weakened.

---

## Known Limitations

- Seed corpus uses 3 legacy exercises + 28 new corpus puzzles (31 total)
- Phase 2 requires 20,000 puzzles - seed corpus is not production corpus
- No actual import from external sources implemented yet
- No actual SHA-256 computation (placeholder strings)

---

## Remaining Risks

- Seed corpus does not meet Phase 2 gate requirement of 20,000 puzzles
- License field uses placeholder SHA-256 (not real hash)
- No server-side storage implementation
- No actual download/import pipeline

---

## Verdict: PASS (P2-T01 Complete)

Task P2-T01 implements the required corpus contracts and source registry infrastructure. The schema correctly tracks provenance, licenses, and validation state. All tests pass. Phase 2 gate for 20,000 puzzles requires additional corpus data (see P2-T04).
