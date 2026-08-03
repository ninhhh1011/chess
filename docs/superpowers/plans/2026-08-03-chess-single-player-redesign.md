# Chess Single-player Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current Chess repository into a bot-only Vietnamese learning product with safe optional auth/Coach behavior, consistent engine evaluation, correct promotion, and a coherent accessible UI.

**Architecture:** Preserve the current React/Vite, `chess.js`, `react-chessboard`, Stockfish worker, and local-progress architecture. Remove multiplayer at its routes and shared mode state, normalize engine output once at the service boundary, and reuse the existing game components while applying the approved Chess design system.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 3, chess.js 1.4, react-chessboard 5, Supabase auth/profile sync, Vitest 4, GitHub Actions Node 22.

---

## Milestone A — Single-player core and safety

### Task 1: Remove online and local multiplayer

**Files:**
- Create: `src/App.singlePlayer.test.js`
- Modify: `src/App.jsx`
- Modify: `src/pages/Home.jsx`
- Modify: `src/contexts/ChessGameContext.tsx`
- Modify: `src/components/chess/BotSettings.jsx`
- Delete: `src/pages/OnlinePlay.jsx`
- Delete: `src/services/onlineGameService.js`
- Delete: `supabase/migrations/20260529000000_online_games.sql`
- Modify: `README.md`

- [ ] **Step 1: Write a failing source-level regression test**

```js
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('single-player product boundary', () => {
  it('does not expose online routes or CTAs', () => {
    expect(read('./App.jsx')).not.toMatch(/OnlinePlay|\/play\/online/);
    expect(read('./pages/Home.jsx')).not.toMatch(/Chơi Online|createGame|onlineGameService/);
  });

  it('does not expose a local multiplayer mode', () => {
    expect(read('./contexts/ChessGameContext.tsx')).not.toMatch(/LOCAL:\s*'local'/);
    expect(read('./components/chess/BotSettings.jsx')).not.toMatch(/2 người chơi|game-mode/);
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails for the existing route and controls**

Run: `npm.cmd run test -- src/App.singlePlayer.test.js`

Expected: FAIL with matches for `OnlinePlay`, `/play/online`, or `LOCAL`.

- [ ] **Step 3: Delete the online page/service/migration and remove every caller**

Keep only the `/play` route, remove Home online state/handler/imports, reduce `GAME_MODES` to:

```ts
const GAME_MODES = { BOT: 'bot' } as const;
```

Remove the mode selector from `BotSettings`; keep only player color and bot level. Remove unreachable non-bot branches only after checking their callers with:

Run: `rg -n "OnlinePlay|onlineGameService|play/online|GAME_MODES\.LOCAL|2 người chơi|online_games" src supabase README.md`

Expected after edits: no matches.

- [ ] **Step 4: Run focused and full tests**

Run: `npm.cmd run test -- src/App.singlePlayer.test.js src/contexts/ChessGameContext.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit the removal**

```bash
git add src/App.jsx src/pages/Home.jsx src/contexts/ChessGameContext.tsx src/components/chess/BotSettings.jsx src/App.singlePlayer.test.js README.md
git add -u src/pages/OnlinePlay.jsx src/services/onlineGameService.js supabase/migrations/20260529000000_online_games.sql
git commit -m "refactor: remove multiplayer flows"
```

### Task 2: Fix auth hook and promise handling

**Files:**
- Create: `src/pages/Auth.test.jsx`
- Modify: `src/pages/Login.jsx`
- Modify: `src/pages/Signup.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/pages/Training.jsx`
- Delete: `src/services/authService.js`

- [ ] **Step 1: Write failing login, signup, and logout tests**

Mock `useAuth` and render pages inside `MemoryRouter`. The key assertions are:

```jsx
expect(signIn).toHaveBeenCalledWith({ email: 'learner@example.com', password: 'secret1' });
expect(signUp).toHaveBeenCalledWith({
  email: 'learner@example.com',
  password: 'secret1',
  displayName: 'Nguyễn An',
});
expect(signOut).toHaveBeenCalledTimes(1);
```

Also render authenticated `Login` and assert the router reaches the destination through `<Navigate replace>` without calling navigation during render.

- [ ] **Step 2: Run the tests and verify the current auth service fails**

Run: `npm.cmd run test -- src/pages/Auth.test.jsx`

Expected: FAIL because plain service functions invoke `useAuth` and do not await context methods.

- [ ] **Step 3: Call auth context methods directly**

Use this handler shape in Login and the equivalent in Signup:

```jsx
const { isAuthenticated, signIn } = useAuth();
if (isAuthenticated) return <Navigate to={from} replace />;

async function handleSubmit(event) {
  event.preventDefault();
  setLoading(true);
  const { error } = await signIn({ email, password });
  if (error) setError(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
  else navigate(from, { replace: true });
  setLoading(false);
}
```

Use `const { signOut } = useAuth()` in Navbar and Training and await `signOut()`. Delete `authService.js` after `rg -n "authService|signInWithEmail|signUpWithEmail|signOutUser" src` has no callers.

- [ ] **Step 4: Verify auth and guest behavior**

Run: `npm.cmd run test -- src/pages/Auth.test.jsx src/contexts/ChessGameContext.test.jsx`

Expected: PASS with no Invalid Hook Call.

- [ ] **Step 5: Commit the auth fix**

```bash
git add src/pages/Auth.test.jsx src/pages/Login.jsx src/pages/Signup.jsx src/components/Navbar.jsx src/pages/Training.jsx
git add -u src/services/authService.js
git commit -m "fix: use auth context at component boundary"
```

### Task 3: Make promotion selection atomic

**Files:**
- Modify: `src/contexts/ChessGameContext.tsx`
- Modify: `src/contexts/ChessGameContext.test.jsx`
- Modify: `src/components/chess/ChessBoardPanel.jsx`
- Modify: `src/components/chess/PromotionModal.jsx`

- [ ] **Step 1: Add failing context tests for pending promotion and all four pieces**

Drive the context through legal moves until a pawn reaches the last rank. Call `makeMove(from, to)` without a promotion and assert:

```jsx
expect(pendingPromotion).toEqual({ from, to, color: 'w' });
expect(game.fen()).toBe(beforeFen);
```

Then repeat with `q`, `r`, `b`, and `n` selected and assert `game.get(to).type` equals the selected piece. Add a cancel action that calls `setPendingPromotion(null)` and assert the FEN is unchanged.

- [ ] **Step 2: Run the tests and verify auto-queen behavior fails them**

Run: `npm.cmd run test -- src/contexts/ChessGameContext.test.jsx`

Expected: FAIL because `makeMove` defaults promotion to `q`.

- [ ] **Step 3: Move promotion interception into `makeMove`**

Change the signature and promotion branch to:

```ts
function makeMove(from, to, promotion?: 'q' | 'r' | 'b' | 'n', options = {}) {
  const piece = gameToUse.get(from);
  const isPromotion = piece?.type === 'p' &&
    ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

  if (isPromotion && !promotion && !options.byBot) {
    setPendingPromotion({ from, to, color: piece.color });
    return { pendingPromotion: true };
  }
```

Pass `promotion` unchanged to chess.js. Remove every `makeMove(..., 'q')` shortcut from player click/drop paths; the bot may still pass its chosen/default promotion explicitly. Clear pending promotion after a successful selection and during `newGame`.

- [ ] **Step 4: Add dialog behavior**

Give `PromotionModal` `role="dialog"`, `aria-modal="true"`, a labelled heading, Escape cancellation, initial focus on Queen, focus containment, and return focus to the board trigger after close.

- [ ] **Step 5: Run promotion and complete chess tests**

Run: `npm.cmd run test -- src/contexts/ChessGameContext.test.jsx`

Expected: PASS for Queen, Rook, Bishop, Knight, and cancel.

- [ ] **Step 6: Commit promotion behavior**

```bash
git add src/contexts/ChessGameContext.tsx src/contexts/ChessGameContext.test.jsx src/components/chess/ChessBoardPanel.jsx src/components/chess/PromotionModal.jsx
git commit -m "fix: require explicit promotion selection"
```

### Task 4: Normalize every engine score to White POV

**Files:**
- Modify: `src/utils/chessMoveUtils.js`
- Modify: `src/utils/chessMoveUtils.test.js`
- Modify: `src/services/stockfishService.js`
- Modify: `src/components/chess/LiveEvaluationBar.jsx`
- Modify: `src/utils/moveQuality.js`
- Modify: `src/utils/moveQuality.test.js`
- Modify: `src/components/ChessGameBoard.jsx`
- Create: `src/services/stockfishService.test.js`

- [ ] **Step 1: Write failing perspective and move-loss tests**

```js
expect(toWhiteEvaluation({ type: 'cp', value: 80 }, `${placement} w - - 0 1`).value).toBe(80);
expect(toWhiteEvaluation({ type: 'cp', value: 80 }, `${placement} b - - 0 1`).value).toBe(-80);
expect(toWhiteEvaluation({ type: 'mate', value: 3 }, `${placement} b - - 0 1`).value).toBe(-3);

const result = classifyMoveLoss(
  { type: 'cp', value: -20 },
  { type: 'cp', value: 180 },
  'b'
);
expect(result.type).toBe('blunder');
```

Add a regression where a sound Black move does not become a blunder solely because the side to move changes.

Mock an unavailable Worker and assert fallback analysis returns `perspective: 'white'`, `source` beginning with `fallback`, a legal best move, and `evaluation: null`.

- [ ] **Step 2: Run tests and verify inconsistent perspective fails**

Run: `npm.cmd run test -- src/utils/chessMoveUtils.test.js src/utils/moveQuality.test.js`

Expected: FAIL because no shared White POV normalizer exists and move loss uses absolute delta.

- [ ] **Step 3: Add one normalization utility**

```js
export function toWhiteEvaluation(evaluation, fen) {
  if (!evaluation) return null;
  const sign = fen?.split(' ')[1] === 'b' ? -1 : 1;
  const value = (Number(evaluation.value) || 0) * sign;
  return {
    ...evaluation,
    value,
    display: evaluation.type === 'mate'
      ? `M${value}`
      : `${value >= 0 ? '+' : ''}${(value / 100).toFixed(2)}`,
  };
}
```

Apply it to Stockfish results before `finish`, add `perspective: 'white'` to every Stockfish/fallback/no-move result, and do not fabricate an evaluation for heuristic fallback.

- [ ] **Step 4: Remove view-level turn flipping and use mover-aware loss**

`LiveEvaluationBar` reads the normalized value directly. Change `classifyMoveLoss(before, after, color)` to compute both values from the mover’s perspective and use `Math.max(0, beforeForMover - afterForMover)`. Pass `played.color` from game review.

- [ ] **Step 5: Run focused and full engine tests**

Run: `npm.cmd run test -- src/utils/chessMoveUtils.test.js src/utils/moveQuality.test.js src/services/stockfishService.test.js src/hooks/useEngineAnalysis.test.js`

Expected: PASS.

- [ ] **Step 6: Commit evaluation normalization**

```bash
git add src/utils/chessMoveUtils.js src/utils/chessMoveUtils.test.js src/services/stockfishService.js src/services/stockfishService.test.js src/components/chess/LiveEvaluationBar.jsx src/utils/moveQuality.js src/utils/moveQuality.test.js src/components/ChessGameBoard.jsx
git commit -m "fix: normalize engine evaluation to white pov"
```

### Task 4A: Lock special chess rules and bot race behavior

**Files:**
- Modify: `src/contexts/ChessGameContext.test.jsx`
- Modify: `src/hooks/useBotMove.test.js`

- [ ] **Step 1: Add integration regressions for chess.js-backed rules**

Drive moves through the context harness and assert:

```js
expect(castledGame.get('g1')?.type).toBe('k');
expect(castledGame.get('f1')?.type).toBe('r');
expect(enPassantGame.get('d6')?.type).toBe('p');
expect(enPassantGame.get('d5')).toBeUndefined();
expect(checkmateGame.isCheckmate()).toBe(true);
expect(drawGame.isDraw()).toBe(true);
```

Use legal move sequences and the real context `makeMove`; do not reimplement chess rules.

- [ ] **Step 2: Add Black-player and undo-during-bot tests**

Start a bot game with `PLAYER_COLORS.BLACK` and assert the bot opens as White before the player can move. Start a bot request, call `undoMove`, resolve the stale request, and assert its move is rejected because the request id/source FEN was invalidated.

- [ ] **Step 3: Run the focused race/rules tests**

Run: `npm.cmd run test -- src/contexts/ChessGameContext.test.jsx src/hooks/useBotMove.test.js`

Expected: all special-rule and stale-request assertions pass; if a new assertion fails, make the minimum context/hook fix before continuing.

- [ ] **Step 4: Commit the regressions and any root-cause fix**

```bash
git add src/contexts/ChessGameContext.test.jsx src/hooks/useBotMove.test.js src/contexts/ChessGameContext.tsx src/hooks/useBotMove.js
git commit -m "test: cover chess rules and bot races"
```

### Task 5: Disable AI Coach by default and remove fake AI fallback

**Files:**
- Create: `src/services/aiCoachApiService.test.js`
- Create: `api/coach.test.js`
- Modify: `src/services/aiCoachApiService.js`
- Modify: `src/components/AICoachPanel.jsx`
- Modify: `api/coach.js`
- Modify: `.env.example`
- Delete: `src/services/mockCoachService.js`
- Delete: `src/services/coachApi.js`

- [ ] **Step 1: Write failing client feature-flag tests**

Stub the flag as disabled, call `askAICoach`, and assert:

```js
expect(fetch).not.toHaveBeenCalled();
expect(result).toEqual({ available: false, reply: null, source: 'disabled' });
```

When enabled and the API fails, assert the result is `source: 'error'` with no mock reply.

- [ ] **Step 2: Write failing endpoint boundary tests**

Assert the endpoint returns 404 when `AI_COACH_ENABLED !== 'true'`, 405 for non-POST requests, 400 for invalid FEN/body shape, 413 for message over 500 characters or PGN over 5,000 characters, and a generic 502 response when the provider fails.

- [ ] **Step 3: Run tests and observe fake fallback and unsafe endpoint failures**

Run: `npm.cmd run test -- src/services/aiCoachApiService.test.js api/coach.test.js`

Expected: FAIL because the client calls the endpoint unconditionally and the endpoint exposes raw errors.

- [ ] **Step 4: Implement the disabled-by-default boundary**

Client:

```js
const coachEnabled = import.meta.env.VITE_AI_COACH_ENABLED === 'true';
if (!coachEnabled) return { available: false, reply: null, source: 'disabled' };
```

Server:

```js
if (process.env.AI_COACH_ENABLED !== 'true') {
  return Response.json({ error: 'Not found' }, { status: 404 });
}
```

Validate the JSON fields and limits before reading the provider key. Log provider failures server-side and return `{ error: 'Coach temporarily unavailable' }` without raw details. Keep a 20-second client abort and a bounded provider output.

- [ ] **Step 5: Render an honest unavailable state**

When the client flag is off, `AICoachPanel` renders “AI Coach chưa được cấu hình” and disables the prompt controls. Delete mock service imports and files after caller search is empty.

- [ ] **Step 6: Document flags without secrets**

Add only:

```dotenv
VITE_AI_COACH_ENABLED=false
AI_COACH_ENABLED=false
CLAUDE_API_KEY=
```

- [ ] **Step 7: Verify and commit Coach safety**

Run: `npm.cmd run test -- src/services/aiCoachApiService.test.js api/coach.test.js`

Expected: PASS.

```bash
git add src/services/aiCoachApiService.js src/services/aiCoachApiService.test.js src/components/AICoachPanel.jsx api/coach.js api/coach.test.js .env.example
git add -u src/services/mockCoachService.js src/services/coachApi.js
git commit -m "fix: gate ai coach behind safe feature flag"
```

### Task 6: Move CI to Node 22

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

- [ ] **Step 1: Pin the supported runtime**

Add:

```json
"engines": { "node": ">=22 <23" }
```

Change the workflow setup step to `node-version: '22.x'` and rename it to `Use Node.js 22.x`.

- [ ] **Step 2: Verify workflow commands remain ordered**

Run: `rg -n "node-version|npm ci|npm run lint|npm run test|npm run build" .github/workflows/ci.yml package.json`

Expected: Node 22 and the required four commands.

- [ ] **Step 3: Commit CI runtime**

```bash
git add .github/workflows/ci.yml package.json package-lock.json
git commit -m "ci: use node 22"
```

## Milestone B — Design system, shell, Home, and Play

### Task 7: Replace DESIGN.md with the Chess source of truth

**Files:**
- Modify: `DESIGN.md`
- Do not modify: `lab029s-demo.pages.dev-DESIGN.md`

- [ ] **Step 1: Rewrite the design document from the approved tokens and flows**

Include all 25 required sections from product principles through Do/Don't examples. Use the approved palette (`#F4F5F2`, `#FFFFFF`, `#17201A`, `#284B3B`, `#C58B37`, board colors), Inter, the spacing/radius/shadow scales, semantic evaluation/move-quality colors, 360/390/768/1024/1440 responsive rules, modal accessibility, Vietnamese copy rules, and text-first control policy.

- [ ] **Step 2: Verify required headings and Lab file integrity**

Run: `rg -n "Product design principles|Brand personality|Color tokens|Typography|Spacing|Radius|Shadow|Border|Grid|Header|Navigation|Buttons|Cards|Form controls|Tabs|Modal|Toast|Loading|Chessboard|Evaluation|Move-quality|Responsive|Accessibility|Vietnamese|Do/Don't" DESIGN.md`

Run: `git diff --exit-code -- lab029s-demo.pages.dev-DESIGN.md`

Expected: every topic found; reference file unchanged.

- [ ] **Step 3: Commit the source of truth**

```bash
git add DESIGN.md
git commit -m "docs: define chess design system"
```

### Task 8: Implement tokens and redesign the app shell

**Files:**
- Create: `src/components/Navbar.test.jsx`
- Modify: `src/index.css`
- Modify: `tailwind.config.js`
- Modify: `src/components/Layout.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/config/brand.js`

- [ ] **Step 1: Write failing navigation tests**

Assert the six labels are `Trang chủ`, `Chơi với bot`, `Học cờ`, `Bài tập`, `Khai cuộc`, `Tiến độ`; auth buttons are visually secondary; the mobile control has `aria-label="Mở menu"`, `aria-expanded`, and closes with Escape.

- [ ] **Step 2: Run the navigation test**

Run: `npm.cmd run test -- src/components/Navbar.test.jsx`

Expected: FAIL for current labels and `Mo menu`.

- [ ] **Step 3: Replace global tokens and remove conflicting dark/gradient defaults**

Define CSS variables directly from `DESIGN.md`, set the body to the light canvas, preserve visible focus, and keep the responsive `.chess-board-container`. Keep `.btn-primary`, `.btn-secondary`, `.ui-card`, `.ui-input`, `.ui-select`, and `.ui-tab` as the small shared class surface; delete unused aliases only after `rg` confirms no callers.

- [ ] **Step 4: Redesign desktop and mobile navigation**

Use semantic `<header>` and `<nav>`, a real list of links, one compact auth area, minimum 44px mobile targets, Escape close, and focus return. Retain the website name and `avatarcoach.webp`; replace humorous brand/copy constants with professional Vietnamese wording.

- [ ] **Step 5: Verify and commit shell**

Run: `npm.cmd run test -- src/components/Navbar.test.jsx`

Expected: PASS.

```bash
git add src/components/Navbar.test.jsx src/index.css tailwind.config.js src/components/Layout.jsx src/components/Navbar.jsx src/config/brand.js
git commit -m "feat: apply chess app shell design"
```

### Task 9: Redesign Home around real progress and a real board preview

**Files:**
- Create: `src/pages/Home.test.jsx`
- Modify: `src/pages/Home.jsx`

- [ ] **Step 1: Write failing Home behavior tests**

Assert the primary/secondary CTAs are `Chơi với Ninh Bot` and `Luyện bài tập`; the page renders a disabled `Chessboard`; progress is absent for the default empty profile and present for a profile with real activity; recommendations include a deterministic reason and do not claim AI personalization.

- [ ] **Step 2: Run the test and observe the old 64-div preview and fake-facing copy**

Run: `npm.cmd run test -- src/pages/Home.test.jsx`

Expected: FAIL.

- [ ] **Step 3: Implement the approved Home flow**

Use `react-chessboard` with `allowDragging: false`, the shared board colors, and an accessible preview label. Render exactly four activity cards. Compute `hasProgress` from games, completed lessons/exercises, or opening attempts before rendering Continue Learning. Reuse `getRecommendedLessons`/`getRecommendedExercises`; show their existing `reason` text.

- [ ] **Step 4: Verify and commit Home**

Run: `npm.cmd run test -- src/pages/Home.test.jsx`

Expected: PASS.

```bash
git add src/pages/Home.jsx src/pages/Home.test.jsx
git commit -m "feat: redesign home for single-player learning"
```

### Task 10: Redesign bot lobby and Play layout

**Files:**
- Create: `src/components/chess/PlayFlow.test.jsx`
- Modify: `src/components/chess/PreGameLobby.jsx`
- Modify: `src/components/chess/GameLayout.jsx`
- Modify: `src/components/chess/GameControls.jsx`
- Modify: `src/components/chess/PlayerBar.jsx`
- Modify: `src/components/chess/ChessBoardPanel.jsx`
- Modify: `src/components/chess/LiveEvaluationBar.jsx`
- Modify: `src/components/chess/MoveHistory.jsx`
- Modify: `src/components/chess/PostGameReview.jsx`
- Modify: `src/components/chess/ReviewNavigator.jsx`

- [ ] **Step 1: Write failing structural Play tests**

Assert the lobby has bot level, player color, training goal, and local time control only. Assert DOM order is status, opponent, board, player, controls, tabs. Assert tabs are `Nước đi`, `Phân tích`, `Coach`, `Cài đặt` and the board has an accessible label.

- [ ] **Step 2: Run focused tests**

Run: `npm.cmd run test -- src/components/chess/PlayFlow.test.jsx src/hooks/useBotMove.test.js`

Expected: FAIL for current wording/order or hidden controls.

- [ ] **Step 3: Implement the approved responsive structure**

Keep `GameLayout` as the single composition root. On desktop use a board-first grid plus 320–348px sidebar. On mobile keep the sidebar in normal flow after controls. Keep evaluation adjacent to the board and ensure the board wrapper is `min-width: 0`, `width: 100%`, and `aspect-ratio: 1` with no width larger than the viewport.

- [ ] **Step 4: Remove humorous copy and unsupported lobby options**

Replace “gáy”, “quay xe”, “tự hủy”, and similar text with professional move/control labels. Do not render disabled “sắp có” clock options as selectable features; keep only the implemented unlimited local control until clocks exist.

- [ ] **Step 5: Verify Play behavior**

Run: `npm.cmd run test -- src/components/chess/PlayFlow.test.jsx src/contexts/ChessGameContext.test.jsx src/hooks/useBotMove.test.js src/utils/moveQuality.test.js`

Expected: PASS.

- [ ] **Step 6: Commit Play redesign**

```bash
git add src/components/chess src/components/chess/PlayFlow.test.jsx
git commit -m "feat: redesign bot play experience"
```

## Milestone C — Learning pages, accessibility, and cleanup

### Task 11: Add only the shared learning-page primitives that remove duplication

**Files:**
- Create: `src/components/PageHeader.jsx`
- Create: `src/components/StatePanel.jsx`
- Create: `src/components/ProgressBar.jsx`
- Create: `src/components/DifficultyBadge.jsx`
- Create: `src/components/LearningComponents.test.jsx`
- Modify: `src/components/LessonCard.jsx`
- Modify: `src/components/openings/OpeningCard.jsx`
- Modify: `src/components/openings/OpeningProgress.jsx`

- [ ] **Step 1: Create a small shared-component test**

Render each component and assert semantic heading levels, labelled progress (`aria-valuenow`), readable difficulty text, and loading/empty/error state roles.

- [ ] **Step 2: Implement the four primitives with no new dependency**

`PageHeader` owns title/description/actions; `StatePanel` owns `status` and message; `ProgressBar` wraps native ARIA progress semantics; `DifficultyBadge` maps existing difficulty values to label plus color. Keep activity-specific cards separate.

- [ ] **Step 3: Verify components**

Run: `npm.cmd run test -- src/components/LearningComponents.test.jsx`

Expected: PASS.

- [ ] **Step 4: Commit primitives**

```bash
git add src/components/PageHeader.jsx src/components/StatePanel.jsx src/components/ProgressBar.jsx src/components/DifficultyBadge.jsx src/components/LearningComponents.test.jsx src/components/LessonCard.jsx src/components/openings/OpeningCard.jsx src/components/openings/OpeningProgress.jsx
git commit -m "feat: unify learning page components"
```

### Task 12: Align Learn, Exercises, Openings, and Progress

**Files:**
- Create: `src/pages/LearningPages.test.jsx`
- Modify: `src/pages/Learn.jsx`
- Modify: `src/pages/Exercises.jsx`
- Modify: `src/pages/Openings.jsx`
- Modify: `src/pages/OpeningDetail.jsx`
- Modify: `src/pages/Training.jsx`
- Modify: `src/components/ExerciseBoard.jsx`
- Modify: `src/components/openings/OpeningCoachPanel.jsx`
- Modify: `src/components/openings/OpeningMoveList.jsx`
- Modify: `src/components/openings/OpeningTrainerBoard.jsx`

- [ ] **Step 1: Write page-level state and copy tests**

Assert every catalogue page uses the shared header, readable filter controls, real progress, and an explicit empty/loading/error state. Assert no console logging or humorous copy is emitted. Assert Progress renders the actual daily-plan shape (`lesson`, `exercises`, `opening`, `challenge`) rather than nonexistent `tasks`.

- [ ] **Step 2: Run tests and expose the Training plan-shape bug**

Run: `npm.cmd run test -- src/pages/LearningPages.test.jsx`

Expected: FAIL because Training currently reads `dailyTrainingPlan.tasks`.

- [ ] **Step 3: Refactor pages to the shared patterns**

Preserve existing data and interactions. Use semantic lists for cards, labelled filter groups, and the same board treatment. Remove mount/debug logs. Do not add mock progress or new content datasets.

- [ ] **Step 4: Verify and commit learning pages**

Run: `npm.cmd run test -- src/pages/LearningPages.test.jsx`

Expected: PASS.

```bash
git add src/pages src/components/ExerciseBoard.jsx src/components/openings src/components/training
git commit -m "feat: align learning and progress pages"
```

### Task 13: Accessibility, dead-code, and documentation cleanup

**Files:**
- Modify: `src/components/Navbar.jsx`
- Modify: `src/components/chess/PromotionModal.jsx`
- Modify: `src/components/chess/PostGameReview.jsx`
- Modify: `README.md`
- Delete: `src/components/chess/AnalysisControls.jsx`
- Delete: `src/components/chess/BotInfoPanel.jsx`
- Delete: `src/components/chess/CheckWarning.jsx`
- Delete: `src/components/chess/GameStatusBanner.jsx`
- Delete: `src/components/chess/PlayerInfoBar.jsx`
- Delete: `src/components/chess/ResultModal.jsx`
- Delete: `src/components/StatusBadge.jsx`
- Delete: `src/hooks/useStockfishWorker.js`
- Delete: `src/examples/StockfishWorkerIntegration.jsx`
- Delete: `public/stockfish-worker-v2.js`
- Delete: `src/utils/randomBot.js`

- [ ] **Step 1: Find all cleanup targets before deletion**

Run:

```powershell
rg -n "FIX BUG|NEW:|console\.(log|warn|error)|gáy|quay xe|tự hủy|online|2 người chơi|Mo menu" src api server README.md supabase
```

Before deletion, repeat caller checks for `AnalysisControls`, `BotInfoPanel`, `CheckWarning`, `GameStatusBanner`, `PlayerInfoBar`, `ResultModal`, `StatusBadge`, `useStockfishWorker`, `StockfishWorkerIntegration`, and `randomBot`. Delete only entries with no live caller; if a caller remains after prior tasks, retain that file and record why.

- [ ] **Step 2: Complete keyboard and dialog behavior**

Verify every interactive control has a visible focus state and 44px mobile target. Promotion and result/review dialogs close with Escape when safe, contain focus, restore focus, and expose Vietnamese accessible names. Do not rely on color alone for move quality or errors.

- [ ] **Step 3: Update README to the shipped product**

Document bot-only scope, guest access, optional Supabase sync, Stockfish/fallback source labels, disabled-by-default Coach flags, Node 22, and the exact local commands. Remove experimental-online and mock-Coach claims.

- [ ] **Step 4: Run source-boundary checks**

Run: `rg -n -i "play/online|onlineGameService|online_games|Chơi Online|2 người chơi|invite link|waiting opponent|GAME_MODES\.LOCAL" src api server supabase README.md`

Expected: no matches.

- [ ] **Step 5: Commit cleanup**

```bash
git add -A src api server supabase README.md public/stockfish-worker-v2.js
git commit -m "chore: remove dead code and finish accessibility"
```

### Task 14: Final verification and acceptance audit

**Files:**
- Verify only; if a command exposes a regression, add a focused failing test and a named follow-up task before editing production code

- [ ] **Step 1: Install exactly from lockfile on Node 22**

Run: `node --version`

Expected: `v22.x.x`. If Node 22 is unavailable, report that acceptance item as unverified rather than claiming success.

Run: `npm.cmd ci`

Expected: exit 0.

- [ ] **Step 2: Run required automation**

Run: `npm.cmd run lint`

Expected: exit 0 with zero warnings.

Run: `npm.cmd run test`

Expected: all test files pass, including auth, promotion, special chess rules, bot color/undo, evaluation, fallback, and multiplayer absence.

Run: `npm.cmd run build`

Expected: production build succeeds without online route chunks.

- [ ] **Step 3: Verify responsive layouts manually**

Start: `npm.cmd run dev -- --host 127.0.0.1`

Inspect Home, Play lobby, active Play, Learn, Exercises, Openings, Progress, Login, Signup, promotion, and error/empty states at 360, 390, 768, 1024, and 1440px. Confirm no horizontal scroll, board fit, correct mobile Play order, keyboard navigation, visible focus, and dialog Escape/focus behavior.

- [ ] **Step 4: Audit every acceptance criterion**

Check each box in `REDESIGN_PLAN.md` only with test, source, or visual evidence. Record any unmet item in the final handoff and do not use “production-ready” while any required item remains open.

- [ ] **Step 5: Review the final diff and commit verification fixes**

Run: `git diff --check`

Run: `git status --short`

Expected: only intentional changes; `lab029s-demo.pages.dev-DESIGN.md` remains untouched.

If verification required tracked-file fixes, stage only those named tracked files with `git add -u` and commit them. Never stage `.superpowers/` or the untracked Lab029s reference file.
