# Phase 10: UI Text Polish

**Date:** 2026-05-20  
**Status:** 🔄 IN PROGRESS

---

## Objectives

1. Remove technical text and jargon
2. Simplify to clear Vietnamese
3. Consistent terminology across UI
4. User-friendly labels
5. Remove unnecessary information
6. Cleaner, more professional presentation

---

## Areas to Review

### 1. Technical Terms to Simplify
- "Analysis Mode" → Already fixed to "Chế độ phân tích"
- "Engine" references
- "Stockfish WASM" mentions
- "Fallback" messages
- Debug/technical status messages

### 2. Components to Review
- BotInfoPanel.jsx - Bot status messages
- BotSettings.jsx - Technical engine info
- EngineAnalysisPanel.jsx - Engine status text
- GameStatusBanner.jsx - Game status text
- MoveHintDisplay.jsx - Hint text
- CheckWarning.jsx - Warning text

### 3. Verbose Text to Shorten
- Long explanatory paragraphs
- Redundant information
- Technical details users don't need

---

## Investigation Plan

### Step 1: Identify Technical Text
- [ ] Search for "engine", "stockfish", "fallback"
- [ ] Find verbose explanations
- [ ] Locate technical status messages

### Step 2: Review Each Component
- [ ] BotInfoPanel.jsx
- [ ] BotSettings.jsx
- [ ] EngineAnalysisPanel.jsx
- [ ] Other components with text

### Step 3: Simplify and Polish
- [ ] Replace technical terms
- [ ] Shorten verbose text
- [ ] Ensure consistency
- [ ] Test readability

---

## Starting text audit...

### Text Audit Complete

**Search results:** Found technical terms in 9 component files

**Components reviewed:**
1. BotSettings.jsx - Technical engine status messages
2. LiveEvaluationBar.jsx - Status display
3. MoveHintDisplay.jsx - Verbose hint text
4. GameStatusBanner.jsx - Bot thinking message

---

## Technical Text Identified

### 1. BotSettings.jsx (Lines 76-84)

**Before:**
```javascript
{botMoveSource && (
  <p className="text-xs">
    {botMoveSource === 'stockfish_wasm' && <span className="text-amber-300">✓ Engine: Stockfish WASM</span>}
    {botMoveSource === 'random_weak' && <span className="text-amber-300">○ Bot chơi yếu (ELO thấp)</span>}
    {botMoveSource === 'fallback' && (
      <span className="text-red-300">⚠ Engine: Fallback cơ bản (Stockfish không khả dụng)</span>
    )}
  </p>
)}
```

**Issues:**
- "Engine: Stockfish WASM" - Technical jargon
- "Fallback cơ bản" - Technical term
- Users don't need to know engine implementation details

**Fix:** Remove entire technical status display

### 2. LiveEvaluationBar.jsx (Line 56)

**Before:**
```javascript
<div className="text-center text-[0.62rem] font-black uppercase leading-3 tracking-[0.12em] text-slate-400">
  {status || leader}
</div>
```

**Issues:**
- Shows technical status like "Đang tải", "Lỗi engine", "Fallback"
- Users don't need to see loading/error states

**Fix:** Only show leader (Cân bằng, Trắng hơn, Đen hơn)

### 3. MoveHintDisplay.jsx (Lines 28, 40-46)

**Before:**
```javascript
<b className="text-amber-300">Gợi ý engine:</b>

// And verbose text:
"Đang chọn ... ở ...: {selectedLegalMoves.length} nước hợp lệ đang sáng trên bàn."
"Chọn một quân để xem các ô có thể đi. Khi engine gợi ý, ô xuất phát và ô đích sẽ sáng trực tiếp trên bàn."
```

**Issues:**
- "Gợi ý engine" - Technical term
- Verbose explanations
- Redundant information

**Fix:** Simplify to clear, concise Vietnamese

### 4. GameStatusBanner.jsx (Line 13)

**Before:**
```javascript
<StatusBadge label={isBotThinking ? 'Bot đang nghĩ...' : turnLabel} tone="muted" />
```

**Issues:**
- "Bot đang nghĩ..." - Redundant "Bot" prefix

**Fix:** Simplify to "Đang nghĩ..."

---

## Changes Implemented

### Change 1: Remove Technical Engine Status ✅

**File:** `src/components/chess/BotSettings.jsx`

**Removed:**
```javascript
{botMoveSource && (
  <p className="text-xs">
    {botMoveSource === 'stockfish_wasm' && <span>✓ Engine: Stockfish WASM</span>}
    {botMoveSource === 'random_weak' && <span>○ Bot chơi yếu (ELO thấp)</span>}
    {botMoveSource === 'fallback' && <span>⚠ Engine: Fallback cơ bản</span>}
  </p>
)}
```

**Impact:**
- Cleaner UI
- No technical jargon
- Users don't need engine implementation details

### Change 2: Remove Technical Status from Evaluation Bar ✅

**File:** `src/components/chess/LiveEvaluationBar.jsx`

**Before:**
```javascript
{status || leader}
```

**After:**
```javascript
{leader}
```

**Impact:**
- No more "Đang tải", "Lỗi engine", "Fallback" messages
- Only shows meaningful game state (Cân bằng, Trắng hơn, Đen hơn)

### Change 3: Simplify Move Hint Text ✅

**File:** `src/components/chess/MoveHintDisplay.jsx`

**Before:**
```javascript
<b className="text-amber-300">Gợi ý engine:</b>

"Đang chọn ... ở ...: {selectedLegalMoves.length} nước hợp lệ đang sáng trên bàn."
"Chọn một quân để xem các ô có thể đi. Khi engine gợi ý, ô xuất phát và ô đích sẽ sáng trực tiếp trên bàn."
```

**After:**
```javascript
<b className="text-amber-300">Gợi ý:</b>

"Đang chọn ... ở .... Chọn ô sáng để di chuyển."
"Chọn quân để xem nước hợp lệ. Bật gợi ý để thấy nước tốt nhất."
```

**Impact:**
- Removed "engine" term
- Shorter, clearer text
- No redundant information
- More concise instructions

### Change 4: Simplify Bot Thinking Message ✅

**File:** `src/components/chess/GameStatusBanner.jsx`

**Before:**
```javascript
'Bot đang nghĩ...'
```

**After:**
```javascript
'Đang nghĩ...'
```

**Impact:**
- Shorter message
- No redundant "Bot" prefix
- Cleaner status display

---

## Text Comparison

### Before Phase 10
- "Engine: Stockfish WASM" ❌
- "Fallback cơ bản (Stockfish không khả dụng)" ❌
- "Gợi ý engine:" ❌
- "Bot đang nghĩ..." ❌
- "Đang tải", "Lỗi engine" ❌
- Verbose explanations ❌

### After Phase 10
- No engine implementation details ✅
- "Gợi ý:" ✅
- "Đang nghĩ..." ✅
- Only meaningful game state ✅
- Concise, clear text ✅

---

## Build Status

✅ Build successful (1.19s)
✅ Bundle size: 443.93 kB (minimal change)
✅ No errors or warnings

---

## Summary

### Changes Made
1. ✅ Removed technical engine status from BotSettings
2. ✅ Removed technical status from LiveEvaluationBar
3. ✅ Simplified move hint text (removed "engine", shortened explanations)
4. ✅ Simplified bot thinking message (removed "Bot" prefix)

### Impact
- **Clarity:** No more technical jargon
- **Simplicity:** Shorter, clearer text
- **Professionalism:** Cleaner UI presentation
- **User-friendly:** Only show what users need to know

### Files Modified
- `src/components/chess/BotSettings.jsx` - Removed engine status
- `src/components/chess/LiveEvaluationBar.jsx` - Removed technical status
- `src/components/chess/MoveHintDisplay.jsx` - Simplified text
- `src/components/chess/GameStatusBanner.jsx` - Shortened message

### Build Status
✅ Build successful (1.19s)
✅ Bundle size: 443.93 kB

---

## Next Steps

**Phase 10: COMPLETED** ✅

Ready for Phase 11: Home Page polish
