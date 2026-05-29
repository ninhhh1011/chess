# Báo Cáo UI Cleanup Giai Đoạn 2 (Second Pass Review)

Quá trình "Second Pass" đã dọn sạch hoàn toàn các tàn dư của phiên bản thiết kế cũ (cảm giác AI-generated, glassmorphism) trên toàn bộ ứng dụng, đồng bộ mọi ngóc ngách về chung một chuẩn Slate + Emerald.

## 1. Các Style cũ đã bị xóa (Legacy Styles)
- `text-cream`, `bg-ink`: Đã bị xóa và thay bằng `text-slate-100`/`text-slate-300` và `bg-slate-950`/`bg-slate-900`.
- `backdrop-blur`, `shadow-glow`, `shadow-2xl`: Xóa bỏ hoàn toàn, trả lại thiết kế phẳng (flat), sạch sẽ, sử dụng `shadow-sm` nhẹ nhàng.
- `bg-white/[.08]`, `bg-white/10`: Thay thế bằng màu nền hệ thống `bg-slate-800` để có tính đồng nhất cao hơn.
- `font-black`: Giảm cường độ xuống thành `font-bold` để tạo cảm giác tinh tế, bớt nặng nề.
- `rounded-3xl`, `rounded-[2rem]`, `rounded-[1.5rem]`: Giảm độ bo góc xuống chuẩn chung của app là `rounded-xl`.

## 2. Chuẩn hóa Bàn cờ (Board Theme)
- Các màu bàn cờ lạ (nâu/vàng) như `#7a4f2d`, `#f7e4bf`, `#8a5a32`, `#f4ddb5` tại các trang Learn, Exercises, OpeningTrainer đã được chuyển đổi sang màu **Slate** (ô tối `#334155`, ô sáng `#94a3b8`).
- Mọi nơi hiển thị bàn cờ (Play, Home, Training, v.v.) hiện tại đều dùng duy nhất một tông màu nhất quán.

## 3. Brand Update
- Chuyển thương hiệu từ "Vua Cờ" thành **"Play Chess with Ninh"**.
- Các hằng số được gom vào `src/constants/brand.js` để dễ dàng thay đổi ở một nơi duy nhất. Đã áp dụng trên Navbar và trang Home.

## 4. Code & Build Cleanup
- Đã sửa lỗi kiến trúc (code smell) trong `GameLayout.jsx` bằng cách đẩy import `getSanFromUci` lên đầu file, bỏ việc gọi hàm `require()` trong lúc render component (tránh crash khi build production).
- Đã chạy thành công lệnh `npm run build` không có cảnh báo.

## 5. Danh sách các file bị ảnh hưởng
Gần như toàn bộ file `.jsx` liên quan đến UI:
- **Trang chính**: `Learn.jsx`, `Exercises.jsx`, `Training.jsx`, `Openings.jsx`, `OpeningDetail.jsx`, `Login.jsx`, `Signup.jsx`, `Home.jsx`.
- **Thành phần**: `LessonCard.jsx`, `ExerciseBoard.jsx`, `SyncStatusBadge.jsx`, `OpeningCard.jsx`, `OpeningCoachPanel.jsx`, `OpeningTrainerBoard.jsx`, `DailyTrainingPlan.jsx`, `LevelProgress.jsx`, `RecommendedExercises.jsx`, v.v.
- **Thành phần Play**: `GameLayout.jsx`, `ChessBoardPanel.jsx`.

## 6. Vấn đề còn tồn tại
- Hiện tại, mọi class giao diện đã được dọn sạch hoàn hảo. Codebase cực kỳ quy củ. Tuy nhiên, nếu bạn tạo ra component mới trong tương lai, vui lòng sử dụng các biến CSS `.ui-card`, `.ui-button-primary` thay vì hard-code các class của Tailwind để tránh phá vỡ Design System.
