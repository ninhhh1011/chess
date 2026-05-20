# Phase 2: State Manager Implementation Report

**Date:** 2026-05-20  
**Status:** ✅ COMPLETED

---

## Summary

✅ **Created Context API for centralized game state management.**

Tạo thành công:
- `ChessGameContext.jsx` - Context provider với toàn bộ game state và actions
- `useBotMove.js` - Custom hook cho bot move logic
- `useEngineAnalysis.js` - Custom hook cho Stockfish analysis
- `useMoveHighlights.js` - Custom hook cho board highlights

---

## 1. Files Created

### 1.1 ChessGameContext.jsx (370 dòng)

**Location:** `src/contexts/ChessGameContext.jsx`

**Exports:**
- `ChessGameProvider` - Context provider component
- `useChessGame()` - Hook để access context

**State Management:**

**Core Game State:**
```javascript
- game: Chess instance
- boardKey: number (force re-render)
- activeGame: computed (game hoặc analysisGame)
- currentFen: string
- currentPgn: string
- currentTurn: 'w' | 'b'
- moveHistory: string[]
- isCheck: boolean
- isCheckmate: boolean
- isDraw: boolean
- isGameOver: boolean
```

**Game Mode & Settings:**
```javascript
- gameMode: 'local' | 'bot'
- playerColor: 'w' | 'b'
- botElo: number
```

**Bot State:**
```javascript
- isBotThinking: boolean
- botMoveSource: string | null
- botRequestId: number
- botRequestIdRef: ref
```

**UI State:**
```javascript
- selectedSquare: string | null
- moveHints: object
- lastMoveSquares: { from, to } | null
```

**Engine State:**
```javascript
- engineHint: object | null
```

**Game Status:**
```javascript
- resultNotice: string | null
- recordedGamePgn: string | null
```

**Move Annotations:**
```javascript
- moveAnnotations: object
- lastMoveFenPair: object | null
```

**Analysis Mode:**
```javascript
- analysisMode: boolean
- analysisGame: Chess instance
- analysisMainline: string[]
- analysisPly: number
```

**Actions:**
```javascript
- makeMove(from, to, promotion)
- selectSquare(square)
- clearSelection()
- getLegalMoves(square)
- getKingSquare(color)
- newGame()
- undoMove()
- changeGameMode(mode)
- changePlayerColor(color)
- changeBotElo(elo)
- enterAnalysisMode()
- exitAnalysisMode()
- goToAnalysisPly(ply)
- cloneGame(sourceGame)
```

**Features:**
- ✅ Centralized state
- ✅ Derived state computed automatically
- ✅ Console logging for FEN/PGN after each move
- ✅ All game logic in one place
- ✅ Easy to test
- ✅ Easy to reuse

### 1.2 useBotMove.js (85 dòng)

**Location:** `src/hooks/useBotMove.js`

**Purpose:** Tách bot move orchestration logic ra khỏi component.

**Exports:**
```javascript
{
  triggerBotMove(afterPlayerGame),
  isBotThinking
}
```

**Features:**
- ✅ Guard conditions (game mode, turn, game over)
- ✅ Request ID tracking để prevent race conditions
- ✅ Stale request detection
- ✅ Sound effects (capture/move)
- ✅ Error handling
- ✅ Cleanup on unmount

**Usage:**
```javascript
const { triggerBotMove } = useBotMove();

// After player move
const result = makeMove(from, to);
if (result) {
  triggerBotMove(result.nextGame);
}
```

### 1.3 useEngineAnalysis.js (60 dòng)

**Location:** `src/hooks/useEngineAnalysis.js`

**Purpose:** Tách Stockfish analysis logic.

**Exports:**
```javascript
{
  analysis,      // Latest analysis result
  isAnalyzing,   // Loading state
  error,         // Error message
  runAnalysis()  // Manual trigger
}
```

**Features:**
- ✅ Auto-analyze on FEN change (if enabled)
- ✅ Debounce 180ms
- ✅ Request ID tracking
- ✅ Cleanup on unmount
- ✅ Manual trigger option
- ✅ Error handling

**Usage:**
```javascript
const { analysis, isAnalyzing } = useEngineAnalysis({
  fen: currentFen,
  enabled: true,
  depth: 8,
  movetime: 650
});
```

### 1.4 useMoveHighlights.js (110 dòng)

**Location:** `src/hooks/useMoveHighlights.js`

**Purpose:** Tách board highlight logic.

**Exports:**
```javascript
{
  boardSquareStyles,  // Merged styles object
  engineArrows,       // Arrow array for react-chessboard
  moveDotStyle,       // Style constants
  captureRingStyle
}
```

**Features:**
- ✅ Merge multiple highlight layers
- ✅ Legal move hints (dots/rings)
- ✅ Last move highlight
- ✅ Selected square highlight
- ✅ Check highlight
- ✅ Engine hint highlight
- ✅ Memoized for performance

**Usage:**
```javascript
const { boardSquareStyles, engineArrows } = useMoveHighlights({
  selectedSquare,
  moveHints,
  lastMoveSquares,
  checkedKingSquare,
  engineMove
});
```

---

## 2. Architecture Benefits

### 2.1 Before (ChessGameBoard.jsx: 1029 dòng)

```
ChessGameBoard.jsx
├── 25+ useState hooks
├── Game logic
├── Bot logic
├── Engine logic
├── UI logic
├── Layout
└── All mixed together
```

**Problems:**
- Hard to test
- Hard to reuse
- Hard to understand
- State updates scattered
- Logic duplicated

### 2.2 After (Context + Hooks)

```
ChessGameContext.jsx (370 dòng)
├── Centralized state
├── Game actions
└── Derived state

useBotMove.js (85 dòng)
└── Bot orchestration

useEngineAnalysis.js (60 dòng)
└── Stockfish analysis

useMoveHighlights.js (110 dòng)
└── Board highlights

ChessGameBoard.jsx (will be ~200 dòng)
└── UI composition only
```

**Benefits:**
- ✅ Single source of truth
- ✅ Easy to test each piece
- ✅ Easy to reuse hooks
- ✅ Clear separation of concerns
- ✅ Better performance (memoization)

---

## 3. Migration Strategy

### 3.1 Next Steps (Phase 3)

**Wrap App with Provider:**
```javascript
// src/App.jsx
import { ChessGameProvider } from './contexts/ChessGameContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChessGameProvider>
          <Layout>
            <Routes>...</Routes>
          </Layout>
        </ChessGameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**Refactor ChessGameBoard.jsx:**
```javascript
import { useChessGame } from '../contexts/ChessGameContext';
import { useBotMove } from '../hooks/useBotMove';
import { useEngineAnalysis } from '../hooks/useEngineAnalysis';
import { useMoveHighlights } from '../hooks/useMoveHighlights';

export default function ChessGameBoard() {
  const {
    currentFen,
    makeMove,
    selectSquare,
    // ... other state/actions
  } = useChessGame();

  const { triggerBotMove } = useBotMove();
  const { analysis } = useEngineAnalysis({ fen: currentFen });
  const { boardSquareStyles, engineArrows } = useMoveHighlights({...});

  // Component now just composes UI
  return <div>...</div>;
}
```

---

## 4. Testing

### 4.1 Build Test

```bash
$ npm run build
✓ built in 1.39s
```

✅ **Build successful** - No TypeScript/import errors.

### 4.2 Manual Testing Checklist (Phase 3)

After integrating context into ChessGameBoard:

- [ ] Local 2-player mode works
- [ ] Bot mode works
- [ ] Bot thinking state shows
- [ ] Legal move hints display
- [ ] Last move highlight works
- [ ] Check highlight works
- [ ] Engine analysis works
- [ ] Move annotations work
- [ ] Analysis mode works
- [ ] Undo works
- [ ] New game works
- [ ] Game mode switch works
- [ ] Player color switch works
- [ ] Bot ELO switch works

---

## 5. Performance Considerations

### 5.1 Memoization

**useMoveHighlights:**
```javascript
const boardSquareStyles = useMemo(() => {
  // Merge all highlight layers
}, [selectedSquare, moveHints, lastMoveSquares, checkedKingSquare, engineMove]);
```

**ChessGameContext:**
```javascript
// Derived state computed once per render
const activeGame = analysisMode ? analysisGame : game;
const currentFen = activeGame.fen();
const currentTurn = activeGame.turn();
```

### 5.2 Request Cancellation

**useEngineAnalysis:**
```javascript
const requestIdRef = useRef(0);

useEffect(() => {
  const requestId = requestIdRef.current + 1;
  requestIdRef.current = requestId;

  analyzeFen(...).then(result => {
    if (requestIdRef.current !== requestId) return; // Stale
    setAnalysis(result);
  });
}, [fen]);
```

**useBotMove:**
```javascript
const currentRequestId = botRequestIdRef.current;

const result = await getBotMove(...);

if (currentRequestId !== botRequestIdRef.current) {
  return; // Stale request
}
```

---

## 6. Known Limitations

### 6.1 Context Re-renders

**Issue:** Any state change in context triggers re-render of all consumers.

**Mitigation:**
- Use `useMemo` for expensive computations
- Use `React.memo` for child components
- Consider splitting context if performance issues arise

**Current:** Not an issue for chess app (state changes are infrequent).

### 6.2 No Zustand

**Decision:** Used Context API instead of Zustand.

**Reasoning:**
- No extra dependency
- Sufficient for this app size
- Easy to migrate to Zustand later if needed

**If needed later:**
```javascript
// Easy migration path
import create from 'zustand';

const useChessStore = create((set, get) => ({
  game: new Chess(),
  makeMove: (from, to) => {
    const game = get().game;
    // ...
    set({ game: newGame });
  }
}));
```

---

## 7. Conclusion

✅ **Phase 2 COMPLETED**

**Created:**
- ✅ ChessGameContext.jsx (370 dòng)
- ✅ useBotMove.js (85 dòng)
- ✅ useEngineAnalysis.js (60 dòng)
- ✅ useMoveHighlights.js (110 dòng)

**Benefits:**
- Centralized state management
- Reusable hooks
- Better separation of concerns
- Easier to test
- Foundation for Phase 3 refactor

**Next:** Phase 3 - Refactor ChessGameBoard.jsx to use context and hooks.

---

**End of Phase 2 Report**
