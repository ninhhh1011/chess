# P2-T04 Independent Verification

**Verdict: PASS**  
**Decision Gate: not required**

The canonical importer satisfies the P2-T04 acceptance criteria against the actual official Lichess snapshot. I found no implementation defect, synthetic substitution, fake provenance, new production mock, or new dependency.

## Source and streaming review

- Official source: `https://database.lichess.org/lichess_db_puzzle.csv.zst`; HTTP 200, `Content-Length: 304384407`, `Last-Modified: 2026-08-02T07:23:55Z`, byte ranges supported.
- Official Lichess database page states CC0 and currently documents 6,057,356 puzzles with schema `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate`.
- Independent local SHA-256: `a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073`. Lichess does not publish a checksum on the page, so the manifest correctly labels this as the locally calculated full-file checksum.
- The local file begins with the seekable-Zstd skippable-frame magic. The importer streams `createReadStream -> StripLeadingSkippableFrames -> createZstdDecompress -> fatal UTF-8 decoder -> incremental line parser`; it does not buffer the compressed or decompressed dataset.
- Node 24.15.0 exposes the required native APIs and decoded the real snapshot. CI's rolling Node 22.x is compatible because the API was added in Node 22.15.0. Advisory: the importer has a narrower runtime floor than the application's `package.json` Node 20 allowance; this does not affect the current local or CI gate.

## Implementation and provenance audit

`scripts/import-lichess-puzzles.mjs` is the sole new importer. It pins the exact approved HTTPS host/path and CC0-1.0 URL, uses only Node standard-library modules plus the already-installed `chess.js`, maps the official preceding-move semantics, validates PuzzleRecord v1, writes accepted/quarantine data in bounded batches, hashes source/rows/canonical records/outputs, and atomically checkpoints via temporary-file rename.

Searches of the importer, tests, corpus services, production page, dependency manifests, and current diff found no synthetic/template generator reachable from the importer, no fake Lichess IDs, no production mock, and no dependency or lockfile change. The old ignored generated corpus tooling remains dormant and preserved. The four-row fixture is a clearly test-scoped official excerpt and was not counted toward real-import thresholds.

Compressed resume correctly restarts decompression and skips the durable committed source-row count. It does not pretend arbitrary compressed-byte seeking or O(1) resume. Exact byte-for-byte idempotency/rollback remains explicitly assigned to P2-T06.

## Independent real import

Fresh import with rating 1400–1600 and limit 1,000:

| Metric | Result |
|---|---:|
| Parsed | 9,362 |
| Filtered | 8,362 |
| Accepted | 1,000 |
| Invalid / quarantine / duplicate | 0 / 0 / 0 |
| Peak RSS | 97,488,896 bytes (<128 MiB) |
| Content identity | `c836c4470ffc4289945d2e48f987ad1849926f7cb526002bb81e4f9511b00338` |
| Accepted output SHA-256 | `906ab8cca5e690059e7b7c3b2842e6e7fa23aed165105cfeceeb47d5ce6c6eb6` |
| Empty quarantine SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

A second clean run produced the same content identity with peak RSS 95,744,000 bytes. Run timestamps correctly change byte-level record/output checksums but do not change the reproducible content identity.

The independent audit found all 1,000 accepted source IDs in the official decompressed rows and checked every record: 1,000/1,000 PuzzleRecord validations, canonical checksums, raw-line checksums, source-FEN/preceding-move derivations, metadata mappings, normalized keys, provenance links, and complete legal solution replays passed. Unique source IDs and normalized keys were both 1,000/1,000.

The controlled interruption returned exit 75 at parsed 3,000 / accepted 345 and left a usable checkpoint. Resume completed at 1,000 records with `checkpointResumeStatus: resumed`, zero accepted duplicate IDs/normalized keys, peak RSS 95,567,872 bytes, and the same content identity as both clean runs.

## Adversarial and failure behavior

The verifier's independent six-group harness passed:

- malformed row, duplicate source ID, and duplicate normalized key were separately quarantined with exact reasons;
- truncated Zstd and invalid UTF-8 failed closed;
- corrupt checkpoint, changed configuration, and changed output path were rejected;
- inherited required properties and forged canonical content were rejected;
- HTTP 503 and interrupted response left no partial destination;
- missing CLI requirements, unknown option, and unapproved source returned exit 1; controlled abort returned 75.

The focused importer suite additionally covers seekable-Zstd fixture decoding, dry-run/validation-only non-mutation, SIGINT handler/resume, destination failure, invalid metadata, stale checkpoint, and CLI behavior.

## Fresh gates

- Focused: 4 files, **41/41 tests PASS**.
- Full suite: 36 files, **687/687 tests PASS** (no baseline reduction).
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS; 4,103 modules transformed.
- `git diff --check`: PASS throughout and at final verification.
- No `.skip`, `.only`, `fixme`, TypeScript suppression, empty catch, or assertion bypass was introduced in the P2-T04 surface.

## Production Chromium smoke

The freshly built hashed production bundle was served locally and exercised in Chromium. `/exercises` truthfully reported the external corpus unavailable and identified the five bundled exercises as integrated/non-external. `/play` completed six legal plies (`e4 e6 Nf3 d5 d3 a5`) through the real `stockfish-worker.js` / `stockfish_wasm` path. Turn order and final FEN were legal, PGN replay passed, and console/page/network error arrays were all empty.

## Evidence

- `artifacts/tech-verification/PHASE_2/P2-T04/verifier/real-import-audit.json`
- `artifacts/tech-verification/PHASE_2/P2-T04/verifier/adversarial-results.json`
- `artifacts/tech-verification/PHASE_2/P2-T04/verifier/source-metadata.json`
- `artifacts/tech-verification/PHASE_2/P2-T04/verifier/static-audit.json`
- `artifacts/tech-verification/PHASE_2/P2-T04/verifier/commands.json`
- `artifacts/tech-verification/PHASE_2/P2-T04/verifier/self-play.json`
- `artifacts/tech-verification/PHASE_2/P2-T04/verifier/harness-failures.json`

The three preserved verifier failures were harness mistakes (an undocumented CLI flag, passing a path instead of a readable stream, and mojibake selectors). Each was corrected only in verifier-owned code, and each complete scenario was rerun to PASS. No production/test source was changed by the verifier. No commit or push was performed.
