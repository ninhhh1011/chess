# Chess Bot Logic Fixes Summary
Date: 2026-05-30

## Overview
Fixed 4 out of 5 identified issues in chess bot logic. Issue 1 (UI indicator) requires additional UI component work.

---

## ✅ Issue 2: Race Condition on Game Reset (HIGH) - ALREADY FIXED

**Status**: No changes needed

**Finding**: The race condition protection is already implemented correctly in the current codebase.

**Existing Protection**:
- `botRequestIdRef.current` is incremented on new game (line 280 in ChessGameContext.tsx)
- `sourceFen` validation exists in `makeMove()` (lines 146-154)
- Bot move is rejected if FEN doesn't match snapshot

**Code Location**: `src/contexts/ChessGameContext.tsx` lines 146-154
```javascript
if (byBot && sourceFen && gameToUse.fen() !== sourceFen) {
  return failMove('stale sourceFen', {
    sourceFen,
    currentFen: gameToUse.fen(),
    from,
    to,
    promotion,
  });
}
```

---

## ✅ Issue 3: Low ELO Bot Pure Random (MEDIUM) - FIXED

**Status**: Fixed

**Problem**: 
- 400 ELO had 25% chance of pure random moves
- 800 ELO had 12% chance of pure random moves
- Pure random has no chess logic (no captures, no checkmate awareness)

**Fix**: Removed `randomChance` for all ELO levels

**File Changed**: `src/data/botLevels.js`

**Changes**:
```diff
  {
    elo: 400,
    label: "400 ELO",
    description: "Người mới",
    depth: 1,
    movetime: 100,
    skillLevel: 0,
-   randomChance: 0.25
+   randomChance: 0
  },
  {
    elo: 800,
    label: "800 ELO",
    description: "Cơ bản",
    depth: 2,
    movetime: 200,
    skillLevel: 2,
-   randomChance: 0.12
+   randomChance: 0
  },
```

**Result**: All ELO levels now use Stockfish with appropriate Skill Level instead of pure random.

---

## ✅ Issue 4: No Artificial Delay for Low ELO (LOW) - FIXED

**Status**: Fixed

**Problem**:
- Low ELO bot responded instantly (<100ms)
- High ELO bot took 700-2500ms
- Backwards UX: "dumb" bot was instant, "smart" bot thought longer

**Fix**: Added randomized thinking delay (400-1200ms) for all bot moves

**File Changed**: `src/hooks/useBotMove.js`

**Changes**:
```javascript
// Add artificial thinking delay for human-like feel (400-1200ms)
const minThinkingTime = Math.random() * 800 + 400;
const thinkingStartTime = Date.now();

try {
  const result = await Promise.race([
    getBotMove({ fen, botElo }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('BOT_TIMEOUT')), BOT_TIMEOUT_MS)
    ),
  ]);

  // Ensure minimum thinking time has elapsed
  const elapsedTime = Date.now() - thinkingStartTime;
  if (elapsedTime < minThinkingTime) {
    await new Promise(resolve => setTimeout(resolve, minThinkingTime - elapsedTime));
  }
```

**Result**: All bot moves now have a minimum 400-1200ms delay, making the bot feel more human-like.

---

## ✅ Issue 5: Stockfish Skill Level Mapping (MEDIUM) - FIXED

**Status**: Fixed

**Problem**:
- Both `Skill Level` and `UCI_Elo` were being set simultaneously
- These parameters may conflict or override each other
- Stockfish documentation recommends using UCI_Elo for ELO-based weakening

**Fix**: Use only UCI_Elo when ELO is specified, only use Skill Level as fallback

**File Changed**: `src/services/stockfishService.js`

**Changes**:
```javascript
export async function configureEngineForElo({ elo, skillLevel }) {
  if (!isEngineReady()) return false;

  try {
    // Use UCI_Elo for more accurate ELO-based weakening
    // Don't mix Skill Level and UCI_Elo as they may conflict
    if (elo) {
      worker.postMessage('setoption name UCI_LimitStrength value true');
      worker.postMessage(`setoption name UCI_Elo value ${elo}`);
      debugStockfish(`[Stockfish] Set UCI_Elo to ${elo}`);
    } else if (skillLevel !== undefined) {
      // Only use Skill Level if no ELO is specified
      worker.postMessage('setoption name UCI_LimitStrength value false');
      worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      debugStockfish(`[Stockfish] Set Skill Level to ${skillLevel}`);
    }

    return true;
  } catch (error) {
    console.warn('[Stockfish] Configure error:', error);
    return false;
  }
}
```

**Result**: Stockfish now uses UCI_Elo exclusively for more accurate ELO matching.

---

## ⏳ Issue 1: Stockfish Silent Fallback Detection (CRITICAL) - NOT FIXED

**Status**: Requires UI component work (out of scope for this fix)

**Problem**:
- User has no indication if Stockfish loaded successfully or if fallback is being used
- `engineState` is exposed but not consumed by any UI component
- No status badge like "Engine: Stockfish" vs "Engine: Basic Mode"

**What's Needed**:
1. Add UI status indicator in `PlayerBar.jsx` or `ChessGameBoard.jsx`
2. Expose `engineState` from `ChessGameContext`
3. Show toast/banner when falling back to basic mode
4. Check `window.crossOriginIsolated` before attempting Stockfish init

**Recommendation**: Create a separate task for UI work to add engine status indicator.

---

## Summary

| Issue | Priority | Status | Changes |
|-------|----------|--------|---------|
| Issue 1: Silent fallback | CRITICAL | ⏳ Needs UI work | 0 files |
| Issue 2: Race condition | HIGH | ✅ Already fixed | 0 files |
| Issue 3: Pure random bot | MEDIUM | ✅ Fixed | 1 file |
| Issue 4: No delay | LOW | ✅ Fixed | 1 file |
| Issue 5: Skill mapping | MEDIUM | ✅ Fixed | 1 file |

**Total Files Changed**: 3
- `src/data/botLevels.js`
- `src/hooks/useBotMove.js`
- `src/services/stockfishService.js`

---

## Testing Checklist

Before deploying, verify:

- [ ] Bot always plays a legal move
- [ ] Bot never moves when it's the player's turn
- [ ] Bot never moves after game is over (checkmate/stalemate/draw)
- [ ] Bot never moves after game reset
- [ ] All ELO levels produce noticeably different playing strength
- [ ] Low ELO bot (400-800) is weaker but still plays logical chess
- [ ] Bot has visible "thinking" delay (400-1200ms minimum)
- [ ] High ELO bot is stronger than low ELO bot
- [ ] No console errors during bot moves

---

## Build & Deploy

```bash
npm run build
git add src/data/botLevels.js src/hooks/useBotMove.js src/services/stockfishService.js
git commit -m "Fix bot logic: remove pure random, add thinking delay, fix UCI_Elo"
git push origin main
```

---

## Next Steps

1. **Test bot behavior** at different ELO levels (400, 800, 1200, 1600, 2000, 2400)
2. **Verify thinking delay** is visible and feels natural
3. **Create UI task** for Issue 1 (engine status indicator)
4. **Monitor production** for any bot-related errors

---

**Fixes completed**: 2026-05-30
**Build status**: Ready for testing
