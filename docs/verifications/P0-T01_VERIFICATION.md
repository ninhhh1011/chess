# P0-T01 Verification

**Verdict: PASS**

Verified independently on 2026-09-05 (Asia/Saigon) against HEAD `7ecc6a66125c361a8a08e09c88ff92bcb97a9cba` plus the current four-file working-tree fix.

## Severity findings

- **P0-T01 findings: none.** All acceptance criteria passed.
- **Known follow-up, not a P0-T01 failure:** the tracked checkout still lacks `src/data/generated/generatedPuzzles.json`; clean `npm run typecheck` fails with TS2307. P0-T02 remains required.

## Acceptance evidence

### 1. Tracked-files-only clean checkout

Created outside the repository at `C:\Users\nguye\AppData\Local\Temp\chess-p0-t01-e53a3dec7dcc43e2ab11b69fcb95a69f\checkout` with:

```powershell
git archive --format=zip --output=<temp>\tracked.zip HEAD
Expand-Archive <temp>\tracked.zip <temp>\checkout
```

Only tracked files were archived. `src/data/generated/generatedPuzzles.json` was absent and `node_modules` was absent before installation. The only tracked environment-named files are `.env.example` and `server/.env.example`; no live secret file was copied.

Fresh command results:

```text
npm ci                         exit 0; 689 packages installed
npm run typecheck              exit 2
src/services/corpusLoader.ts(24,34): error TS2307: Cannot find module '../data/generated/generatedPuzzles.json' or its corresponding type declarations.
npm run build                  exit 0; Vite built 4054 modules and generated PWA output
```

This is the expected clean-checkout defect for P0-T01 and confirms P0-T02 is still necessary.

### 2. GitHub CI parity

`gh` was available. Exact evidence:

```text
gh run list --commit 7ecc6a66125c361a8a08e09c88ff92bcb97a9cba --limit 5 ...
CI/CD Pipeline, run 33962483253, conclusion=failure

gh run view 33962483253 --log-failed
Run Typecheck > tsc --noEmit
src/services/corpusLoader.ts(24,34): error TS2307: Cannot find module '../data/generated/generatedPuzzles.json' or its corresponding type declarations.
Process completed with exit code 2.
```

CI failed at the same boundary as the clean tracked checkout.

### 3. Diff and root-cause review

`git diff --name-only` contains exactly:

```text
e2e/stockfish.spec.js
src/components/ChessGameBoard.integration.test.jsx
src/components/ChessGameBoard.jsx
src/services/stockfishService.ts
```

Confirmed root causes and fixes:

- The old `ChessGameBoard` had one effect update `lastMoveCountRef.current` before the following bot-trigger effect compared `moveHistory.length > lastMoveCountRef.current`. The comparison was therefore false after a White player move, so no bot request started. The fix reuses the context-owned `botRequestId` generation and keys each bot turn by generation plus FEN, removing the ordering dependency.
- `stockfishService.analyzeFen` assigns the single worker's `onmessage` handler per analysis. Concurrent callers previously overwrote that handler, leaving earlier promises unsettled. The fix serializes calls through one module-level promise queue while retaining the existing real worker path.
- The integration regression exercises the actual provider/board lifecycle while mocking only the service and visual chessboard boundary. The E2E regression requires three settled results, each with `source === 'stockfish_wasm'` and a valid UCI move.
- No assertions were weakened; no `.only`, `.skip`, or `fixme` was added. No production mock/fake data, package/dependency/version, theme, or unrelated UI change appears in the diff.

### 4. Fresh targeted tests

```text
npm run test -- src/components/ChessGameBoard.integration.test.jsx
exit 0
Test Files  1 passed (1)
Tests       11 passed (11)

npx playwright test e2e/stockfish.spec.js -g "concurrent analysis requests" --reporter=line --output=artifacts/tech-verification/PHASE_0/P0-T01/verifier/playwright-targeted
exit 0
1 passed (13.1s)
```

The Playwright test's assertions require an array of length three and verify every result has `source: stockfish_wasm` plus a UCI-formatted `bestMove`; fallback results cannot satisfy it.

### 5. Fresh static gates

```text
npm run lint        exit 0; zero warnings under --max-warnings 0
npm run typecheck   exit 0
git diff --check    exit 0 (only Git CRLF conversion notices)
```

The working tree's ignored generated corpus is present, so the current-tree typecheck passes; the separate tracked-only checkout above correctly proves the remaining clean-checkout failure.

### 6. Fresh production Chromium self-play

The current four-file diff was copied into the external tracked checkout, and `npm run build` exited 0. A Vite production preview was served at `http://127.0.0.1:4174`; the verifier used Chromium against `/play`, dismissed first-visit onboarding through the UI, explicitly selected **Dễ** and **Trắng**, and entered all player moves by clicking board coordinates.

Exact result from `node artifacts/tech-verification/PHASE_0/P0-T01/verifier/self-play.mjs`:

```text
exit 0
ply counts after each player+bot pair: 2, 4, 6
SAN: e4, c5, Nf3, Nc6, d3, Nf6
final FEN: r1bqkb1r/pp1ppppp/2n2n2/2p5/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 1 4
chess.js SAN replay: PASS
final FEN parse: PASS
turn order after every pair: PASS (White to move)
page errors: 0
failed/HTTP >=400 network requests: 0
```

The exact 2/4/6 progression and White turn after each pair rule out double moves, stale responses, and stuck bot turns for the required six plies.

Outer worker proof captured from the production page:

```text
worker start: /stockfish-worker.js?v=2026-05-30-simplified
ready: { type: "ready", success: true }
after 1.e4 position: bestmove c7c5 ...
after 2.Nf3 position: bestmove b8c6 ...
after 3.d3 position: bestmove g8f6 ...
```

Those three best moves exactly match the three Black SAN moves applied in the UI, proving the self-play bot moves came from real Stockfish output rather than fallback.

Artifacts:

- `artifacts/tech-verification/PHASE_0/P0-T01/verifier/self-play.mjs`
- `artifacts/tech-verification/PHASE_0/P0-T01/verifier/self-play.png`
- `artifacts/tech-verification/PHASE_0/P0-T01/verifier/playwright-targeted/.last-run.json`

## Final assessment

P0-T01 fixes the mandatory self-play blockers with the minimum scoped changes and passes all requested regressions, static gates, and production-browser evidence. The missing generated corpus remains independently reproduced and belongs to P0-T02.
