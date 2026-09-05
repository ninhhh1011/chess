# Corpus Deployment and Reproducibility

## Status: DEPENDENCY DOCUMENTED

The corpus file `src/data/generated/generatedPuzzles.json` is **gitignored** and must be regenerated during build/deploy.

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Build Process                          │
├─────────────────────────────────────────────────────────┤
│  npm install                                             │
│  ↓                                                      │
│  node scripts/ingest-corpus.cjs  ← Generates 40k puzzles│
│  ↓                                                      │
│  Vite build                                             │
│  ↓                                                      │
│  Output: dist/                                          │
│          └── assets/                                    │
│              └── generatedPuzzles.json (bundled)        │
└─────────────────────────────────────────────────────────┘
```

---

## Gitignore Configuration

```gitignore
# Generated corpus (too large for repo)
src/data/generated/
```

---

## Build Failure Without Corpus

**Current behavior:** Build will fail if `src/data/generated/generatedPuzzles.json` does not exist.

**Reason:** The corpus loader imports the JSON file directly:
```typescript
import generatedPuzzlesData from '../data/generated/generatedPuzzles.json';
```

---

## Reproduction Steps

### Option 1: Generate on Build
Add to `package.json`:
```json
{
  "scripts": {
    "prebuild": "node scripts/ingest-corpus.cjs",
    "build": "vite build"
  }
}
```

### Option 2: Generate and Commit (Smaller Corpus)
For CI/CD, generate a minimal corpus (1000 puzzles) and commit:
```bash
CORPUS_SIZE=1000 node scripts/ingest-corpus.cjs
git add src/data/generated/corpusManifest.json
```

### Option 3: External Artifact
Store corpus in external storage (S3, etc.) and download during build:
```bash
curl -o src/data/generated/generatedPuzzles.json $CORPUS_URL
```

---

## Reproducibility Verification

### Test 1: Clean Clone
```bash
git clone <repo>
npm ci
npm run build  # Must generate corpus or fail gracefully
```

### Test 2: Idempotent Import
```bash
# Run twice, should produce same result
node scripts/ingest-corpus.cjs
node scripts/ingest-corpus.cjs
# Verify: diff should show no changes
```

### Test 3: Manifest Checksum
```bash
node scripts/ingest-corpus.cjs
# Check: src/data/generated/corpusManifest.json
# Verify checksum matches generated puzzles
```

---

## Corpus Metadata

```json
{
  "version": "1.0.0",
  "generated": "2026-09-03T00:00:00.000Z",
  "source": "generated-corpus-v2",
  "license": "CC0",
  "targetPuzzles": 20000,
  "generatedPuzzles": 40000,
  "acceptedPuzzles": 25320,
  "motifs": 16,
  "schema": "corpus.v1"
}
```

---

## Current Limitations

1. **No committed corpus:** Gitignored, regenerated on each build
2. **Build dependency:** Build requires node and corpus script
3. **Time cost:** ~5 seconds to generate 40k puzzles

---

## Recommendations

### Short-term (Current)
- Document as build dependency ✅
- Ensure `ingest-corpus.cjs` runs on build

### Medium-term
- Add prebuild script to package.json
- Add `--size` flag to control puzzle count
- Commit manifest only (not full dataset)

### Long-term
- Move corpus to external storage
- Download during CI/CD
- Use corpus version tag for reproducibility

---

## Verification Checklist

- [x] Corpus generator script exists
- [x] Generated puzzles validate correctly
- [x] Manifest with checksum generated
- [x] Build includes generated data
- [ ] Clean clone build succeeds (manual verification)
- [ ] CI/CD pipeline verified
