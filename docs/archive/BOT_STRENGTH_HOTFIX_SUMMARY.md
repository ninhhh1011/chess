# Bot Strength Hotfix Summary

## Root cause
- Stockfish results were trusted before checking legality against the exact request FEN.
- Timeout partial PV could return a stale or wrong-side move.
- `analyzeFen()` cancelled active analysis globally, so hint/review analysis could interfere with bot analysis.
- Stockfish worker crashes could retry immediately and push the bot into weak random fallback too often.

## Files changed
- `src/utils/chessMoveValidation.js`
- `src/services/heuristicBotEngine.js`
- `src/services/botService.js`
- `src/services/stockfishService.js`
- `src/services/fallbackChessEngine.js`
- `src/hooks/useBotMove.js`
- `src/hooks/useEngineAnalysis.js`
- `src/components/ChessGameBoard.jsx`
- `src/components/analysis/EngineAnalysisPanel.jsx`
- `src/components/chess/LiveEvaluationBar.jsx`
- `src/data/botLevels.js`
- `public/stockfish-worker.js`

## Fixes
- Added shared UCI parsing, legality validation, and move-to-UCI helpers.
- Added safe heuristic fallback for 1200+ bots; weak random fallback remains limited to low ELO.
- Hardened heuristic fallback so invalid FEN returns `null`, fallback moves are self-validated, and fallback scoring penalizes hanging the moved piece.
- Hardened `botService` so an invalid fallback move returns `source: none` instead of leaking an illegal move downstream.
- Validated Stockfish bestmove and timeout partial PV before returning success.
- Added sequential analysis queue, request IDs, and worker crash cooldown.
- Added exponential worker crash cooldown and suppressed repetitive raw worker crash logs.
- Cache-busted the Stockfish worker URL and made Stockfish fallback warnings opt-in via `localStorage.debugStockfish = "1"`.
- Hardened `useBotMove()` so illegal/stale engine moves never reach `makeMove()`.
- Gated bot move debug logs behind `localStorage.debugBotMoves = "1"` in development.
- Removed auto-cancel from `useEngineAnalysis()` cleanup so hint/review does not cancel bot analysis.
- Tuned 1200/1600/2000 bot depth/movetime/skill slightly without relying on tuning to hide invalid moves.

## Build result
- `npm run build`: pass

## Manual test result
- Bot 1200: `/play` starts, player move applies, bot returns turn, not stuck thinking. Latest local check showed `2 nước đi` after `e2-e4` and bot reply.
- Bot 1600: `/play` starts, player move applies, bot returns turn, not stuck thinking.
- Stockfish crash fallback: worker failures now set cooldown and use fallback analysis.
- Illegal move logs: new code path discards invalid Stockfish results before `makeMove()`. Latest local console check showed no `[MOVE] rejected`, no `makeMove returned false`, and no illegal snapshot spam.
- Bot source distribution: intended sources are `stockfish_wasm`, `stockfish_wasm_partial`, `fallback_heuristic`, `fallback_random_weak`, and `none`.

## Additional test note
- `npm test` still has unrelated existing failures in old expectations for FEN en-passant, highlight colors/arrows, mate formatting, and an outdated `useEngineAnalysis` test signature.

## Remaining risks
- Stockfish WASM can still be unavailable in some browser environments; the bot should now continue with `fallback_heuristic`.
- Browser console capture in the in-app browser retained stale logs from earlier sessions, so manual verification focused on served source, game state, and build output.
