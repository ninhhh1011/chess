# Phase 0: Codebase Audit Report
**Date:** 2026-05-20  
**Project:** Chess App (React/Vite)  
**Repository:** https://github.com/ninhhh1011/chess  
**Deploy:** https://chess-brown-two.vercel.app/

---

## Executive Summary

Đây là một ứng dụng cờ vua React/Vite hoàn chỉnh với nhiều tính năng: chơi local/bot, Stockfish analysis, AI Coach, opening trainer, exercises, và training system. Code đang hoạt động nhưng **kiến trúc cần refactor** để dễ maintain và scale.

**Điểm mạnh:**
- ✅ Đã dùng `chess.js` làm engine logic chính
- ✅ Đã dùng `react-chessboard` cho UI bàn cờ
- ✅ Stockfish WASM integration hoạt động qua Web Worker
- ✅ Bot service với nhiều ELO levels
- ✅ Có fallback engine khi Stockfish fail
- ✅ Responsive design với Tailwind CSS
- ✅ Nhiều features: AI Coach, opening trainer, exercises, training

**Điểm yếu chính:**
- ❌ **ChessGameBoard.jsx quá lớn (1029 dòng)** - ôm quá nhiều logic
- ❌ Không có state management tập trung (Context/Zustand)
- ❌ Không có custom hooks để tách logic
- ❌ Promotion luôn auto-queen, chưa có UI chọn
- ❌ UI có nhiều text kỹ thuật ("Unified panel", "Eval Bar", "Game Center")
- ❌ Check effect hơi mạnh (pulse animation)
- ❌ Một số logic duplicate giữa analysis mode và play mode

---

## 1. Kiến Trúc Hiện Tại

### 1.1 Cấu Trúc Thư Mục

```
src/
├── components/
│   ├── analysis/
│   │   ├── EngineAnalysisPanel.jsx
│   │   ├── GameReviewPanel.jsx
│   │   └── MoveClassificationBadge.jsx
│   ├── chess/
│   │   └── standardPieces.jsx
│   ├── openings/
│   │   ├── OpeningCard.jsx
│   │   ├── OpeningCoachPanel.jsx
│   │   ├── OpeningMoveList.jsx
│   │   ├── OpeningProgress.jsx
│   │   └── OpeningTrainerBoard.jsx
│   ├── training/
│   │   ├── DailyTrainingPlan.jsx
│   │   ├── LevelBadge.jsx
│   │   ├── LevelProgress.jsx
│   │   ├── RecommendedExercises.jsx
│   │   ├── RecommendedLessons.jsx
│   │   ├── StrengthWeaknessPanel.jsx
│   │   └── TrainingOverview.jsx
│   ├── AICoachPanel.jsx (203 dòng)
│   ├── ChessGameBoard.jsx (1029 dòng) ⚠️ QUÁ LỚN
│   ├── ExerciseBoard.jsx
│   ├── Layout.jsx
│   ├── LessonCard.jsx
│   ├── Navbar.jsx
│   ├── StatusBadge.jsx
│   └── SyncStatusBadge.jsx
├── contexts/
│   └── AuthContext.jsx
├── data/
│   ├── botLevels.js
│   ├── exercises.js
│   ├── lessons.js
│   ├── levelConfig.js
│   ├── openings.js
│   └── trainingRules.js
├── lib/
│   └── supabaseClient.js
├── pages/
│   ├── Exercises.jsx
│   ├── Home.jsx
│   ├── Learn.jsx
│   ├── Login.jsx
│   ├── OpeningDetail.jsx
│   ├── Openings.jsx
│   ├── Play.jsx (9 dòng - chỉ render ChessGameBoard)
│   ├── Signup.jsx
│   └── Training.jsx
├── services/
│   ├── aiCoachApiService.js
│   ├── authService.js
│   ├── botService.js
│   ├── cloudProfileService.js
│   ├── coachApi.js
│   ├── fallbackChessEngine.js
│   ├── mockCoachService.js
│   ├── openingProgressService.js
│   ├── recommendationService.js
│   ├── stockfishService.js (308 dòng)
│   ├── syncService.js
│   └── userProfileService.js
├── utils/
│   ├── chessStatus.js
│   ├── chessMoveUtils.js
│   ├── randomBot.js
│   └── sound.js
├── App.jsx
├── main.jsx
└── index.css

public/
├── stockfish/
│   ├── stockfish.js
│   └── stockfish.wasm
├── stockfish-worker.js (151 dòng - bridge worker)
├── stockfish.js (copy)
└── stockfish.wasm (copy)
```

### 1.2 Dependencies (package.json)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.105.1",
    "chess.js": "latest",
    "react-chessboard": "latest",
    "stockfish": "^18.0.7",
    "react": "latest",
    "react-dom": "latest",
    "react-router-dom": "latest",
    "tailwindcss": "^3.4.17",
    "express": "latest",
    "cors": "latest",
    "dotenv": "latest"
  }
}
```

---

## 2. Phân Tích Chi Tiết Từng Module

### 2.1 ChessGameBoard.jsx (1029 dòng) ⚠️

**Trách nhiệm hiện tại (quá nhiều):**
- ✅ Chess.js game state management
- ✅ FEN/PGN tracking
- ✅ Move validation và execution
- ✅ Legal moves calculation và display
- ✅ Last move highlight
- ✅ Selected square tracking
- ✅ Check detection và highlight
- ✅ Bot move logic
- ✅ Stockfish analysis integration
- ✅ Live evaluation bar
- ✅ Move annotation (brilliant/best/mistake/blunder)
- ✅ Analysis mode (replay với mainline)
- ✅ Game review với engine
- ✅ Auto-analyze toggle
- ✅ Sound effects
- ✅ UI layout (board + sidebar)
- ✅ Game controls (new game, undo, mode selector)
- ✅ Bot settings (color, ELO)
- ✅ Move history display
- ✅ Engine hint display
- ✅ Result modal

**State variables (quá nhiều):**
```javascript
const [game, setGame] = useState(() => new Chess());
const [boardKey, setBoardKey] = useState(0);
const [gameMode, setGameMode] = useState(GAME_MODES.BOT);
const [isBotThinking, setIsBotThinking] = useState(false);
const [botElo, setBotElo] = useState(1200);
const [playerColor, setPlayerColor] = useState(PLAYER_COLORS.WHITE);
const [botMoveSource, setBotMoveSource] = useState(null);
const [botRequestId, setBotRequestId] = useState(0);
const [moveHints, setMoveHints] = useState({});
const [engineHint, setEngineHint] = useState(null);
const [lastMoveSquares, setLastMoveSquares] = useState(null);
const [startNotice, setStartNotice] = useState(true);
const [selectedSquare, setSelectedSquare] = useState(null);
const [resultNotice, setResultNotice] = useState(null);
const [recordedGamePgn, setRecordedGamePgn] = useState(null);
const [autoAnalyze, setAutoAnalyze] = useState(false);
const [autoComment, setAutoComment] = useState('');
const [lastMoveFenPair, setLastMoveFenPair] = useState(null);
const [review, setReview] = useState(null);
const [isReviewing, setIsReviewing] = useState(false);
const [moveAnnotations, setMoveAnnotations] = useState({});
const [liveAnalysis, setLiveAnalysis] = useState(null);
const [liveEvalStatus, setLiveEvalStatus] = useState('Đang tải');
const [analysisMode, setAnalysisMode] = useState(false);
const [analysisGame, setAnalysisGame] = useState(() => new Chess());
const [analysisMainline, setAnalysisMainline] = useState([]);
const [analysisPly, setAnalysisPly] = useState(0);
// + nhiều refs
```

**Vấn đề:**
- Component này vi phạm Single Responsibility Principle
- Khó test
- Khó maintain
- Khó reuse logic
- State quá phức tạp

### 2.2 Services Layer

**stockfishService.js (308 dòng):**
- ✅ Worker management tốt
- ✅ Queue analysis requests
- ✅ Timeout handling
- ✅ Fallback khi engine fail
- ✅ ELO configuration
- ⚠️ Có thể tách thành hook để dễ dùng

**botService.js (115 dòng):**
- ✅ Bot move logic rõ ràng
- ✅ Random move cho ELO thấp
- ✅ Stockfish integration cho ELO cao
- ✅ Fallback handling
- ✅ Code sạch, dễ hiểu

**Các service khác:**
- aiCoachApiService.js - AI coach integration
- authService.js - Supabase auth
- userProfileService.js - Local storage profile
- openingProgressService.js - Opening training progress
- recommendationService.js - Training recommendations
- Tất cả đều có structure tốt

### 2.3 Utils Layer

**chessStatus.js:**
- ✅ Simple, clean
- ✅ Chỉ export pure functions

**chessMoveUtils.js:**
- ✅ UCI to SAN conversion
- ✅ Evaluation formatting
- ✅ Move classification
- ✅ Pure functions

**sound.js:**
- ✅ Sound effects cho move/capture/check/start

### 2.4 UI Components

**react-chessboard integration:**
- ✅ Đã dùng `react-chessboard` package
- ✅ Custom piece styles qua `standardPieces.jsx`
- ✅ Square styles cho legal moves, last move, check
- ✅ Drag and drop hoạt động
- ⚠️ Click/tap move cần polish hơn

**EngineAnalysisPanel.jsx:**
- ✅ Tách riêng khỏi main board
- ✅ Evaluation bar
- ✅ Best move display
- ✅ Auto-analyze toggle
- ✅ Game review button

**AICoachPanel.jsx:**
- ✅ Chat interface
- ✅ Quick actions
- ✅ Level selector
- ✅ Compact reply formatting

### 2.5 Routing và Pages

**App.jsx:**
- ✅ React Router setup
- ✅ AuthProvider wrap
- ✅ Layout wrap

**Play.jsx:**
- ⚠️ Chỉ 9 dòng, chỉ render `<ChessGameBoard />`
- Có thể merge logic vào đây hoặc giữ simple

**Home.jsx:**
- ✅ Hero section
- ✅ Features grid
- ✅ CTA section
- ⚠️ Có thể polish text và layout

---

## 3. Xác Định File Xử Lý Gì

### 3.1 State Ván Cờ
**File:** `src/components/ChessGameBoard.jsx`
- `game` state (Chess instance)
- `currentFen` derived từ `game.fen()`
- `turn` derived từ `game.turn()`
- `status` derived từ `getChessStatus(game)`

### 3.2 FEN
**File:** `src/components/ChessGameBoard.jsx`
- FEN được lấy từ `game.fen()`
- Không có custom FEN parser
- ✅ chess.js là single source of truth

### 3.3 Move Handler
**File:** `src/components/ChessGameBoard.jsx` - function `makeMove()`
- Validate move qua `chess.js`
- Update game state
- Trigger sound
- Update last move squares
- Trigger bot move nếu bot mode
- Trigger analysis nếu auto-analyze

### 3.4 Legal Moves
**File:** `src/components/ChessGameBoard.jsx`
- `game.moves({ square, verbose: true })` từ chess.js
- ✅ Không có custom validation

### 3.5 Highlight
**File:** `src/components/ChessGameBoard.jsx`
- Legal move hints: `moveHints` state
- Last move: `lastMoveSquares` state
- Selected square: `selectedSquare` state
- Check: `checkedKingSquare` computed
- Engine hint: `engineMove` computed
- Tất cả merge vào `boardSquareStyles`

### 3.6 Bot Move
**File:** `src/services/botService.js` + `ChessGameBoard.jsx`
- botService.js: `getBotMove({ fen, botElo })`
- ChessGameBoard.jsx: `makeRandomBotMove()` orchestration
- ✅ Tách service tốt nhưng orchestration còn trong component

### 3.7 Stockfish Analysis
**File:** `src/services/stockfishService.js`
- Worker management
- Analysis queue
- `analyzeFen()` và `getBestMove()`
- ✅ Service layer tốt

### 3.8 Game Status
**File:** `src/utils/chessStatus.js`
- `getChessStatus(game)` - check/checkmate/draw/playing
- `getTurnLabel(game)` - whose turn
- ✅ Pure functions, clean

### 3.9 Move History
**File:** `src/components/ChessGameBoard.jsx`
- `game.history()` từ chess.js
- Display trong sidebar
- Move annotations: `moveAnnotations` state
- ⚠️ Nên tách thành component riêng

### 3.10 UI Layout Play Page
**File:** `src/components/ChessGameBoard.jsx`
- Grid layout: board + sidebar
- Responsive với Tailwind
- ⚠️ Quá nhiều UI logic trong 1 file

---

## 4. Custom Logic Cần Kiểm Tra

### 4.1 Có Custom Board Matrix Không?
**❌ KHÔNG** - App dùng chess.js board representation hoàn toàn.

### 4.2 Có Custom Rule Validation Không?
**❌ KHÔNG** - Tất cả validation qua chess.js:
- `game.move()` validate tự động
- `game.moves()` cho legal moves
- `game.isCheck()`, `game.isCheckmate()`, `game.isDraw()`

### 4.3 Có Custom FEN Parser Không?
**❌ KHÔNG** - chess.js handle FEN:
- `game.fen()` export
- `new Chess(fen)` import
- `game.load(fen)` load

### 4.4 Có Custom PGN Parser Không?
**❌ KHÔNG** - chess.js handle PGN:
- `game.pgn()` export
- `game.loadPgn(pgn)` import

**✅ KẾT LUẬN:** App đã dùng chess.js đúng cách, không có custom logic nguy hiểm.

---

## 5. Điểm Yếu Lớn Nhất

### 🔴 #1: ChessGameBoard.jsx Quá Lớn (1029 dòng)

**Vấn đề:**
- Ôm quá nhiều trách nhiệm
- 25+ state variables
- Khó test
- Khó maintain
- Khó reuse logic
- Vi phạm Single Responsibility Principle

**Giải pháp:**
- Tạo Context/Zustand store cho game state
- Tách thành custom hooks (useBotMove, useEngineAnalysis, useMoveHighlights)
- Tách thành smaller components (ChessBoardPanel, GameControls, MoveHistory, etc.)

### 🟡 #2: Không Có State Management Tập Trung

**Vấn đề:**
- Game state nằm trong component
- Khó share state giữa components
- Khó test logic riêng

**Giải pháp:**
- Context API hoặc Zustand
- Centralize game state, actions, selectors

### 🟡 #3: Promotion Luôn Auto-Queen

**Vấn đề:**
```javascript
move = nextGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
```
- Không có UI chọn quân phong cấp
- User không thể chọn Rook/Bishop/Knight

**Giải pháp:**
- Tạo PromotionModal component
- Detect promotion move trước khi execute
- Show modal, chờ user chọn, rồi mới execute

### 🟡 #4: UI Text Quá Kỹ Thuật

**Ví dụ:**
- "Unified panel"
- "Eval Bar"
- "Game Center"
- "Move list"

**Giải pháp:**
- Đổi thành tiếng Việt đơn giản hơn
- "Trận đấu", "Lịch sử nước đi", "Phân tích"

### 🟡 #5: Check Effect Hơi Mạnh

```css
@keyframes king-check-soft-pulse {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.65); }
  50% { box-shadow: inset 0 0 0 3px rgba(239, 68, 68, 0.9); }
}
```

**Giải pháp:**
- Giảm opacity
- Giảm animation intensity

---

## 6. Danh Sách File Nên Sửa/Tạo/Xóa

### 6.1 Phase 1: Chuẩn Hóa chess.js

**Sửa:**
- ✅ `src/components/ChessGameBoard.jsx` - đã dùng chess.js tốt, chỉ cần verify

**Không cần tạo/xóa gì** - chess.js đã là single source of truth.

### 6.2 Phase 2: State Manager

**Tạo:**
- `src/contexts/ChessGameContext.jsx` (hoặc `src/stores/useChessGameStore.js` nếu dùng Zustand)

**Sửa:**
- `src/components/ChessGameBoard.jsx` - migrate state sang context/store

### 6.3 Phase 3: Refactor Components

**Tạo:**
- `src/components/chess/ChessBoardPanel.jsx`
- `src/components/chess/GameStatusBanner.jsx`
- `src/components/chess/GameControls.jsx`
- `src/components/chess/BotSettings.jsx`
- `src/components/chess/MoveHistory.jsx`
- `src/components/chess/EvaluationBar.jsx`
- `src/components/chess/AnalysisControls.jsx`
- `src/components/chess/PromotionModal.jsx`
- `src/hooks/useBotMove.js`
- `src/hooks/useEngineAnalysis.js`
- `src/hooks/useMoveHighlights.js`

**Sửa:**
- `src/components/ChessGameBoard.jsx` - giảm từ 1029 dòng xuống ~200 dòng (chỉ layout/compose)

**Không xóa** - giữ tất cả chức năng hiện có.

### 6.4 Phase 4: UI Bàn Cờ

**Sửa:**
- `src/components/chess/ChessBoardPanel.jsx` - polish drag/click/tap
- `src/index.css` - responsive board sizing

### 6.5 Phase 5: Promotion UI

**Tạo:**
- `src/components/chess/PromotionModal.jsx`

**Sửa:**
- Context/store - add `pendingPromotion` state
- `src/components/chess/ChessBoardPanel.jsx` - intercept promotion moves

### 6.6 Phase 6: Bot & Stockfish

**Sửa:**
- `src/hooks/useBotMove.js` - orchestration logic
- `src/hooks/useEngineAnalysis.js` - analysis logic
- `src/services/stockfishService.js` - verify worker cleanup

### 6.7 Phase 7: Layout

**Sửa:**
- `src/components/ChessGameBoard.jsx` - layout structure
- `src/pages/Play.jsx` - có thể thêm wrapper
- `src/index.css` - responsive classes

### 6.8 Phase 8: Game Controls

**Tạo:**
- `src/components/chess/TimerPanel.jsx` (hoặc `src/hooks/useChessTimer.js`)

**Sửa:**
- `src/components/chess/GameControls.jsx` - add timer, polish buttons

### 6.9 Phase 9: Move History

**Sửa:**
- `src/components/chess/MoveHistory.jsx` - PGN display, copy button

### 6.10 Phase 10: Polish UI

**Sửa:**
- `src/components/ChessGameBoard.jsx` - remove technical text
- `src/components/analysis/EngineAnalysisPanel.jsx` - simplify labels
- `src/components/AICoachPanel.jsx` - simplify labels
- `src/index.css` - reduce glow/shadow

### 6.11 Phase 11: Home Page

**Sửa:**
- `src/pages/Home.jsx` - polish hero, features, CTA
- `src/components/Navbar.jsx` - verify mobile nav

### 6.12 Phase 12: Cleanup

**Xóa (nếu có):**
- Các file backup hoặc unused imports
- Console.log statements không cần thiết

**Sửa:**
- Tất cả files - cleanup, verify build

---

## 7. Rủi Ro Khi Refactor

### 7.1 Rủi Ro Cao

**🔴 Mất chức năng hiện có:**
- Bot move logic
- Stockfish analysis
- Analysis mode (replay)
- Move annotations
- Auto-analyze
- Game review

**Mitigation:**
- Test từng chức năng sau mỗi phase
- Không xóa code cũ cho đến khi verify code mới hoạt động
- Commit nhỏ, thường xuyên

**🔴 State synchronization issues:**
- Khi migrate sang Context/Zustand, dễ miss state updates
- Bot move có thể trigger khi không nên

**Mitigation:**
- Viết state manager cẩn thận
- Test bot mode kỹ
- Test analysis mode kỹ

### 7.2 Rủi Ro Trung Bình

**🟡 Performance regression:**
- Re-renders không cần thiết
- Stockfish worker race conditions

**Mitigation:**
- Dùng React.memo, useMemo, useCallback đúng chỗ
- Verify worker cleanup
- Test trên mobile

**🟡 UI/UX regression:**
- Layout bị vỡ trên mobile
- Legal move hints không hiển thị
- Drag and drop không mượt

**Mitigation:**
- Test responsive trên nhiều screen sizes
- Test touch events trên mobile
- Giữ CSS classes hiện có nếu đang hoạt động tốt

### 7.3 Rủi Ro Thấp

**🟢 Build errors:**
- Import paths sai
- Missing dependencies

**Mitigation:**
- Chạy `npm run build` sau mỗi phase
- Fix errors ngay

---

## 8. Đề Xuất Thứ Tự Phase Tiếp Theo

### ✅ Phase 1: Chuẩn Hóa chess.js (DONE - đã verify)
- chess.js đã là single source of truth
- Không có custom logic nguy hiểm
- Chỉ cần verify lại và document

### 🔄 Phase 2: State Manager (CRITICAL)
- Tạo Context/Zustand store
- Migrate game state ra khỏi component
- Foundation cho các phase sau

### 🔄 Phase 3: Refactor Components (CRITICAL)
- Tách ChessGameBoard.jsx thành smaller components
- Tạo custom hooks
- Giảm complexity

### 🔄 Phase 4: UI Bàn Cờ (MEDIUM)
- Polish drag/click/tap
- Responsive sizing
- Legal move indicators

### 🔄 Phase 5: Promotion UI (MEDIUM)
- Tạo PromotionModal
- Intercept promotion moves
- User chọn quân

### 🔄 Phase 6: Bot & Stockfish (MEDIUM)
- Tách logic vào hooks
- Verify worker cleanup
- Test race conditions

### 🔄 Phase 7: Layout (LOW)
- Mobile-first layout
- Desktop 2-column
- Responsive

### 🔄 Phase 8: Game Controls (LOW)
- Timer
- Polish buttons
- Mode selector

### 🔄 Phase 9: Move History (LOW)
- PGN display
- Copy button
- Annotations

### 🔄 Phase 10: Polish UI (LOW)
- Remove technical text
- Reduce glow/shadow
- Simplify labels

### 🔄 Phase 11: Home Page (LOW)
- Polish hero
- Features grid
- CTA

### 🔄 Phase 12: Cleanup (LOW)
- Remove unused code
- Verify build
- Test all features

---

## 9. Kết Luận

**Codebase hiện tại:**
- ✅ Hoạt động tốt
- ✅ Có nhiều features
- ✅ Dùng chess.js và react-chessboard đúng cách
- ❌ Kiến trúc cần refactor để dễ maintain

**Ưu tiên cao nhất:**
1. Phase 2: State Manager
2. Phase 3: Refactor Components
3. Phase 5: Promotion UI

**Ưu tiên trung bình:**
4. Phase 4: UI Bàn Cờ
5. Phase 6: Bot & Stockfish

**Ưu tiên thấp:**
6. Phase 7-11: Layout, Controls, History, Polish, Home

**Rủi ro lớn nhất:**
- Mất chức năng khi refactor
- State sync issues

**Mitigation:**
- Test kỹ sau mỗi phase
- Commit nhỏ, thường xuyên
- Không xóa code cũ cho đến khi verify

---

## 10. Next Steps

1. ✅ **Phase 0 DONE** - Audit complete
2. 🔄 **Phase 1** - Verify chess.js (quick check)
3. 🔄 **Phase 2** - Create state manager (Context API recommended)
4. 🔄 **Phase 3** - Refactor components (biggest effort)
5. 🔄 **Phase 4-12** - Incremental improvements

**Estimated effort:**
- Phase 0: ✅ Done
- Phase 1: 30 minutes (verify only)
- Phase 2: 2-3 hours
- Phase 3: 4-6 hours
- Phase 4-12: 6-8 hours total

**Total: ~15-20 hours** for complete refactor.

---

**End of Phase 0 Audit Report**
