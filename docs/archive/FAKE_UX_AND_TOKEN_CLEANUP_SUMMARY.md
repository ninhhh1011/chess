# Báo cáo: Xử lý Fake UX và Dọn dẹp Tokens cũ

## 1. Xử lý Fake UX tại Pre-game Lobby
- **Mục tiêu ván (`gameGoal`)**: Đã lưu trạng thái vào `ChessGameContext` (có thể truy xuất bằng `useChessGame().gameGoal`). Trạng thái này không còn là local state giả lập nữa mà đã được đẩy lên context để toàn app có thể tái sử dụng.
- **Thời gian (`timeControl`)**: Các tuỳ chọn 10 phút, 5+3, 3+2 đã bị `disabled` và thêm nhãn "Sắp có" để minh bạch với người dùng là chưa có đồng hồ thời gian thật (ưu tiên Hướng A - Ẩn/disable).
- Khi bấm "Bắt đầu ván", hàm `startGame()` giờ đã lưu chính xác `gameGoal` và `timeControl` vào hệ thống.

## 2. Nâng cấp Post-game Review trung thực hơn
- Lời khuyên từ Ninh (Bài học) giờ đã phân nhánh linh hoạt dựa trên `gameGoal` (Chơi vui / Luyện khai cuộc / Hạn chế blunder / Luyện chiếu hết).
- Cảnh báo blunder được tuỳ biến riêng nếu mục tiêu ván là "Hạn chế blunder".
- **Không tự bịa dữ liệu**: Nếu engine không ghi lại lịch sử nước người chơi (chỉ có `bestSan`), UI sẽ hiển thị chính xác "Lỗi lớn nhất: Chưa đủ dữ liệu để xác định" và "Nước engine gợi ý" thay vì nói dối là "Nước tệ nhất của bạn".

## 3. Chỉnh sửa Copy Marketing chưa kiểm chứng
- Đã sửa claim vô căn cứ ở `src/pages/Home.jsx`: *"Tham gia cùng hàng nghìn người học..."*
- Chuyển thành copy trung thực, đánh trúng giá trị cốt lõi: *"Chơi một ván, nhận nhận xét ngắn gọn, rồi luyện lại điểm yếu quan trọng nhất cùng Ninh."*

## 4. Dọn dẹp Token và Style cũ triệt để (No AI Template look)
- Càng quét và thay thế tất cả các token style tạo cảm giác template:
  - Bỏ hoàn toàn: `backdrop-blur`, `shadow-glow`, các style `bg-white/x` được quy về màu hệ thống `bg-slate-800`.
  - Giảm độ cong từ `rounded-3xl` và `rounded-[2rem]` thành `rounded-xl`.
  - Thay thế màu `text-cream` thành `text-slate-100`, `text-cream/70` thành `text-slate-400`.
  - Thay thế `bg-ink` thành `bg-slate-950`.
  - Chuyển đổi hiệu ứng `hover:-translate-y-1` thành các hiệu ứng hover đổi màu biên/nền lịch thiệp hơn (`hover:border-slate-600 hover:bg-slate-800/80`).

## 5. Kết quả Build & Rủi ro
- Đã chạy `npm run build` thành công, không gặp lỗi.
- **Rủi ro còn lại**: Tính năng Time Control cần xây dựng cơ chế đếm ngược thật ở backend để có thể kích hoạt các option đã bị disabled.
