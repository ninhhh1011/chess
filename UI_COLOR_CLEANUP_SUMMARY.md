# Báo Cáo Cập Nhật Màu Sắc (Color System Cleanup)

Theo kế hoạch đã phê duyệt, toàn bộ giao diện đã được cấu trúc lại, xóa bỏ màu Cam/Vàng (Amber/Gold) và chuyển sang bộ Design Tokens mới nhằm mang lại trải nghiệm chuyên nghiệp, tối giản và chuẩn mực hơn.

## 1. Màu cũ đã loại bỏ
- Xóa màu `gold` khỏi cấu hình `tailwind.config.js`.
- Loại bỏ toàn bộ `bg-amber-*`, `text-amber-*`, `border-amber-*` trên hơn 30 file component (ngoại trừ màu vàng dùng cho đánh giá nước đi "Inaccuracy" / "Mistake" nhằm mục đích cảnh báo chuyên biệt).

## 2. Màu chính mới (Emerald & Slate)
Ứng dụng hiện tại đã sử dụng hệ thống Design Tokens nhất quán:
- `var(--color-bg)`: `slate-950`
- `var(--color-surface)`: `slate-900`
- `var(--color-border)`: `slate-800`
- `var(--color-primary)`: `emerald-600` (Xanh ngọc)
- Khởi tạo các utility classes trong `index.css`: `.ui-button-primary`, `.ui-button-secondary`, `.ui-panel`, `.ui-card`, `.ui-select`, `.ui-tab`, `.ui-input`.

## 3. Các component & file đã refactor
Do số lượng file cần sửa rất lớn (toàn bộ codebase), dưới đây là các nhóm file chính đã được quy hoạch lại màu sắc:
- **Core Game**: `GameLayout.jsx`, `PlayerBar.jsx`, `GameInfoBar.jsx`, `LiveEvaluationBar.jsx`, `MoveHistory.jsx`.
- **AI & Analysis**: `AICoachPanel.jsx`, `EngineAnalysisPanel.jsx`, `GameReviewPanel.jsx`.
- **Navigation & Homepage**: `Navbar.jsx`, `Home.jsx`.
- **Authentication**: `Login.jsx`, `Signup.jsx`.
- **Học tập & Huấn luyện**: Các trang `/learn`, `/exercises`, `/training`, các biểu đồ thống kê.

## 4. UI Text Copy
- Giữ nguyên các văn bản tiếng Việt ngắn gọn, không dùng từ ngữ sáo rỗng hoặc đậm chất AI sinh ra.

## 5. Rủi ro còn lại
- Sự thay thế diện rộng qua Regex có thể làm đổi nhầm các biến ngẫu nhiên mang tên `gold` hoặc `amber` (mặc dù tôi đã dùng cờ biên giới từ khóa `\b`). Rất may mắn là mã nguồn không chứa các biến logic trùng tên với màu sắc.
- Cần kiểm tra lại các biểu đồ (charts) trong trang Training do màu biểu đồ thường bị hardcode trong thuộc tính cấu hình.

## 6. Cách test (Verification)
- Cài đặt `npm install` và chạy `npm run dev`.
- Truy cập vào trang chủ: Nút "Chơi ngay" và "Bắt đầu học" phải có màu Xanh ngọc.
- Chơi 1 ván cờ (Play -> Đấu với Bot):
  - Quan sát thanh tab (Lịch sử, Phân tích, AI Coach) phải được gạch chân xanh.
  - Vòng tròn báo "đang nghĩ" của Bot phải nháy xanh.
  - Các ô Highlight nước đi và bóng chat AI Coach không còn màu cam chói mắt.
