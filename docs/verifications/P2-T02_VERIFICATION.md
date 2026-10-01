# P2-T02 Independent Verification

**Verdict:** PASS  
**Decision Gate required:** No  
**Verified:** 2026-09-06 (UTC+07) on `main` at `7ecc6a6`

## Acceptance result

The production path no longer selects or initializes a synthetic/template corpus. The external corpus is truthfully unavailable with zero records, while the five bundled exercises remain explicitly local drills. The dormant generated corpus, manifest, and TypeScript seed remain in their original locations and are unchanged.

Independent source and rebuilt-bundle inspection found:

- 141 production source files scanned; no import of `generatedPuzzles`, `corpusPuzzles`, or another generated corpus artifact.
- No production caller initializes corpus records outside the corpus service declaration.
- `loadCorpus()` resets corpus state and returns `available: false`, `source: "unavailable"`, and `puzzleCount: 0` without a bundled fallback.
- `/exercises` imports the five records from `src/data/exercises.js`, identifies them as five integrated exercises, and explicitly says they are not an external corpus.
- 32 JavaScript files in the fresh production build were scanned. No synthetic generator/source markers were found; all five local exercise IDs and the truthful notice were present.
- The package build path does not invoke the dormant ingestion generator.

## Dormant data preservation

No dormant input or generated artifact was deleted, moved, or changed:

| Artifact | Evidence |
|---|---|
| `src/data/generated/generatedPuzzles.json` | Preserved; ignored; SHA-256 `e9e12f397bad4b6ab9dd9180cfc3f6c402fcc1f0875cccdaea4a9b607a1ee6ad` |
| `src/data/generated/corpusManifest.json` | Preserved; SHA-256 `183232fac3d727e07f4a1281b4b2ed8c8c211c31eab7cf83108b6311aa169ac8` |
| `src/data/corpusPuzzles.ts` | Preserved and unchanged from HEAD; SHA-256 `010c4419b4695638c5def827110bdcace6feac7fd0ed415ec60b0572c35ccd2a` |
| `scripts/ingest-corpus.mjs` | Unchanged from HEAD and absent from the build lifecycle |

## Fresh validation

| Gate | Result |
|---|---|
| Focused corpus/exercise/learning-loop tests | PASS — 4 files, 34 tests |
| Full Vitest suite | PASS — 33 files, 592 tests |
| ESLint | PASS |
| TypeScript check | PASS |
| Production build | PASS — 4,103 modules; PWA 45-entry precache |
| Verifier harness lint and JSON parse | PASS |
| `git diff --check` | PASS; only Git CRLF advisory warnings |

## Production Chromium proof

A fresh Chromium run used the hashed Vite production build at `http://127.0.0.1:4192`.

1. `/exercises` displayed: “Kho bài tập mở rộng chưa khả dụng. Bạn đang luyện với 5 bài tập tích hợp, không phải corpus bên ngoài.”
2. The page reported `Bài 1/5`, contained no visible generated/synthetic corpus identifiers, and exposed exactly five local drills.
3. `/play` started Easy as White and completed six legal plies: `e4 e5 Nf3 d5 d3 Be6`.
4. The recorded worker URL was `/stockfish-worker.js?v=2026-05-30-simplified`; it emitted a successful ready event and real `bestmove` messages. The asserted engine source was `stockfish_wasm`.
5. Replaying the SAN sequence with `chess.js` produced final FEN `rn1qkbnr/ppp2ppp/4b3/3pp3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 1 4`.
6. Console errors: 0; page errors: 0; failed network responses/requests: 0.

Primary evidence: [isolation.json](../../artifacts/tech-verification/PHASE_2/P2-T02/verifier/isolation.json), [self-play.json](../../artifacts/tech-verification/PHASE_2/P2-T02/verifier/self-play.json), [exercise screenshot](../../artifacts/tech-verification/PHASE_2/P2-T02/verifier/exercises-local-only.png), [play screenshot](../../artifacts/tech-verification/PHASE_2/P2-T02/verifier/self-play.png), and [commands.json](../../artifacts/tech-verification/PHASE_2/P2-T02/verifier/commands.json).

## Findings and gate decision

No acceptance-blocking finding was observed. The intentionally unavailable external corpus is truthful and is the expected P2-T02 state; supplying a verified external corpus belongs to later Phase 2 tasks. Therefore P2-T02 does not require a Decision Gate.
