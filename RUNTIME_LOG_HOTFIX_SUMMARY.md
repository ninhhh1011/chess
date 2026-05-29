# Runtime Log Hotfix Summary

## Console errors fixed
- useAuth undefined in userProfileService
- bot makeMove false / stale FEN handling
- Stockfish fallback hardening
- favicon 404

## Files changed
- `src/services/userProfileService.js`
- `src/services/syncService.js`
- `src/hooks/useBotMove.js`
- `src/hooks/useBotMove.test.js`
- `src/contexts/ChessGameContext.tsx`
- `src/services/botService.js`
- `src/services/fallbackChessEngine.js`
- `src/services/stockfishService.js`
- `index.html`
- `public/favicon.svg`
- `RUNTIME_LOG_HOTFIX_SUMMARY.md`

## What was intentionally not changed
- `onboarding.js`: not found in this repo; likely from a browser extension, devtools overlay, or third-party script.
- UI redesign.
- Unrelated chess features.
- Existing unrelated unit test expectations outside the runtime hotfix scope.

## Build result
- `npm.cmd run build`: pass.

## Manual test
- `/play` start game: pass.
- player move: pass.
- bot move: pass.
- Stockfish worker error/timeout fallback: pass; bot continued with a legal fallback move.
- undo: pass.
- move after undo: pass.
- resign: pass.
- review: pass.

## Remaining risks
- Stockfish worker can still timeout or emit worker errors in development, but the app now returns fallback analysis and the bot remains playable.
- Dev console can still show controlled fallback warnings when an engine move is illegal on the snapshot and a random legal move is used.
- `npm.cmd test` currently fails on existing unrelated expectations in move/highlight/evaluation tests; `npm.cmd run build` passes.
