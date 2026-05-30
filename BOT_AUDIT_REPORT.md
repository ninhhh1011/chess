# Chess Bot Logic Audit Report
Date: 2026-05-30

## Executive Summary
This report audits all 5 identified issues in the chess bot logic and provides fixes.

---

## Issue 1: Stockfish Silent Fallback Detection (CRITICAL)

### Current State Analysis

**Files Reviewed:**
- `src/services/stockfishService.js` (lines 134-215, 280-300)
- `src/hooks/useBotMove.js` (lines 101-107, 114-117)
- `src/services/botService.js` (lines 67-91)

**Findings:**

✅ **GOOD**: Stockfish init detection exists
- `initEngine()` returns `true/false` based on worker init success
- `engineState` tracks: 'idle', 'loading', 'ready', 'analyzing', 'error'
- `getEngineState()` and `getStatus()` expose state to UI

✅ **GOOD**: Fallback is triggered correctly
- If worker fails, `disableEngineForCooldown()` is called
- Fallback engine (`analyzeFenFallback`) is used automatically
- Console warning logged: "Worker unavailable; using fallback temporarily"

❌ **BAD**: No visible UI indicator to user
- User has NO idea if Stockfish loaded or if they're playing against random bot
- `engineState` is exposed but NOT consumed by any UI component
- No status badge like "Engine: Stockfish" vs "Engine: Basic Mode"

❌ **BAD**: COEP headers may cause silent failures
- `vercel.json` sets `Cross-Origin-Embedder-Policy: require-corp`
- If Stockfish WASM fails to load due to CORS, user sees nothing
- `window.crossOriginIsolated` is logged but not checked before init

### Fix Required:

1. **Add UI status indicator** in `PlayerBar.jsx` or `ChessGameBoard.jsx`
2. **Expose engine status** from `ChessGameContext`
3. **Check `crossOriginIsolated`** before attempting Stockfish init
4. **Show toast/banner** when falling back to basic mode

---

## Issue 2: Race Condition on Game Reset (HIGH)

### Current State Analysis

**Files Reviewed:**
- `src/hooks/useBotMove.js` (lines 94-96, 109-112, 144-147)
- `src/contexts/ChessGameContext.tsx` (lines 113-156)

**Findings:**

✅ **GOOD**: Request ID cancellation exists
- `botRequestIdRef.current` is incremented on new game
- After async response, `currentRequestId !== botRequestIdRef.current` check exists (line 109, 144)

✅ **GOOD**: FEN snapshot is taken
- `const fen = currentGame.fen()` captured at request time (line 98)
- `makeMove()` receives `sourceFen: fen` option (line 155)

⚠️ **PARTIAL**: FEN validation in makeMove
- `ChessGameContext.makeMove()` receives `sourceFen` option (line 113)
- BUT: `sourceFen` check is commented out or removed in current code
- Line 146-154 in old code had:
  ```js
  if (byBot && sourceFen && gameToUse.fen() !== sourceFen) {
    return failMove('stale sourceFen', {...});
  }
  ```
- This check is MISSING in current `ChessGameContext.tsx`

### Fix Required:

1. **Re-add sourceFen validation** in `ChessGameContext.makeMove()`
2. Verify current FEN matches snapshot before executing bot move
3. Add test case: start game → bot requests move → user clicks "New Game" → verify bot move is discarded

---

## Issue 3: Low ELO Bot Pure Random (MEDIUM)

### Current State Analysis

**Files Reviewed:**
- `src/data/botLevels.js` (lines 1-60)
- `src/services/heuristicBotEngine.js` (lines 67-107)
- `src/services/botService.js` (lines 44-65)

**Findings:**

❌ **BAD**: Low ELO uses pure random with high probability
- 400 ELO: `randomChance: 0.25` (25% pure random)
- 800 ELO: `randomChance: 0.12` (12% pure random)
- When random triggers, `getSafeFallbackMove()` with `botElo <= 800` returns pure random move (line 80-84)

❌ **BAD**: Pure random has no chess logic
- `heuristicBotEngine.js` line 80-84: picks random legal move
- No capture preference, no checkmate awareness, no development
- This is WORSE than any real beginner

✅ **GOOD**: Stockfish Skill Level is used for non-random moves
- 400 ELO: `skillLevel: 0`
- 800 ELO: `skillLevel: 2`
- 1200 ELO: `skillLevel: 6`
- But these are overridden by `randomChance`

### Fix Required:

1. **Remove `randomChance` for 400-800 ELO**
2. **Always use Stockfish** with appropriate Skill Level
3. **Improve Skill Level mapping**:
   - 400 ELO → Skill Level 0, depth 1
   - 800 ELO → Skill Level 2, depth 2
   - Keep heuristic fallback only as emergency backup (not primary strategy)

---

## Issue 4: No Artificial Delay for Low ELO (LOW)

### Current State Analysis

**Files Reviewed:**
- `src/hooks/useBotMove.js` (lines 90-100)
- `src/services/botService.js` (lines 44-77)

**Findings:**

❌ **BAD**: No minimum thinking delay
- Bot move executes immediately after `getBotMove()` resolves
- Low ELO random moves return in <100ms
- High ELO Stockfish takes 700-2500ms (based on `movetime` config)
- This creates backwards UX: "dumb" bot is instant, "smart" bot thinks

❌ **BAD**: No randomized delay for human feel
- All moves at same ELO have same delay
- Real humans have variable thinking time

### Fix Required:

1. **Add minimum delay** of 400-1200ms for ALL bot moves
2. **Randomize delay**: `Math.random() * 800 + 400`
3. **Apply delay AFTER** `getBotMove()` resolves, before `makeMove()`
4. Ensure "Bot is thinking..." indicator shows for at least this duration

---

## Issue 5: Stockfish Skill Level Mapping (MEDIUM)

### Current State Analysis

**Files Reviewed:**
- `src/data/botLevels.js` (lines 1-60)
- `src/services/stockfishService.js` (lines 280-300)

**Findings:**

✅ **GOOD**: Skill Level is sent correctly
- `configureEngineForElo()` sends `setoption name Skill Level value X`
- UCI_LimitStrength and UCI_Elo are also sent

⚠️ **PARTIAL**: Mapping may not be optimal
- Current mapping:
  - 400 ELO → Skill 0, depth 1, movetime 100ms
  - 800 ELO → Skill 2, depth 2, movetime 200ms
  - 1200 ELO → Skill 6, depth 5, movetime 700ms
  - 1600 ELO → Skill 10, depth 8, movetime 1200ms
  - 2000 ELO → Skill 15, depth 11, movetime 1800ms
  - 2400 ELO → Skill 20, depth 14, movetime 2500ms

⚠️ **CONCERN**: Both Skill Level AND UCI_Elo are set
- Line 284-292: Sets both `Skill Level` and `UCI_Elo`
- These may conflict or override each other
- Stockfish documentation recommends using UCI_LimitStrength + UCI_Elo for ELO-based weakening

### Fix Required:

1. **Choose one weakening method**:
   - Option A: Use only `UCI_LimitStrength + UCI_Elo` (more accurate for ELO matching)
   - Option B: Use only `Skill Level` (simpler, but less precise)
2. **Recommended**: Use UCI_Elo for better ELO accuracy
3. **Adjust depth/movetime** to match ELO expectations

---

## Summary of Fixes Needed

| Issue | Priority | Status | Fix Complexity |
|-------|----------|--------|----------------|
| Issue 1: Silent fallback | CRITICAL | ❌ Needs UI | Medium |
| Issue 2: Race condition | HIGH | ⚠️ Partial | Low |
| Issue 3: Pure random bot | MEDIUM | ❌ Bad UX | Medium |
| Issue 4: No delay | LOW | ❌ Missing | Low |
| Issue 5: Skill mapping | MEDIUM | ⚠️ Suboptimal | Low |

---

## Next Steps

1. Fix Issue 2 (race condition) - add sourceFen validation
2. Fix Issue 4 (artificial delay) - add randomized thinking time
3. Fix Issue 3 (pure random) - remove randomChance, always use Stockfish
4. Fix Issue 5 (skill mapping) - use UCI_Elo only
5. Fix Issue 1 (UI indicator) - add engine status badge

Total estimated time: 2-3 hours
