# BÁO CÁO AUDIT GIAO DIỆN HIỆN TẠI (BASELINE UI AUDIT)

**Repository:** [ninhhh1011/chess](https://github.com/ninhhh1011/chess)  
**Thời gian thực hiện:** 05/09/2026  
**Công cụ kiểm định:** Code analysis, DOM inspection, Playwright Screenshots (Desktop 1440x900, Mobile 390x844).

---

## 1. Tổng quan kiến trúc UI hiện tại

Hệ thống giao diện hiện tại của ứng dụng cờ vua được xây dựng trên:
- **Tailwind CSS v3.4.19** với cấu hình token tuỳ biến trong `tailwind.config.js`.
- **Framer Motion v13.1.1** cho các hiệu ứng chuyển trang, hover card, spring tab indicator.
- Hệ thống design system nguyên thuỷ tại `src/design-system/primitives/` (Button, Card, Input, Badge) kết hợp với các class CSS tầng components tại `src/index.css` (`.ui-button-primary`, `.btn-primary`, `.panel`, `.card`).
- **react-chessboard v5.10.0** hiển thị bàn cờ.

---

## 2. Các vấn đề cốt lõi phát hiện qua Audit

### 2.1. Phân mảnh & Xung đột Token Màu (Competing Colors & Token Drift)
- **Xung đột nghiêm trọng giữa CSS Variables và Tailwind Config:**
  - Trong `tailwind.config.js`: `primary-500` được định nghĩa là màu **Indigo** (`#6366F1`), `primary-600` là `#4F46E5`.
  - Tuy nhiên trong `src/index.css`: `:root` lại định nghĩa `--color-primary: #3ecf8e` (màu **Emerald / Xanh lá Supabase**) và `--color-accent: #3ecf8e`.
  - Kết quả: Các trang pha trộn lộn xộn giữa nút màu xanh lá ngọc (`btn-primary` trong `Training.jsx`), nút màu xanh chàm (`Button.tsx` trong `Home.tsx`), và badge màu vàng hổ phách (`accent`).
- **Thiếu semantic role phân định:**
  - Màu xanh lá vừa được dùng làm brand accent, vừa làm success indicator, vừa dùng cho nút hành động chính. Người dùng khó phân biệt đâu là phản hồi kết quả cờ (nước đi đúng) và đâu là nút bấm điều hướng.

### 2.2. Lạm dụng Thẻ lồng nhau (Nested Cards) & Cạnh tranh Thị giác
- **Tại màn hình Huấn luyện (`Training.jsx`):**
  - Khung bao ngoài là card lớn `bg-bg-surface border border-border`, bên trong lại chứa 2 sub-cards thống kê (`bg-bg-elevated p-4`), bên cạnh là card Lộ trình lồng tiếp danh sách task cards (`bg-bg-elevated px-4 py-3`).
  - Mật độ viền (borders) và các mảng nền nổi (surfaces) chồng chéo tạo cảm giác nặng nề, thiếu tính phân cấp thông tin.
- **Tại Pre-game Lobby (`PreGameLobby.jsx`):**
  - 4 cấp độ Bot được dàn thành 4 khối card lớn có mô tả dài, chiếm trọn chiều cao màn hình khiến nút bấm hành động chính "Bắt đầu ván" bị đẩy xuống sâu.

### 2.3. Radius và Shadow không đồng nhất
- **Radius:**
  - `Home.tsx`: Hero dùng `rounded-3xl` (24px).
  - `Card.tsx`: Dùng `rounded-xl` (16px).
  - `Button.tsx`: Dùng `rounded-lg` (8px).
  - `Navbar.tsx`: Logo dùng `rounded-lg`, avatar dùng `rounded-full` hoặc `rounded-lg`.
  - Không có quy tắc radius scale chặt chẽ giữa container lớn, panel trung gian và nút điều khiển.
- **Shadow:**
  - Xuất hiện rải rác `shadow-md`, `shadow-lg`, `shadow-2xl`, `shadow-glow`, và `shadow-[0_1px_0_rgba(255,255,255,0.03)]`. Hover card có hiệu ứng nâng bóng `hover:shadow-black/20` tạo cảm giác thiếu tinh tế của dashboard thương mại.

### 2.4. Trực quan Bàn cờ và Mật độ Sidebar (`Play.jsx` / `GameLayout.jsx`)
- **Tâm điểm thị giác bị phân tán:**
  - Bàn cờ vua phải là trung tâm tuyệt đối của trải nghiệm, nhưng đang bị kẹp giữa thanh trạng thái `GameInfoBar`, hai dải thông tin người chơi `PlayerBar` dày đặc và thanh `LiveEvaluationBar`.
  - Sidebar bên phải chia thành 4 tabs (*Biên bản, Phân tích, AI Coach, Cài đặt*), tuy nhiên khi mở tab Coach, người dùng phải bấm thêm nút "Mở rộng" mới thấy nội dung, hoặc bị che khuất bởi cuộn dọc dài.
- **Cụm Badge trạng thái gây quá tải:**
  - `AICoachPanel.tsx` hiển thị đồng thời 5-6 badges màu sắc khác nhau: `[Engine]`, `[AI]`, `[Basic]`, `[Knowledge off]`. Cách thể hiện này mang tính chất debug/kỹ thuật hơn là trải nghiệm cờ vua thân thiện cho người học. Cần tinh gọn thành một dòng trạng thái chân thực: *"Nguồn: Stockfish · Diễn giải cơ bản"*.

### 2.5. Motion & Chuyển động (Spring & Transitions)
- **Thiếu "Quiet Motion":**
  - Các nút `Button.tsx` dùng Framer Motion `whileHover={{ scale: 1.02 }}` và `whileTap={{ scale: 0.98 }}` liên tục thay đổi kích thước layout khi rê chuột.
  - Tab indicator trên Navbar dùng Spring `stiffness: 400, damping: 30` có độ nảy hơi quá mức cần thiết đối với một ứng dụng nghiêm túc về học tập và rèn luyện tư duy.
  - Cần chuyển sang các micro-transitions nhanh gọn từ 80ms - 180ms với `prefers-reduced-motion` được hỗ trợ toàn diện.

### 2.6. Responsive & Trải nghiệm Mobile
- Trên viewport mobile 390x844:
  - Bàn cờ chiếm gần hết màn hình, thanh điều khiển `GameControls` bị đẩy xuống phía dưới thanh cuộn.
  - Bảng AI Coach trên mobile khi mở rộng chiếm nhiều không gian, dễ che lấp các nước cờ đang diễn ra.
  - Các nút hành động cần đảm bảo touch target tối thiểu 44x44px.

---

## 3. Danh sách ảnh chụp Baseline đã lưu trữ

Tất cả ảnh chụp màn hình baseline thực tế của ứng dụng hiện tại đã được lưu vào:
- [ui-lab/screenshots/baseline/home-desktop.png](file:///e:/chess/ui-lab/screenshots/baseline/home-desktop.png) (1440x900)
- [ui-lab/screenshots/baseline/lobby-desktop.png](file:///e:/chess/ui-lab/screenshots/baseline/lobby-desktop.png) (1440x900)
- [ui-lab/screenshots/baseline/play-desktop.png](file:///e:/chess/ui-lab/screenshots/baseline/play-desktop.png) (1440x900)
- [ui-lab/screenshots/baseline/training-desktop.png](file:///e:/chess/ui-lab/screenshots/baseline/training-desktop.png) (1440x900)
- [ui-lab/screenshots/baseline/home-mobile.png](file:///e:/chess/ui-lab/screenshots/baseline/home-mobile.png) (390x844)
- [ui-lab/screenshots/baseline/lobby-mobile.png](file:///e:/chess/ui-lab/screenshots/baseline/lobby-mobile.png) (390x844)
- [ui-lab/screenshots/baseline/play-mobile.png](file:///e:/chess/ui-lab/screenshots/baseline/play-mobile.png) (390x844)
- [ui-lab/screenshots/baseline/training-mobile.png](file:///e:/chess/ui-lab/screenshots/baseline/training-mobile.png) (390x844)

---

## 4. Kết luận cho giai đoạn Prototype

Giao diện prototype độc lập trong `ui-lab/` cần giải quyết dứt điểm các vấn đề trên thông qua:
1. **Thiết lập hệ thống Theme Tokens đồng nhất** với CSS Variables (Option A, B, C, D) kiểm soát chính xác radius (8px - 12px), loại bỏ hoàn toàn gradient text và glow shadow.
2. **Wrapper Architecture cho HeroUI v3:** Kiểm soát tập trung `AppButton`, `AppDialog`, `AppTabs`, `AppField`, `AppSelect`, `AppStatus`, `AppTooltip`.
3. **Thanh lọc cấu trúc màn chơi:** Đưa bàn cờ làm trung tâm (65% width trên desktop), sidebar 3 tab tinh gọn, đưa cài đặt vào Popover.
4. **Hệ thống đánh giá Post-Game Review tập trung vào 3 lỗi lớn nhất (MistakeReviewRow)** thay vì card thống kê khổng lồ.
