# Báo cáo Nâng cấp: Play Chess with Ninh

## 1. Các Component Đã Thêm Mới
- `src/components/chess/PreGameLobby.jsx`: Giao diện phòng chờ (Lobby) trước khi vào ván cờ. Hỗ trợ người dùng chọn Bot Elo (Dễ/TB/Khó), Màu quân, Mục tiêu và Thời gian.
- `src/components/chess/PostGameReview.jsx`: Bảng tóm tắt sau trận đấu. Hiển thị dưới dạng Modal đè lên bàn cờ, giúp người dùng xem lại số liệu ván đấu (Tổng số nước, sai lầm, blunder) và nhận được 1 câu lời khuyên/bài học rút ra từ Ninh lốp trưởng.

## 2. Các File Đã Sửa Đổi
- `src/config/brand.js`: (Mới tạo từ `constants`) Quy tụ toàn bộ cấu hình thương hiệu về một mối với tên `Play Chess with Ninh`.
- `src/contexts/ChessGameContext.jsx`: Bổ sung thêm state `playState` (`'lobby'`, `'playing'`, `'review'`) để quản lý rành mạch luồng (flow) của ván chơi.
- `src/components/chess/GameLayout.jsx`: Tích hợp flow 3 bước:
  - Nếu ở `lobby` -> Hiện `PreGameLobby`.
  - Nếu ở `playing` -> Hiện Bàn cờ và Sidebar hiện tại.
  - Nếu ở `review` -> Hiện thêm modal `PostGameReview` đè lên giao diện `playing`.
  - Loại bỏ hoàn toàn `ResultModal` cũ vì đã có `PostGameReview` thay thế.
- `src/components/AICoachPanel.jsx`: Gỡ bỏ tính năng chatbot, chuyển thành một Panel Tư vấn Tĩnh. Người dùng có 3 nút bấm thao tác nhanh để lấy nhận xét, cảnh báo chú ý hoặc gợi ý nước đi mà không cần type chữ phức tạp.
- `src/components/ChessGameBoard.jsx`: Lắng nghe sự kiện `isGameOver` để tự động chuyển `playState` sang `'review'`.
- `src/pages/Home.jsx`, `src/components/Navbar.jsx`: Cập nhật lại brand references.

## 3. Flow Hệ Thống (Trải nghiệm người dùng)
- **Trước ván đấu (Lobby):** Người chơi không bị đẩy ngay vào một bàn cờ trống. Họ được chào đón bằng tiêu đề "Play Chess with Ninh", chủ động chọn setup trận đấu.
- **Trong ván đấu (Playing):** Bàn cờ là trung tâm. Sidebar bên phải (đặc biệt là tab Ninh Coach) đã được làm gọn sạch hơn, không còn tranh spotlight.
- **Sau ván đấu (Review):** Thay vì thông báo "Trắng thắng" cụt lủn, người dùng nhận được 1 màn hình tổng kết đẹp mắt, chỉ ra họ đánh thế nào và rút ra bài học gì, kèm lựa chọn Chơi Lại hoặc Xem lại ván cờ.

## 4. Frontend Mock
- **Time Control & Mục Tiêu:** Trên `PreGameLobby`, các tùy chọn thời gian (10 phút, 5+3...) và mục tiêu (Tập khai cuộc, Hạn chế blunder) hiện đang là mock ở frontend. Sẽ cần tích hợp sâu vào Stockfish Engine và Clock Timer ở Backend/Context trong giai đoạn phát triển tiếp theo.

## 5. Rủi ro & Khuyến nghị
- Vì `ResultModal` đã bị xóa, tính năng chơi 2 người (Local) trên cùng thiết bị cũng sẽ dùng chung `PostGameReview`. Tương lai nếu phân tách Online/Local, cần tinh chỉnh lại câu chữ của Ninh Coach trong phần Review cho phù hợp.
- Nên bổ sung hiệu ứng đồng hồ đếm ngược (Timer) ở GameInfoBar để hoàn thiện tính năng Time Control vừa thêm vào Lobby.

## Hướng dẫn Test
1. Khởi động app `npm run dev`.
2. Truy cập `/play`. Bạn sẽ thấy ngay **Pre-game Lobby**.
3. Thử chọn Bot cấp độ 1500, màu Đen. Ấn **"Bắt đầu ván"**.
4. Di chuyển vài nước (có thể test thử Ninh Coach bằng cách bấm các nút "Nhận xét", "Gợi ý").
5. Đợi kết thúc ván (hoặc cố tình đánh thua). Màn hình **Post-Game Review** sẽ hiện lên với thống kê chi tiết.
6. Bấm "Chơi ván mới" để vòng lặp quay lại Lobby.
