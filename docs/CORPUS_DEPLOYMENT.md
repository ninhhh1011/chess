# Corpus Deployment

**Current state:** a verified 20,000-puzzle Lichess corpus is shipped as repo-native static assets.

Production reads `public/corpus/current.json`, then the selected versioned manifest and chunks under `public/corpus/runs/<content-identity>/`. Vite copies these files to `dist/corpus`; JSON remains outside the PWA precache glob. The application verifies the pointer and manifest contracts, official source/license metadata, every chunk SHA-256, every `PuzzleRecord`, record provenance, and the final record count before activation. Any missing, malformed, altered, or incomplete artifact fails closed and leaves the five bundled exercises as a truthfully labelled fallback.

## Active corpus

- source: `https://database.lichess.org/lichess_db_puzzle.csv.zst`
- license: CC0-1.0
- dataset version: `2026-08-02`
- source SHA-256: `a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073`
- content identity: `474266a1953635fef5a03406a2dcd5831cc891085104d19e39c8f2470a40e75f`
- accepted/validated: 20,000/20,000; 71,916 solution moves replayed
- delivery: 20 chunks of 1,000 records; prior verified 1,000-puzzle run retained for rollback

## Build and publish

Run the full validator first, then build delivery assets only from its PASS report:

```powershell
node scripts/build-corpus-delivery.mjs build `
  --input <accepted.jsonl> `
  --manifest <import-manifest.json> `
  --validation-report <validation-report.json> `
  --output-root public/corpus `
  --chunk-size 1000
```

The builder refuses non-PASS evidence and any input/source/count mismatch. It writes chunks and a manifest into a temporary run directory, renames the completed run into place, then atomically replaces only `current.json`. Existing runs are immutable and verified before reuse.

Rollback keeps every prior run and atomically selects the previous verified version:

```powershell
node scripts/build-corpus-delivery.mjs rollback --output-root public/corpus
```

Rollback rechecks the prior manifest and every chunk checksum before changing the pointer. A corrupt or incomplete target leaves `current.json` untouched.

`src/data/generated/generatedPuzzles.json` remains ignored and is neither read nor required by build or runtime. A clean candidate assembled from tracked plus unignored files builds with the corpus and without that hidden local artifact.
