# Tóm tắt Khảo sát Màu sắc (Color UI Audit)

Theo yêu cầu, tôi đã dùng tính năng tìm kiếm toàn bộ source code của dự án để đánh giá thực trạng sử dụng màu sắc, đặc biệt là nhóm màu `amber`, `gold`, `yellow`, `orange`. Kết quả cho thấy nhóm màu này đang bị lạm dụng nghiêm trọng, gây ra cảm giác "AI-generated template" và làm rối mắt, mất tập trung vào bàn cờ.

## 1. Các vị trí lạm dụng màu Cam/Vàng (Amber/Gold/Orange)
Qua tìm kiếm, có hơn 30 file đang sử dụng các class màu này như màu chủ đạo:
- **`tailwind.config.js`**: Định nghĩa sẵn màu `gold: '#f59e0b'` như một primary color không chính thức.
- **`src/index.css`**: Các button chính (`.btn-primary`) đang dùng nền `bg-amber-600` và hover `bg-amber-500`.
- **Thanh Navbar (`src/components/Navbar.jsx`)**: Icon Vua Cờ dùng nền `bg-amber-600`.
- **Trang chủ (`Home.jsx`)**: Các badge `text-amber-500`, các thẻ tính năng hover hiện `text-amber-500`.
- **Trang Game (`GameLayout.jsx`, `PlayerBar.jsx`, `GameInfoBar.jsx`)**: Active player dùng text và border `amber-500`, chấm tròn "đang nghĩ" dùng `bg-amber-400`.
- **Chat AI Coach (`AICoachPanel.jsx`)**: Bong bóng chat của người dùng dùng `bg-amber-600`, text `text-amber-500`.
- **Lịch sử nước đi (`MoveHistory.jsx`)**: Số thứ tự nước đi dùng `text-amber-300`, hover màu cam.
- **Các trang phụ (Training, Learn, Exercises, Authentication)**: Hàng loạt các file như `Login.jsx`, `Signup.jsx`, `Training.jsx`, `LevelProgress.jsx` đang dùng `gold/amber` cho các progress bar, biểu tượng, đường viền và button submit.
- **Glow & Shadow**: Vẫn còn rải rác một vài shadow/border mang sắc vàng nhạt.

## 2. Giải pháp: Lược bỏ và thay thế
- **Xóa**: Toàn bộ các class `.btn-primary` màu cam, các viền/border màu cam trên thẻ (card) hoặc tab, nền bong bóng chat AI màu cam, các text nhấn nhá (highlight) màu cam không có ý nghĩa quan trọng. Xóa luôn token `gold` khỏi `tailwind.config.js`.
- **Giữ lại rất hạn chế**: `orange` hoặc `amber` chỉ giữ lại ĐÚNG MỘT mục đích duy nhất: Đánh dấu nước đi phân loại là Inaccuracy (Sai số) hoặc Mistake (Lỗi) trong `MoveClassificationBadge.jsx`, hoặc cảnh báo Chiếu tướng (Check Warning). Tuyệt đối không dùng làm màu trang trí chung.

## 3. Hệ thống màu thay thế (Color System Proposal)
Để mang lại cảm giác sạch sẽ, chuyên nghiệp, dịu mắt và đúng chất cờ vua (Lichess/Chess.com style), tôi đề xuất sử dụng **Emerald (Xanh lục)** làm Primary Accent Color trên nền **Slate (Xám ngả xanh)**:
- **Nền chính**: `slate-950`
- **Surface (Card/Panel)**: `slate-900`
- **Border**: `slate-800`
- **Chữ chính**: `slate-100` (Title), `slate-400` (Text phụ)
- **Primary Action (Nút bấm, Active Tab)**: `emerald-600` (Hover: `emerald-500`). Màu xanh lá rất phù hợp để thể hiện các hành động tích cực, nước đi tốt, và an toàn cho mắt khi nhìn lâu.

*(Chi tiết các Design Tokens sẽ được thiết lập trong CSS)*
