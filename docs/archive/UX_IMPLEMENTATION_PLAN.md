# Chess Web App UX Implementation Plan

## A. Current diagnosis

- The live play layout uses a large board beside a 360px sidebar. The board is prominent, but the page feels vertically tight at normal desktop zoom.
- Mobile responsiveness has a foundational issue: `index.html` is missing a normal document shell and viewport meta tag, so mobile browsers can treat the page as a wide desktop viewport and scale it down.
- Board sizing is mainly controlled by `.chess-board-container` in `src/index.css` using `vh`-based clamps. This makes the perceived board size change awkwardly across browser zoom levels and viewport heights.
- Chess interaction logic is split across `ChessBoardPanel.jsx`, `ChessGameContext.tsx`, and `useMoveHighlights.js`. Legal move data and legal move styles are mixed together, making behavior and visual priority harder to control.
- Drag smoothness may be affected by SVG filters/transitions in `standardPieces.jsx`, square transitions, hover transforms, and frequent square style object regeneration.
- Legal move hints are visually too strong in some states, especially when combined with selected-square, last-move, engine hint, and check highlights.
- Check/game-over state is fragmented across `GameInfoBar`, `ChessGameBoard`, `PostGameReview`, `ResultModal`, `ReviewNavigator`, and context flags. This increases the chance of repeated or stale result messages during review, undo, redo, and analysis navigation.
- Bot thinking text appears in multiple UI locations. It should be reduced to a small, subtle indicator.
- Login/register buttons are gated by `isSupabaseConfigured` in `Navbar.jsx`; on the live site they are not visible when logged out.
- AI Coach is already in a sidebar tab, but the whole sidebar still competes with the board on desktop and stacks heavily on mobile.
- The repository root contains many hotfix/audit/report markdown files and manual test files, which makes the project harder to scan.
- `package.json` uses `"latest"` for important dependencies including React, Vite, chess.js, react-chessboard, and tooling. These should be pinned or constrained.

## B. Priority order

### P0: Must fix first because it affects playability

- Fix viewport and responsive board sizing.
- Stabilize click-to-select, click-to-move, and drag-to-move so they behave consistently.
- Clean legal move hint data and visual priority.
- Prevent stale checkmate/result UI during analysis mode, undo, redo, and move navigation.

### P1: Important UX/layout cleanup

- Make the board the primary visual focus on desktop and mobile.
- Reduce side panel dominance and make AI Coach less intrusive.
- Minimize bot status text.
- Ensure login/register or account controls are clearly visible in the navbar.

### P2: Repository/code hygiene and polish

- Move hotfix/audit/report docs out of the repository root.
- Pin risky dependencies instead of using `"latest"`.
- Remove or consolidate unused, duplicated, or suspicious components around board rendering, status, bot logic, auth buttons, and coach panels.
- Update README stack notes after dependency pinning.

## C. File-level investigation checklist

### `index.html`

- Check missing `html`, `head`, `body`, `title`, `charset`, and viewport meta.
- Add a proper responsive document shell.
- This is a P0 fix because mobile layout cannot be trusted without it.

### `src/index.css`

- Inspect `.chess-board-container`.
- Replace fragile `vh` clamp sizing with a board size based on available width and height.
- Move hint colors and board-state tokens into clear CSS variables.
- Review global overflow rules and play-page behavior.

### `src/components/Layout.jsx`

- Check play-page max width, horizontal padding, and vertical padding.
- The play route may need a different container model from content pages.
- Ensure the layout does not force board/sidebar spacing that wastes viewport height.

### `src/components/chess/GameLayout.jsx`

- Inspect the main board/sidebar structure.
- Replace the current flex layout with a more predictable board-first grid.
- Keep sidebar available but visually secondary.
- On mobile, stack controls and panels below the board, or make them collapsible/tabbed.

### `src/components/chess/ChessBoardPanel.jsx`

- Audit `onPieceDrop`, `onPieceDragBegin`, `onPieceDragEnd`, `onPieceClick`, and `onSquareClick`.
- Ensure drag begin selects the piece and displays legal hints.
- Ensure drag end does not clear selection too early if the drop callback still needs state.
- Ensure illegal drops clear cleanly without stale hints.
- Ensure bot mode blocks only opponent moves, not valid player interaction.

### `src/contexts/ChessGameContext.tsx`

- Inspect `makeMove`, `selectSquare`, `clearSelection`, `undoMove`, `enterAnalysisMode`, `exitAnalysisMode`, and `goToAnalysisPly`.
- Legal moves should be stored as structured move data, not inline style objects.
- Result/game-over state should be keyed to live-game state only, not analysis/review state.
- Undo should clear stale result notices and invalidate pending bot requests.

### `src/hooks/useMoveHighlights.js`

- Make this the single place responsible for board highlight style priority.
- Expected priority: checked king > selected square > legal moves/captures > last move > engine hint.
- Legal move hints should be subtle and readable.

### `src/components/chess/standardPieces.jsx`

- Check whether drop shadows and transitions make dragging feel heavy.
- Consider simplifying piece styles during normal play and especially while dragging.

### `src/components/chess/GameInfoBar.jsx`

- Remove noisy check/bot text.
- Keep compact status only: current phase and whose turn.
- Check should not show a popup-style warning.

### `src/components/chess/PlayerBar.jsx`

- Replace text like "Đang nghĩ" with a subtle spinner/dot when the bot is active.
- Keep mascot/avatar branding.
- Ensure long bot names truncate cleanly.

### `src/components/chess/PostGameReview.jsx`

- Inspect use of `resultNotice`, `moveHistory`, and `moveAnnotations`.
- Prevent stale review copy from appearing after new game, undo, or analysis navigation.
- Keep Ninh branding in the lesson/advice area.

### `src/components/chess/ResultModal.jsx`

- Determine whether this component is still used.
- If unused, remove it or consolidate with `PostGameReview`.
- If used, ensure it does not conflict with `playState === 'review'`.

### `src/components/chess/ReviewNavigator.jsx`

- Verify analysis navigation does not mutate live-game result state.
- Check exit review, new game, and replay flows.

### `src/components/Navbar.jsx`

- Login/register should be visible on the right side when logged out.
- Account/avatar area should replace login/register when logged in.
- Mobile menu should include the same auth actions.
- Avoid hiding all auth actions only because Supabase is not configured; use disabled/error states instead.

### `src/components/AICoachPanel.jsx`

- Reduce loading copy such as "Ninh đang xem thế cờ..." to a small indicator.
- Keep the Ninh identity and avatar.
- Make the panel cleaner and less dominant.

### `src/hooks/useBotMove.js`

- Verify request invalidation when undoing, starting a new game, resigning, or entering review.
- Ensure bot move application cannot run on stale FEN.
- Keep bot status state minimal.

### `src/services/botService.js`

- Check fallback behavior and logging.
- Make sure user-facing UI is not polluted by internal fallback/debug status.

### `src/services/stockfishService.js`

- Check timeout/fallback behavior and whether analysis requests are queued/cancelled correctly.
- Avoid stale engine hints after moving, undoing, or navigating review.

### `package.json`

- Replace `"latest"` with pinned versions or controlled semver ranges.
- Prioritize React, React DOM, Vite, TypeScript, chess.js, react-chessboard, and build tooling.
- Confirm installed lockfile versions before changing ranges.

### Root documentation and manual test files

- Move hotfix/audit/report files into `docs/dev-notes/`.
- Move manual test files such as `test-promotion.html`, `test-promotion-integration.js`, and `test-move-logic.js` into a proper test or dev-notes location.
- Keep README and core config files in the root.

## D. Implementation plan

### Step 1: Fix the responsive foundation

**Goal:** Make desktop and mobile layout measurements reliable.

**Files likely involved:**

- `index.html`
- `src/index.css`
- `src/components/Layout.jsx`

**What to change:**

- Add proper document structure and viewport meta.
- Tune play-page container padding and max width.
- Replace fragile board sizing with a predictable responsive formula using available width and available height.

**Risk:**

- The board may become too small on short laptop screens if the clamp is too conservative.

**How to test manually:**

- Open `/play` at 1440x900, 1366x768, 1920x1080, 390x844, and 768x1024.
- Confirm no horizontal scroll.
- Confirm the board is large enough to play but not crowding status bars or side panels.

### Step 2: Rebalance the play layout around the board

**Goal:** Make the chessboard the clear primary focus.

**Files likely involved:**

- `src/components/chess/GameLayout.jsx`
- `src/components/chess/ChessBoardPanel.jsx`
- `src/components/chess/LiveEvaluationBar.jsx`
- `src/components/chess/GameControls.jsx`

**What to change:**

- Use a board-first layout.
- Keep the sidebar narrower and visually secondary.
- Put controls close to the board but avoid making them compete with the board.
- On mobile, stack side content below the board or collapse it behind tabs/drawers.

**Risk:**

- Existing sidebar content may overflow if max heights are not recalculated.

**How to test manually:**

- Start a game and confirm board, player bars, eval bar, controls, and move list all remain usable.
- Confirm the board stays centered and primary at normal browser zoom.

### Step 3: Make click and drag interaction consistent

**Goal:** Selection, hints, dragging, and move execution should feel predictable.

**Files likely involved:**

- `src/components/chess/ChessBoardPanel.jsx`
- `src/contexts/ChessGameContext.tsx`
- `src/components/chess/standardPieces.jsx`

**What to change:**

- Ensure drag begin selects the source square and shows legal moves.
- Ensure drop applies the move and clears state only after the move attempt.
- Ensure clicking a selected legal target performs the move.
- Ensure clicking an invalid square clears selection.
- Reduce expensive drag visuals from piece SVG filters/transitions.

**Risk:**

- `react-chessboard` callback semantics may differ across versions, so behavior must be manually verified.

**How to test manually:**

- Click `e2`, click `e4`.
- Drag `g1` to `f3`.
- Try illegal moves and confirm no stale hints remain.
- Try captures.
- Try moving while bot is thinking and confirm only invalid interactions are blocked.

### Step 4: Rework legal move hint rendering

**Goal:** Make hints subtle, readable, and non-chaotic.

**Files likely involved:**

- `src/hooks/useMoveHighlights.js`
- `src/contexts/ChessGameContext.tsx`
- `src/index.css`

**What to change:**

- Store legal move destinations as structured data.
- Render styles in `useMoveHighlights`.
- Use small centered dots for quiet moves.
- Use a thin ring for captures.
- Use a soft selected-square outline.
- Ensure checked king always wins visual priority.

**Risk:**

- Existing tests may expect `moveHints` to be style objects.

**How to test manually:**

- Select pawns, knights, bishops, and pieces with capture moves.
- Confirm hints do not cover pieces.
- Confirm last move and engine hints do not overpower selected/legal hints.

### Step 5: Simplify check and result state

**Goal:** Avoid noisy check UI and stale game-over messages.

**Files likely involved:**

- `src/components/ChessGameBoard.jsx`
- `src/contexts/ChessGameContext.tsx`
- `src/components/chess/PostGameReview.jsx`
- `src/components/chess/ResultModal.jsx`
- `src/components/chess/ReviewNavigator.jsx`
- `src/components/chess/GameInfoBar.jsx`

**What to change:**

- Do not show a popup/banner for check.
- Keep only checked king highlight and optional check sound.
- Use one live-game result flow.
- Suppress result transitions in analysis mode.
- Clear result state on new game, undo, review navigation, and exiting analysis where appropriate.
- Remove or consolidate unused result modal code.

**Risk:**

- There are multiple overlapping result-state flags, so cleanup must be careful.

**How to test manually:**

- Create a check position and confirm only the king highlight appears.
- Reach checkmate and confirm one result UI appears.
- Enter review, navigate moves, undo where allowed, and start a new game without stale messages.

### Step 6: Reduce bot status noise

**Goal:** Keep the UI focused while still communicating bot activity.

**Files likely involved:**

- `src/components/chess/GameInfoBar.jsx`
- `src/components/chess/PlayerBar.jsx`
- `src/components/AICoachPanel.jsx`
- `src/hooks/useBotMove.js`

**What to change:**

- Replace repeated "thinking" text with one subtle dot/spinner near the opponent or controls.
- Keep Ninh branding in player identity and coach areas.
- Avoid long status strings in the main play area.

**Risk:**

- Too little feedback can make users think the bot is stuck.

**How to test manually:**

- Make a move and confirm a small loading state appears while the bot is calculating.
- Confirm the indicator disappears after the bot moves.

### Step 7: Fix navbar authentication visibility

**Goal:** Make auth actions clear and reliable.

**Files likely involved:**

- `src/components/Navbar.jsx`
- `src/contexts/AuthContext.jsx`
- `src/pages/Login.jsx`
- `src/pages/Signup.jsx`

**What to change:**

- Show Login and Register on the right side when logged out.
- Show avatar/account/email area when logged in.
- Keep mobile auth actions inside the menu.
- If Supabase is not configured, route users to a graceful login/signup state instead of hiding auth actions completely.

**Risk:**

- If Supabase configuration is intentionally optional, the auth pages need clear disabled/error messaging.

**How to test manually:**

- Logged out desktop.
- Logged out mobile.
- Logged in desktop.
- Logged in mobile.
- Supabase configured and not configured.

### Step 8: Clean AI Coach presentation

**Goal:** Keep AI Coach useful without letting it compete with the board.

**Files likely involved:**

- `src/components/AICoachPanel.jsx`
- `src/components/chess/GameLayout.jsx`

**What to change:**

- Keep AI Coach inside a tab, drawer, or collapsible section.
- Reduce default empty-state copy.
- Replace long loading text with a compact indicator.
- Keep mascot/avatar and "Ninh lốp trưởng" identity.

**Risk:**

- Hiding coach too deeply could reduce discoverability.

**How to test manually:**

- Open coach tab.
- Ask for quick advice.
- Confirm board remains the visual focus.

### Step 9: Repository cleanup

**Goal:** Make the repo easier to navigate.

**Files likely involved:**

- Root markdown files
- Root manual test files
- `docs/`

**What to change:**

- Move hotfix summaries, audit reports, deployment notes, and progress summaries into `docs/dev-notes/`.
- Move manual tests into `docs/dev-notes/manual-tests/` or convert them into proper automated tests.
- Keep root limited to core project files.

**Risk:**

- Existing external links to root docs may break.

**How to test manually:**

- Confirm README remains in root.
- Confirm docs are still findable under `docs/`.
- Confirm build/test scripts do not depend on moved files.

### Step 10: Pin dependencies and verify

**Goal:** Reduce accidental breakage from future installs.

**Files likely involved:**

- `package.json`
- `package-lock.json`
- `README.md`

**What to change:**

- Replace `"latest"` with pinned versions or controlled ranges.
- Align README tech stack with actual versions.
- Run install/build/test after updating.

**Risk:**

- Pinning may expose current incompatibilities that were hidden by lockfile state.

**How to test manually:**

- Run `npm install`.
- Run `npm run build`.
- Run `npm test`.
- Smoke test `/play`.

## E. Acceptance criteria

- Desktop at 100% zoom: board is the primary visual focus and no longer feels oversized or crowded.
- Desktop at shorter heights: board still fits with player bars and core controls visible.
- Mobile: page uses the real device viewport and does not render as a scaled-down desktop layout.
- Mobile: board fits the screen width without horizontal scrolling.
- Click-to-select immediately shows legal move hints.
- Click-to-move and drag-to-move produce consistent results.
- Dragging feels responsive and not stiff.
- Legal hints are subtle dots/rings and do not cover pieces aggressively.
- Checked king is clearly highlighted.
- Check does not trigger a popup or noisy banner.
- Check sound plays at most once per checked position.
- Checkmate/result UI appears once for the live game.
- Result UI does not reappear stale during analysis mode, undo, redo, or move navigation.
- Bot move shows a small loading indicator only.
- Undo in bot games invalidates stale bot requests.
- Review previous/next navigation does not trigger new game-over UI.
- Login and Register are visible on desktop when logged out.
- Login and Register are visible on mobile when logged out.
- Logged-in users see an account/avatar area instead of login/register.
- AI Coach remains available but does not compete with the chessboard.
- "Ninh lốp trưởng" identity and mascot/avatar branding remain intact.
- `npm run build` passes.
- Relevant unit tests pass.

## F. Things to avoid

- Do not remove the "Ninh lốp trưởng" identity.
- Do not remove the mascot/avatar branding.
- Do not add new major features.
- Do not rewrite the whole app.
- Do not replace the chessboard library unless investigation proves it is necessary.
- Do not add more popups, banners, or status text.
- Do not make AI Coach the primary visual element.
- Do not make the UI more cluttered.
- Do not keep using `"latest"` for core dependencies.
- Do not mix legal move data and inline visual style objects across multiple files.
- Do not let analysis/review state mutate live-game result state.

