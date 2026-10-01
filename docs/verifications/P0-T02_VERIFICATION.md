# P0-T02 Verification

**Verdict: PASS**

Verified independently on 2026-09-05 (Asia/Saigon) against HEAD `7ecc6a6` plus the current P0-T01 and P0-T02 working-tree changes.

## Severity findings

- **Critical/high/medium/low findings: none.** All P0-T02 acceptance criteria passed.
- **Informational:** `src/data/corpusPuzzles.ts` still contains a dormant legacy seed dataset and placeholder provenance strings. It has no production or test import, is absent from the production bundle, and is not used as a fallback. It therefore does not affect the P0-T02 runtime contract.
- **Inherited dependency audit:** `npm ci` reports 12 package vulnerabilities (1 low, 1 moderate, 8 high, 2 critical). P0-T02 changes neither `package.json` nor `package-lock.json`; dependency remediation is outside this task and may require a separate decision gate.

## Acceptance evidence

### 1. Fresh tracked-files-only checkout

Created outside the repository at:

```text
C:\Users\nguye\AppData\Local\Temp\chess-p0-t02-verifier-20260905-193707
```

The checkout was produced from `git archive HEAD`; all current modified tracked source files were then copied over. The ignored `src/data/generated` tree, local `.env` files, and existing `node_modules` were not copied. Only `.env.example` and `server/.env.example` existed before installation.

Exact checks and results:

```text
Test-Path src\data\generated\generatedPuzzles.json
False

npm ci
exit 0; 689 packages installed

npm run typecheck
exit 0

npm run build
exit 0; Vite transformed 4056 modules and generated the production/PWA output
```

This independently proves the prior TS2307 clean-checkout failure is removed without copying or regenerating the hidden JSON artifact.

### 2. Corpus truthfulness and caller/callee audit

The complete production call graph is:

```text
src/pages/Exercises.jsx -> CORPUS_AVAILABILITY from src/services/corpusLoader.ts
src/services/corpusLoader.ts -> reset/query/stat functions from src/services/corpusService.ts
src/pages/Exercises.jsx -> five local drills from src/data/exercises.js
```

`loadCorpus()` clears the in-memory corpus and returns this explicit contract:

```text
available: false
source: unavailable
puzzleCount: 0
reason: No verified external corpus is bundled with this build.
```

No production caller imports `CORPUS_EXERCISES` or `src/data/corpusPuzzles.ts`. The five bundled exercises remain ordinary local drills and are not initialized as corpus records.

Fresh source and bundle scans:

```text
rg -n 'generatedPuzzles|generated-corpus-v2' src
exit 1; no matches

rg -n -i 'generatedPuzzles|generated-corpus-v2|seed-corpus|CC0 Public Domain|corpus-manifest-sha256|20,000 puzzles' <clean>\dist
exit 1; no matches

rg -n 'corpusPuzzles|CORPUS_EXERCISES' src --glob '!src/data/corpusPuzzles.ts'
exit 1; no imports
```

The clean `Exercises` bundle does contain the five local drills and the truthful Vietnamese notice:

```text
Kho bài tập mở rộng chưa khả dụng. Bạn đang luyện với 5 bài tập tích hợp, không phải corpus bên ngoài.
```

### 3. Focused tests and static gates

Fresh commands from `E:\chess`:

```text
npx vitest run src/test/corpusAvailability.test.ts src/test/corpusIntegration.test.ts src/test/corpus.test.ts src/test/learningLoop.test.ts
exit 0
Test Files  4 passed (4)
Tests       66 passed (66)

npm run lint
exit 0; zero warnings under --max-warnings 0

npm run typecheck
exit 0

git diff --check
exit 0; only Git LF-to-CRLF notices
```

The replacement integration assertions are not vacuous: they require the exact unavailable contract, zero corpus records, null/undefined lookup behavior, empty filtered queries, and a still-nonempty built-in recommendation path. The new contract test independently asserts that bundled/generated exercises are not presented as a real corpus.

### 4. Fresh production Chromium verification

The verifier served the clean checkout's production `dist` on `127.0.0.1:4176` and ran:

```text
node artifacts/tech-verification/PHASE_0/P0-T02/verifier/self-play.mjs
exit 0
```

The browser first visited `/exercises` and asserted the visible status notice exactly identified the external corpus as unavailable and the five exercises as integrated drills, not external corpus content. It then visited `/play`, selected **Dễ** and **Trắng**, and entered moves through chessboard clicks.

Result:

```text
Chromium viewport: 1440x900
plies: 6
SAN: e4, e5, Nf3, Nf6, d3, d6
final FEN: rnbqkb1r/ppp2ppp/3p1n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4
chess.js SAN/FEN replay: PASS
Stockfish worker: /stockfish-worker.js?v=2026-05-30-simplified
worker ready success: true
captured bestmove messages: 8
console errors: 0
page errors: 0
network failures / HTTP >=400: 0
```

The 2/4/6 turn progression, legal SAN replay, White-to-move final FEN, worker-ready event, and real UCI `bestmove` messages prove a complete six-ply game path without a mock or fallback engine.

Artifacts:

- `artifacts/tech-verification/PHASE_0/P0-T02/verifier/self-play.mjs`
- `artifacts/tech-verification/PHASE_0/P0-T02/verifier/self-play.json`
- `artifacts/tech-verification/PHASE_0/P0-T02/verifier/self-play.png`
- `artifacts/tech-verification/PHASE_0/P0-T02/verifier/browser-console.json`
- `artifacts/tech-verification/PHASE_0/P0-T02/verifier/page-errors.json`
- `artifacts/tech-verification/PHASE_0/P0-T02/verifier/network-errors.json`

### 5. Diff hygiene

- No `.only`, `.skip`, or `.fixme` marker exists under `src` or `e2e`.
- No P0-T02 dependency, package-lock, Vite, Tailwind, global CSS, or Option C theme change exists.
- P0-T02 production changes are limited to the corpus availability/reset contract and the visible Exercises status notice.
- The other modified production/test files belong to the already independently verified P0-T01 bot/Stockfish fix; no unrelated P0-T02 behavior was found.

## Final assessment

P0-T02 removes the hidden generated-corpus build dependency, keeps the real corpus explicitly unavailable, labels the five bundled exercises truthfully, passes clean-checkout and focused gates, and preserves real Stockfish self-play. No decision gate is required because no provider, storage service, external corpus, package, or dependency was added.
