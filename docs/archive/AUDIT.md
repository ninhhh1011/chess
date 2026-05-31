# Project Audit & Baseline Report

## Trạng thái tổng quan
Dự án "Ninh Lốp Trưởng Chess" là một ứng dụng chơi cờ vua React/Vite tích hợp Supabase, Stockfish và AI Coach. Core tính năng local và bot khá tốt, nhưng các tính năng nâng cao (Online Play, AI) và độ đồng nhất của UI chưa đạt mức production-ready. 

## Cấu trúc và Route
- `/`: Home
- `/play`: Chơi local/bot
- `/play/online/:gameId`: Online Play Beta
- `/learn`, `/exercises`, `/training`, `/openings`: Các module học tập
- `/login`, `/signup`: Auth bằng Supabase

## Đánh giá chi tiết các vùng lõi (Lỗi & Vấn đề)

### 1. Gameplay Core & Promotion (Độ ưu tiên: **Critical**)
- **Phát hiện:** Trong `ChessGameContext.tsx` hàm `makeMove`, có đoạn `const safePromotion = isPromotion ? (promotion || 'q') : promotion;` và trong `ChessBoardPanel.jsx`, sự kiện `onPieceDrop` tự động gọi `makeMove(sourceSquare, targetSquare, 'q')`. 
- **Vấn đề:** Điều này gây ra auto-promotion thành Hậu (Queen), không cho phép người chơi chọn Xe, Pháo, Mã.
- **Rủi ro:** Lỗi logic cờ cơ bản. Không được đụng vào phần validation gốc `chess.js` nhưng cần sửa luồng UI.

### 2. Online Play (Độ ưu tiên: **High**)
- **Phát hiện:** `OnlinePlay.jsx` bọc `<GameLayout><ChessGameBoard /></GameLayout>`. Tuy nhiên, `<GameLayout>` không hề nhận prop `children`! Nó tự render `ChessBoardPanel`. Điều này có nghĩa là OnlinePlay render sai cấu trúc component.
- **Phát hiện 2:** Không có guard rõ ràng cho trường hợp thiếu biến môi trường Supabase.
- **Phát hiện 3:** Không có validate lượt đi (spectator hay player khác có thể emit move qua local interceptor `window.addEventListener('chess-move-made', ...)`).
- **Phát hiện 4:** Có lỗi copy tiếng Anh trên UI ("Joining game...", "Waiting for opponent...").

### 3. AI Coach API Transparency (Độ ưu tiên: **Medium**)
- **Phát hiện:** `aiCoachApiService.js` tự động fallback về `mockCoachService` nếu API lỗi mạng. Tuy nhiên, nó chỉ trả về source là `mock` hoặc `fallback`, nhưng phía UI (`AICoachPanel.jsx`) không hiển thị rõ ràng cho người dùng biết đây là câu trả lời được lập trình sẵn hay AI thật.
- **Phát hiện 2:** API Server (`api/coach.js`) không validate kỹ body (chỉ lấy thẳng `message`, `history`...) và có thể bị lỗi 500 nếu payload sai lệch.

### 4. UI Copy Inconsistency (Độ ưu tiên: **Medium**)
- **Phát hiện:** `OnlinePlay.jsx` và một vài chỗ khác dùng text hardcode tiếng Anh: "Go Home", "Game abandoned due to inactivity." v.v.
- **Vấn đề:** Gây lấn cấn trải nghiệm người dùng vì định hướng là tiếng Việt meme-style.

### 5. Repository Hygiene (Độ ưu tiên: **Low**)
- **Phát hiện:** Dù thư mục root hiện tại đã khá sạch (được dọn ở lần trước), nhưng có thể còn những file docs dư thừa hoặc tệp rác. Cần duy trì trạng thái "clean". README mới được viết khá tốt nhưng cần kiểm tra lại độ "production claim" của tính năng Online.

### 6. State Architecture (Độ ưu tiên: **Medium**)
- **Phát hiện:** `ChessGameContext.tsx` dài hơn 500 dòng, chứa tất tần tật từ logic cờ, state engine, UI state, auth-related (chút xíu), promotion state.
- **Đề xuất:** Chưa nên đập đi xây lại toàn bộ vì rủi ro vỡ app rất cao. Có thể tách riêng helper (vd: getLegalMoves, getKingSquare, promotion detect) ra một file `gameHelpers.ts`.

---

## Đề xuất thứ tự sửa (Thực hiện tuần tự)
1. **PHASE 1:** Cleanup Docs & Repo (Kiểm tra lại cấu trúc root và README).
2. **PHASE 2:** Chuẩn hóa UI Copy tiếng Việt.
3. **PHASE 3:** Sửa Core Chess Gameplay (Auto-queen Promotion).
4. **PHASE 4:** Stabilize Online Play (Sửa lại kiến trúc render, thêm guard Supabase, ghi nhãn Beta).
5. **PHASE 5:** AI Coach Transparency (Minh bạch việc fallback mock AI trên UI).
6. **PHASE 6:** Refactor nhẹ State Architecture (Tách helper).
7. **PHASE 7:** Thêm QA Checklist và Testing.
8. **PHASE 8:** Hoàn thiện Portfolio Polish.

Báo cáo Audit hoàn tất. Mời bạn duyệt để tiến hành sang Phase 1.
