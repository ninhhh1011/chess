# Bot Logic Deep Analysis & Optimization Plan
Date: 2026-05-30 07:08 UTC

## 🔍 Current Bot Settings Analysis

### Current Configuration (from botLevels.js)

| ELO | Depth | Movetime | Skill Level | UCI_Elo | Analysis |
|-----|-------|----------|-------------|---------|----------|
| 400 | 1 | 100ms | 0 | 400 | ⚠️ TOO SHALLOW |
| 800 | 2 | 200ms | 2 | 800 | ⚠️ TOO SHALLOW |
| 1200 | 5 | 700ms | 6 | 1200 | ⚠️ BORDERLINE |
| 1600 | 8 | 1200ms | 10 | 1600 | ✅ OK |
| 2000 | 11 | 1800ms | 15 | 2000 | ✅ OK |
| 2400 | 14 | 2500ms | 20 | 2400 | ✅ OK |

---

## ⚠️ Critical Issues Found

### Issue A: Depth 1-2 is Too Shallow (CRITICAL)

**Problem**:
- 400 ELO: depth 1 (100ms) - Bot can only see 1 move ahead
- 800 ELO: depth 2 (200ms) - Bot can only see 2 moves ahead
- This is WORSE than pure random because:
  - Can't see 2-move tactics (fork, pin)
  - Can't see if a piece is hanging after opponent's response
  - Can't calculate simple exchanges
  - Plays like a bot that's broken, not like a weak human

**Real Beginner Behavior**:
- Real 400 ELO players can see 2-3 moves ahead
- Real 800 ELO players can see 3-4 moves ahead
- They make mistakes in evaluation, not in calculation depth

**Fix**: Increase minimum depth to 3-4 even for low ELO

---

### Issue B: Movetime Too Short for Low ELO (HIGH)

**Problem**:
- 400 ELO: 100ms movetime
- 800 ELO: 200ms movetime
- Stockfish at depth 1-2 with 100-200ms can't even finish basic evaluation
- This forces Stockfish to return incomplete analysis

**Fix**: Increase minimum movetime to 300-500ms

---

### Issue C: UCI_Elo May Not Work as Expected (MEDIUM)

**Problem**:
- We're setting `UCI_Elo` but Stockfish's UCI_Elo implementation varies by version
- Some Stockfish versions ignore UCI_Elo below 1350
- Skill Level 0-5 is more reliable for weak play

**Current Approach**:
```javascript
if (elo) {
  worker.postMessage('setoption name UCI_LimitStrength value true');
  worker.postMessage(`setoption name UCI_Elo value ${elo}`);
}
```

**Better Approach for Low ELO**:
- 400-1000 ELO: Use Skill Level ONLY (more reliable)
- 1000+ ELO: Use UCI_Elo (more accurate)

---

## 🎯 Proposed Optimizations

### Optimization 1: Increase Depth for Low ELO

**Current**:
```javascript
{
  elo: 400,
  depth: 1,      // ❌ Too shallow
  movetime: 100, // ❌ Too short
  skillLevel: 0,
}
```

**Proposed**:
```javascript
{
  elo: 400,
  depth: 4,      // ✅ Can see basic tactics
  movetime: 500, // ✅ Enough time to evaluate
  skillLevel: 0, // ✅ Stockfish will make mistakes in evaluation
}
```

**Reasoning**:
- Depth 4 allows bot to see 2-move tactics (fork, pin, hanging pieces)
- Skill Level 0 makes Stockfish evaluate positions poorly
- This creates "sees the tactic but evaluates it wrong" behavior = realistic beginner

---

### Optimization 2: Better ELO Mapping

**Proposed New Settings**:

```javascript
export const BOT_ELO_LEVELS = [
  {
    elo: 400,
    label: "400 ELO",
    description: "Người mới",
    depth: 4,           // ✅ Increased from 1
    movetime: 500,      // ✅ Increased from 100
    skillLevel: 0,      // Keep
    useSkillLevelOnly: true, // ✅ New flag
    randomChance: 0
  },
  {
    elo: 800,
    label: "800 ELO",
    description: "Cơ bản",
    depth: 6,           // ✅ Increased from 2
    movetime: 600,      // ✅ Increased from 200
    skillLevel: 3,      // ✅ Increased from 2
    useSkillLevelOnly: true, // ✅ New flag
    randomChance: 0
  },
  {
    elo: 1200,
    label: "1200 ELO",
    description: "Sơ cấp",
    depth: 8,           // ✅ Increased from 5
    movetime: 800,      // ✅ Increased from 700
    skillLevel: 6,      // Keep
    useSkillLevelOnly: false, // Use UCI_Elo
    randomChance: 0
  },
  {
    elo: 1600,
    label: "1600 ELO",
    description: "Trung cấp",
    depth: 10,          // ✅ Increased from 8
    movetime: 1200,     // Keep
    skillLevel: 10,     // Keep
    useSkillLevelOnly: false,
    randomChance: 0
  },
  {
    elo: 2000,
    label: "2000 ELO",
    description: "Mạnh",
    depth: 13,          // ✅ Increased from 11
    movetime: 1800,     // Keep
    skillLevel: 15,     // Keep
    useSkillLevelOnly: false,
    randomChance: 0
  },
  {
    elo: 2400,
    label: "2400 ELO",
    description: "Rất mạnh",
    depth: 16,          // ✅ Increased from 14
    movetime: 2500,     // Keep
    skillLevel: 20,     // Keep
    useSkillLevelOnly: false,
    randomChance: 0
  }
];
```

---

### Optimization 3: Conditional UCI_Elo vs Skill Level

**Update stockfishService.js**:

```javascript
export async function configureEngineForElo({ elo, skillLevel, useSkillLevelOnly = false }) {
  if (!isEngineReady()) return false;

  try {
    if (useSkillLevelOnly && skillLevel !== undefined) {
      // For low ELO (400-800), use Skill Level only (more reliable)
      worker.postMessage('setoption name UCI_LimitStrength value false');
      worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      debugStockfish(`[Stockfish] Set Skill Level to ${skillLevel} (low ELO mode)`);
    } else if (elo) {
      // For mid-high ELO (1200+), use UCI_Elo (more accurate)
      worker.postMessage('setoption name UCI_LimitStrength value true');
      worker.postMessage(`setoption name UCI_Elo value ${elo}`);
      debugStockfish(`[Stockfish] Set UCI_Elo to ${elo}`);
    } else if (skillLevel !== undefined) {
      // Fallback to Skill Level
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

---

## 📊 Expected Improvements

### Before Optimization:
- 400 ELO: Hangs pieces randomly, can't see 2-move tactics
- 800 ELO: Slightly better but still misses obvious tactics
- Feels like "broken bot" not "weak player"

### After Optimization:
- 400 ELO: Sees tactics but evaluates poorly, makes beginner mistakes
- 800 ELO: Sees most tactics but sometimes chooses wrong plan
- Feels like "real beginner" not "broken bot"

---

## 🧪 Testing Plan

1. **Test 400 ELO**:
   - Set up position: White Queen on d1, Black Knight on f6
   - Move Queen to a4+ (check)
   - Expected: Bot should see it's check and respond (not hang King)

2. **Test 800 ELO**:
   - Set up fork position
   - Expected: Bot should see the fork and avoid it

3. **Test Strength Difference**:
   - Play 10 moves against 400 ELO
   - Play 10 moves against 2400 ELO
   - Expected: Clear strength difference

---

## ⚡ Implementation Priority

1. **HIGH**: Increase depth for 400-800 ELO (fixes "broken bot" feel)
2. **HIGH**: Increase movetime for 400-800 ELO (allows proper evaluation)
3. **MEDIUM**: Add useSkillLevelOnly flag for low ELO
4. **MEDIUM**: Update configureEngineForElo to handle flag
5. **LOW**: Fine-tune depth/movetime for mid-high ELO

---

## 🚀 Ready to Implement?

Say "yes" to implement these optimizations, or let me know if you want to adjust any settings first.
