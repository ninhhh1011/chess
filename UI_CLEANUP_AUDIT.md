# UI Cleanup Audit

Dựa trên việc kiểm tra mã nguồn và layout hiện tại của dự án, dưới đây là các vấn đề UI/UX cần khắc phục để chuyển đổi từ phong cách "SaaS/AI Dashboard" sang một "Clean Chess App" chuyên nghiệp:

## 1. Vấn đề về Layout chung
- **Quá nhiều hiệu ứng Glass/Neon**: Các trang như `Home.jsx` đang sử dụng quá nhiều `backdrop-blur`, `shadow-glow`, và `bg-gradient` (ví dụ: `bg-gradient-to-br from-gold/20 to-amber-700/20 blur-2xl`). Điều này tạo cảm giác loè loẹt, không phù hợp với một ứng dụng chơi cờ tập trung.
- **Màu sắc thiếu tiết chế**: Màu nhấn `gold/amber` đang bị lạm dụng ở khắp mọi nơi (viền, shadow, text, background gradient) khiến giao diện bị "AI-generated" và rác.
- **Card lồng trong card**: Các panel phụ (`GameLayout`) có viền lồng nhau quá nhiều (`border-slate-700/60 bg-slate-900/40`, bên trong lại có `bg-slate-800/40`), gây rối mắt.

## 2. Vấn đề Component System
- **Nút bấm (Buttons)**: `btn-primary` và `btn-secondary` hiện tại (trong `index.css`) đang khá to (`px-5 py-3`), shadow chưa tinh tế.
- **Typography**: Việc dùng quá nhiều `font-black`, `text-6xl`, text-gradient (`bg-gradient-to-br from-cream via-gold to-amber-400 bg-clip-text`) khiến UI nặng nề.
- **Badge/Tab**: Thiết kế tab đang sử dụng màu nền `bg-amber-500/20` và `border-amber-400`, hơi chói khi ở trong màn hình game.

## 3. Vấn đề Trang Game (GameLayout)
- **Cột phải (Panel phụ)**: Cần làm nền tệp vào background chính thay vì tạo thành một khối nổi bật (có viền và màu khác hẳn), để nhường "spotlight" cho bàn cờ.
- **Trạng thái ván đấu (GameInfoBar / PlayerBar)**: Cần được dọn dẹp lại cho thật gọn gàng, giảm bớt border và badge không cần thiết. Tránh việc trình bày như các thẻ (card) độc lập quá rời rạc.
- **Cột trái (Board Area)**: Bàn cờ đang có `box-shadow: 0 20px 60px rgba(2,6,23,.4)` (trong `ChessBoardPanel.jsx`). Nên làm shadow nhẹ lại hoặc bỏ hẳn để bàn cờ phẳng và chuyên nghiệp hơn như chess.com hay lichess.

## 4. Mobile Responsiveness
- Cần đảm bảo trên mobile chỉ có một cột duy nhất, bàn cờ đẩy lên đầu tiên. Cột phải (Lịch sử, AI, Phân tích) sẽ nằm dưới dạng tab hoặc collapse ngay bên dưới bàn cờ.
- Header trên mobile cần phải được thu gọn tối đa để tiết kiệm không gian theo chiều dọc (đặc biệt khi chơi trên trình duyệt điện thoại thường bị che bởi thanh địa chỉ).

## 5. Dịch thuật & Nhất quán ngôn ngữ
- Đang có tình trạng mix tiếng Anh / Việt. Cần chuẩn hoá các mục trong Game Layout như "AI Coach", "Analysis", "Settings" thành "AI Coach" (hoặc Trợ lý AI, nhưng AI Coach có thể giữ nếu coi là danh từ riêng), "Phân tích", "Cài đặt". 

## Hướng giải quyết đề xuất (Thiết kế lại):
1. **Màu sắc**: Chuyển màu nền về tông solid hoặc dải màu rất nhẹ: `slate-900` hoặc `zinc-950`. Lấy màu board làm trung tâm. Màu `amber-500` chỉ dùng cho nút Primary hoặc các indicator cực kỳ quan trọng.
2. **Loại bỏ**: Xoá toàn bộ `shadow-glow`, xoá các `absolute` element dùng để làm hiệu ứng phát sáng (`blur-2xl bg-gradient`).
3. **Typography**: Giảm weight của các title từ `font-black` xuống `font-bold` hoặc `font-semibold`.
4. **Layout Game**: Bỏ viền của panel phải, dùng chung tông màu nền với background tổng nhưng sáng hơn 1 chút (ví dụ `bg-slate-900` cho nền, `bg-slate-800/50` cho panel nhưng không viền rườm rà).
