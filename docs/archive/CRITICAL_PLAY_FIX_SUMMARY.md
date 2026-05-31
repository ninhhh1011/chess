# Báo cáo Cập nhật Lỗi Nghiêm Trọng /play (CRITICAL PLAY FIX)

## 1. Lỗi nặng đã sửa
- **Fake UX Lobby**: `gameGoal` và `timeControl` đã được tích hợp làm trạng thái thật trong `ChessGameContext.tsx`. Các tùy chọn thời gian ảo (10 phút, 5+3, 3+2) đã bị vô hiệu hóa (disabled) và gắn mác `Sắp có`.
- **Review sai Flow**: PostGameReview không còn gán `setPlayState('playing')` gây nhầm lẫn. Nút "Xem lại bàn cờ" đã đổi thành "Xem lại từng nước" và gọi chuẩn xác hàm `enterAnalysisMode()`, kích hoạt trạng thái `analysis` thật sự của app.
- **Thiếu chức năng chơi**: Đã có thêm Review Navigator hoàn chỉnh để lùi/tiến xem lại các nước. Trong lúc chơi, thanh `GameControls` đã có đầy đủ chức năng: Undo (Đi lại), Đầu hàng (Confirm rõ ràng), Ván mới (Đổi thiết lập / Chơi lại), Xoay bàn cờ.
- **Xoay bàn cờ**: `ChessBoardPanel` hiện được đồng bộ với `boardOrientation` qua context, và mặc định xoay mặt theo màu người dùng chọn (Trắng/Đen).
- **Post-Game Review ảo**: Nhận xét từ Ninh giờ đây sử dụng đúng dữ liệu của `gameGoal`. Lỗi Blunder không xác định được hiển thị rõ ràng là "Chưa đủ dữ liệu" thay vì gán nhầm.
- **AI Coach rác**: 3 nút chức năng đã được ép format gắt gao (không quá 45 từ). FE đã cắt chuỗi ở 300 ký tự và có Loading State / Error State chuẩn.

## 2. File đã sửa (Tổng hợp qua các phiên trước)
- `src/components/chess/PreGameLobby.jsx`
- `src/contexts/ChessGameContext.tsx`
- `src/components/chess/PostGameReview.jsx`
- `src/components/chess/GameControls.jsx`
- `src/components/chess/ReviewNavigator.jsx` (Tạo mới)
- `src/components/AICoachPanel.jsx`

## 3. Flow test
1. Vào sảnh `/play`, chọn "Chơi vui". Các ô thời gian ảo đã xám màu không thể chọn. Bấm Bắt đầu.
2. Ván cờ hiển thị với Game Controls. Bấm Xoay bàn (🔃) -> Bàn cờ xoay ngược.
3. Đi thử 1 nước, bấm Undo -> Bàn cờ lùi lại, engine ngắt phân tích.
4. Bấm 🏳️ Đầu hàng -> Hỏi xác nhận -> Chấp nhận.
5. Ván cờ văng ra màn hình Post-Game Review. Thông báo "Đen/Trắng thắng do bạn đầu hàng".
6. Bài học từ Ninh được bám theo `gameGoal` (Chơi vui). Nhấn "Xem lại từng nước".
7. Bàn cờ chuyển sang chế độ Analysis với `ReviewNavigator` bên dưới cho phép tiến lùi các nước đi.
8. Ở tab AI Coach, bấm "Nhận xét nhanh", Coach load 1 giây rồi trả lời ngắn ngọn đúng định dạng UI.

## 4. Build Result
Lệnh `npm run build` đã chạy thành công 100%, TypeScript build pass, thời gian hoàn thành dưới 3s.

## 5. Rủi ro còn lại
- Nút "Gợi ý" trong `GameControls` hiện đang để placeholder, vì Engine phân tích (Engine Hint) đã được tự động highlight realtime trên UI.
