# Game Domain Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bot chess session the single owner of legal game state and explicit lifecycle, with user-selected promotion and no local/online multiplayer paths.

**Architecture:** `gameSessionReducer` owns the live `Chess` position, player side, and lifecycle; `ChessGameContext` adapts it to React consumers while unrelated review, bot, and engine concerns remain staged for later phases. `GameLayout` owns board selection/highlights and passes them to its board/keyboard consumers. Keep chess.js as the rules implementation and avoid generic ports or managers without a second real implementation.

**Tech Stack:** React 19, TypeScript/JavaScript, chess.js, Vitest, React Testing Library, existing Vite app.

**Spec:** `docs/architecture/TARGET_ARCHITECTURE.md`, `docs/architecture/ADR-001-product-scope.md`, and Phase 2 of the master refactor brief.

## Global Constraints

- Preserve current bot play behavior and visual language while changing ownership.
- Product scope v1 is single-player learning with bot; online multiplayer and local two-player are removed end-to-end.
- Click, drag, and keyboard moves share one promotion transaction; promotion choices are `q`, `r`, `b`, or `n`.
- Game core owns position, turn, legal moves, game result, player side, and lifecycle; it does not own UI selection, engine state, review annotations, or bot request synchronization.
- No React, CSS, browser storage, network, or engine-worker dependencies in the game domain.
- Use HeroUI v3 for generic interactive UI; retain the chessboard and chess-specific interaction exceptions.
- Required verification: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; test E2E golden paths and 360px/390px responsive overflow.

## Review Focus

- A promotion attempt from click, drag, or keyboard leaves the FEN unchanged until a piece is chosen; pin parity in Task 1.
- A pending promotion followed by reset, undo, resign, or route exit cannot commit into the next session; pin invalidation in Task 1.
- Bot results computed for an old FEN cannot mutate the new game; retain and test the existing request/FEN guard in Task 2.
- A draw or checkmate reached by a user or bot move advances lifecycle to `game_over`; pin both in Task 2.
- A stale online-game deep link or stored multiplayer row cannot restore multiplayer UI after route removal; pin route absence and migration disposition in Task 3.

---

### Task 1: Make promotion a single user-selected transaction

**Files:**
- Modify: `src/contexts/ChessGameContext.tsx`
- Modify: `src/components/chess/ChessBoardPanel.jsx`
- Modify: `src/components/chess/PromotionModal.jsx`
- Modify: `src/hooks/useKeyboardNavigation.js`
- Test: `src/components/chess/ChessBoardPanel.test.jsx`
- Test: `src/contexts/ChessGameContext.test.jsx`
- Test: `src/contexts/ChessGameContext.integration.test.jsx`
- Test: `src/components/chess/ChessBoardPanel.test.jsx`

**Interfaces:**
- Existing UI command becomes `attemptMove(from: Square, to: Square): MoveResult`, where a legal promotion returns `{ status: 'promotion_required', from, to, color }`, a committed move returns `{ status: 'moved', move, nextGame }`, and an invalid/stale move returns `{ status: 'rejected' }`.
- `choosePromotion(piece: 'q' | 'r' | 'b' | 'n')` commits only the current pending transaction. `cancelPromotion()` clears it without changing game position.
- Bot commits retain `makeMove(..., { byBot, sourceFen })`; they never enter the user promotion modal and must supply the engine move's promotion piece.

- [x] **Step 1: Add failing tests for promotion attempt and selection**

Assert a legal white promotion attempt returns `promotion_required`, leaves FEN unchanged, and each of q/r/b/n produces the expected promoted piece after explicit choice. Assert cancel preserves FEN.

- [x] **Step 2: Run the focused context tests and verify the expected failure**

Run: `npm test -- src/contexts/ChessGameContext.test.jsx src/contexts/ChessGameContext.integration.test.jsx`

Expected: the new assertions fail because `makeMove` auto-queens and no canonical attempt/choice command exists.

- [x] **Step 3: Add click/drag parity tests**

Exercise the shared move-attempt command from board click, drag, and keyboard callers. Verify all open the same promotion choice and do not update FEN before selection.

- [x] **Step 4: Run the focused board tests**

Run: `npm test -- src/components/chess/ChessBoardPanel.test.jsx src/hooks/useKeyboardNavigation.test.js`

Expected: the current direct `makeMove(..., 'q')` paths fail the no-auto-queen assertions.

- [x] **Step 5: Implement the transaction in the shared game action**

Detect promotion using chess.js legal verbose moves, store one pending `{from,to,color}` transaction, clear it on reset/undo/resign/game replacement, and make `choosePromotion` the only human commit path. Keep `makeMove` for explicitly selected promotion and bot UCI moves; remove its default `'q'` parameter.

- [x] **Step 6: Route every human move input through `attemptMove`**

Update click, drag, keyboard, and modal actions. Do not duplicate promotion detection in board handlers. Modal cancel calls `cancelPromotion`; choice calls `choosePromotion`.

- [x] **Step 7: Run focused tests and then the full unit suite**

Run: `npm test -- src/contexts/ChessGameContext.test.jsx src/contexts/ChessGameContext.integration.test.jsx src/components/chess/ChessBoardPanel.test.jsx src/hooks/useKeyboardNavigation.test.js`

Then run: `npm test`

Expected: all focused promotion and existing game/bot tests pass.

### Task 2: Establish game lifecycle and ownership boundary

**Files:**
- Create: `src/domain/game/gameLifecycle.ts`
- Create: `src/domain/game/gameSession.ts`
- Modify: `src/contexts/ChessGameContext.tsx`
- Modify: `src/components/chess/ChessGameBoard.jsx`
- Modify: `src/components/chess/GameControls.jsx`, `src/components/chess/PostGameReview.jsx`, `src/components/chess/ReviewNavigator.jsx`, `src/components/MobileControls.jsx`
- Test: `src/domain/game/gameLifecycle.test.ts`
- Test: `src/domain/game/gameSession.test.ts`
- Test: existing `ChessGameContext` unit/integration tests

**Interfaces:**
- `GamePhase = 'lobby' | 'playing' | 'game_over' | 'review' | 'analysis'`.
- `transitionGamePhase(current: GamePhase, event: GameEvent): GamePhase` accepts `START_GAME`, `GAME_END`, `RESIGN`, `ENTER_REVIEW`, `ENTER_ANALYSIS`, `EXIT_ANALYSIS`, and `RESET` and rejects invalid transitions by returning the current phase.
- `playState` remains a compatibility read in the context during migration; remove `setPlayState` once all writes use named events.

- [x] **Step 1: Add failing transition tests**

Cover lobby→playing, playing→game_over, playing→review on resignation, game_over→review, review→analysis, analysis→review, and reset→lobby. Assert illegal events leave the phase unchanged.

- [x] **Step 2: Run the focused lifecycle test and verify failure**

Run: `npm test -- src/domain/game/gameLifecycle.test.ts`

Expected: fail because the lifecycle module does not yet exist.

- [x] **Step 3: Implement the smallest pure transition function**

Use a switch over the event and current phase; no reducer framework, React state, or generic state-machine dependency.

- [x] **Step 4: Verify lifecycle transition tests pass**

Run: `npm test -- src/domain/game/gameLifecycle.test.ts`

- [x] **Step 5: Replace direct lifecycle string writes with named transitions**

Update `startGame`, end-of-game handling, resignation, review/analysis entry/exit, and reset. Keep the context as the only React adapter; remove lifecycle booleans only after caller search confirms no consumer remains.

- [x] **Step 6: Separate UI selection from game facts**

Move `selectedSquare` and `moveHints` ownership to the board interaction owner, retaining `getLegalMoves` as a read command. Keep `lastMoveSquares` only where board rendering needs it; do not store CSS properties in game state.

- [x] **Step 7: Test game contracts and stale bot protection**

Add assertions that reset invalidates a pending bot response and terminal positions from either side reach `game_over`; run game domain/context tests and the full unit suite.

### Task 3: Remove local and online multiplayer paths

**Files:**
- Modify: `src/App.jsx` and route/navigation callers
- Delete: `src/pages/OnlinePlay.jsx`
- Delete: `src/services/onlineGameService.js`
- Modify: `src/components/chess/BotSettings.jsx`, `src/components/chess/PreGameLobby.jsx`, bot game components
- Modify: `supabase/schema.sql` and add a forward-only retirement migration under `supabase/migrations/`
- Modify: route, game, and database tests plus current architecture docs

**Interfaces:**
- `startGame({ elo, color })` starts bot play; no goal or time-control setting is part of the live game contract. Remove `mode`, `GAME_MODES`, and `changeGameMode` from the public game context contract.
- Guest play and local profile persistence remain supported; only local two-player chess and online multiplayer are removed.

- [x] **Step 1: Prove all runtime, route, test, migration, and dynamic references**

Search `OnlinePlay`, `onlineGameService`, `GAME_MODES.LOCAL`, `GAME_MODES.ONLINE`, online route paths, dynamic imports, and table/policy names. Record every reference in this task before deleting files.

- [x] **Step 2: Remove local mode controls and make remaining callers bot-only**

Delete the local option from `BotSettings`, remove mode conditionals from move permission, undo, labels, player bars, and keyboard navigation, then remove mode fields/actions from the context type/value.

- [x] **Step 3: Remove the online route, service, page, and Home CTA**

Delete the route and CTA after proving there are no remaining imports. Add a route test that the retired route is not reachable.

- [x] **Step 4: Retire client access to the Supabase subsystem without dropping user data**

Inspect table usage/deployment documentation and migration history. A forward-only migration removes permissive policies and client grants; it keeps the table and publication until deployed data disposition is confirmed.

- [x] **Step 5: Verify source/build deletion and bot play contracts**

Repeat all reference searches from Step 1. Run bot games as White and Black, route tests, relevant SQL policy checks, `npm test`, typecheck, lint, and build.

### Task 4: Update architecture records to match the implemented boundary

**Files:**
- Modify: `docs/architecture/CURRENT_SYSTEM.md`
- Modify: `docs/architecture/TARGET_ARCHITECTURE.md`
- Modify: `docs/architecture/REFACTOR_BACKLOG.md`
- Modify: `docs/architecture/ADR-001-product-scope.md`

**Interfaces:**
- Docs describe implemented game ownership, phase transitions, promotion flow, and removed product paths using current filenames and public commands.

- [x] **Step 1: Verify each architecture claim against source and tests**

Search for every mentioned context field/action and route. Remove claims that were planned but not implemented.

- [x] **Step 2: Record completed Phase 2 decisions and remaining dependent work**

Update only statements evidenced by source/tests; keep engine, persistence, auth, and coach work in the backlog for their dependency-ordered phases.

- [x] **Step 3: Review docs against `git diff`**

Confirm no Phase 3+ work is described as complete.
