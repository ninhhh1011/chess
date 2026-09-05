# BÁO CÁO PHƯƠNG ÁN THIẾT KẾ GIAO DIỆN (UI OPTIONS REPORT)

**Dự án:** [ninhhh1011/chess](https://github.com/ninhhh1011/chess)  
**Môi trường thử nghiệm:** `ui-lab/` (Độc lập 100% với React 19, HeroUI v3.2.4, Tailwind CSS v4)  
**Thời gian thực hiện:** 05/09/2026  
**Trạng thái:** Prototype sẵn sàng xem trực tiếp trên local (`http://127.0.0.1:4175`)

---

## 1. Mục tiêu nghiên cứu & Khám phá UI

Mục tiêu chính của task là giải quyết dứt điểm các hạn chế cốt lõi của giao diện hiện tại mà không làm ảnh hưởng đến mã nguồn production:
- Xóa bỏ sự cạnh tranh màu sắc giữa Tailwind token (`indigo`) và CSS variable (`emerald`).
- Giảm thiểu việc lạm dụng thẻ lồng nhau (nested cards) và bóng đổ glow rực rỡ.
- Đặt bàn cờ làm trung tâm thị giác tuyệt đối (chiếm 65% bề rộng trên desktop), cấu trúc lại sidebar thành 3 tab tinh gọn.
- Tái thiết kế trải nghiệm đánh giá ván cờ (Post-Game Review) tập trung vào 3 sai lầm lớn nhất thay vì dàn trải bảng thống kê khổng lồ.
- Đánh giá khả năng tương thích của thư viện chính thức **HeroUI v3 (v3.2.4)** và xây dựng kiến trúc wrapper an toàn cho lộ trình migration tương lai.

---

## 2. Baseline Giao diện Hiện tại (Current UI Baseline)

Chi tiết đã được audit đầy đủ tại tài liệu [ui-lab/CURRENT_UI_AUDIT.md](file:///e:/chess/ui-lab/CURRENT_UI_AUDIT.md). Tóm lược các phát hiện quan trọng:
1. **Token Drift & Competing Colors:** Nút bấm màu xanh lá ngọc (`#3ecf8e` trong `src/index.css`) xung đột với cấu hình Indigo (`#6366F1` trong `tailwind.config.js`).
2. **Quá tải thông tin trạng thái:** Bảng AI Coach hiển thị đồng thời 5-6 badges màu sắc kỹ thuật (`[Engine]`, `[AI]`, `[Basic]`, `[Knowledge off]`), làm rối mắt người học.
3. **Radius & Shadow thiếu nhất quán:** Nút bấm pill, card lồng nhau với radius từ 8px đến 24px, hover scale 1.02 liên tục gây xao nhãng.
4. **Ảnh chụp màn hình đối chứng baseline:** Đã lưu trữ tại `ui-lab/screenshots/baseline/`.

---

## 3. Kiến trúc Tích hợp HeroUI v3 (Integration Architecture)

- **Cô lập hoàn toàn:** Root project vẫn giữ nguyên Tailwind CSS v3.4.19. Thư viện `ui-lab/` chạy độc lập với Tailwind CSS v4 và HeroUI v3.2.4.
- **Phiên bản Pinned chính thức:**
  - `@heroui/react`: `3.2.4`
  - `@heroui/styles`: `3.2.4`
  - `react`: `19.2.5`
  - `react-dom`: `19.2.5`
- **Kiến trúc Wrapper:** Không screen nào import trực tiếp component từ HeroUI. Toàn bộ thông qua wrapper tại `ui-lab/src/ui/` (`AppButton`, `AppDialog`, `AppTabs`, `AppField`, `AppSelect`, `AppStatus`, `AppTooltip`). Điều này cho phép tinh chỉnh radius (8px), triệt tiêu glow shadow, và kiểm soát micro-transitions (80-180ms "Quiet Motion").

---

## 4. Phân định Thành phần: Dùng HeroUI vs Giữ Custom

### 4.1. Thành phần dùng HeroUI v3 (qua Wrapper):
- **Button / ButtonGroup:** Nút hành động, điều khiển ván đấu, chọn quân cờ.
- **Modal / Dialog:** Hộp thoại Post-Game Review, xác nhận đầu hàng.
- **Tabs:** Thanh điều hướng 3 tab sidebar (Ván đấu / Phân tích / Huấn luyện).
- **TextField / Input:** Ô nhập câu hỏi trợ lý AI, lọc bài tập.
- **Radio / Segmented Group:** Bộ chọn 4 cấp độ Bot (Dễ, Vừa, Khó, Thử thách) và chọn màu quân.
- **Select / Dropdown:** Menu chọn theme, cài đặt âm thanh.
- **Tooltip / Popover:** Chú thích nguồn gốc dữ liệu Stockfish.
- **ProgressBar & Skeleton:** Chỉ báo tiến độ kỹ năng và trạng thái chờ tính toán.

### 4.2. Thành phần giữ Custom (Bảo tồn ngữ nghĩa cờ vua):
- **ChessBoardPrototype:** Bàn cờ SVG tỷ lệ chuẩn, ô cờ sắc nét, overlay màu nước đi tĩnh (`var(--board-last-move)`, `var(--board-selected)`).
- **EvaluationBarPrototype:** Thanh đo thế trận centipawn/mate trực quan.
- **MoveHistoryPrototype:** Biên bản PGN hai cột hỗ trợ nhấp chọn nước cờ.
- **MistakeReviewRow:** Khối so sánh nước cờ thực tế vs nước cờ tối ưu, nguyên nhân và nút luyện tập liên quan.
- **DailyPlanPrototype:** Danh sách 5 nhiệm vụ ngày (1 học, 3 bài tập, 1 ván đấu).

---

## 5. Bốn Phương án Giao diện (Options A, B, C, D)

### Option A — Graphite + Cobalt + Warm Gold (Khuyến nghị Mặc định)
- **Bảng màu:**
  - Nền: `#0B0D12` (Graphite đậm) | Bề mặt: `#12171F` / `#181F29` | Viền: `#2A3442`
  - Tương tác (Accent): `#5B7CFA` (Cobalt) | Nước cờ (Highlight): `#C9A45A` (Warm Gold)
  - Bàn cờ: Ô sáng `#DCE2D4`, ô tối `#647565`
- **Ý đồ thẩm mỹ:** Hiện đại, sạch sẽ, không giống dashboard AI tím phổ thông. Cobalt dùng cho nút bấm và điều hướng, Warm Gold độc quyền cho nước cờ và thông tin quan trọng. Bàn cờ nổi bật hơn thanh điều khiển.
- **Đánh giá:** Lựa chọn cân bằng hoàn hảo cho ứng dụng cờ vua hiện đại, tập trung cao độ khi phân tích.

### Option B — Warm Paper + Forest + Walnut
- **Bảng màu:**
  - Nền: `#F5F1E8` (Giấy ngà ấm) | Bề mặt: `#FFFDF8` / `#EEE7DA` | Viền: `#D8CFBF`
  - Tương tác: `#2F6957` (Xanh rừng) | Nước cờ: `#A9783A` (Gỗ óc chó / Vàng đồng)
  - Bàn cờ: Ô sáng `#E7D6B8`, ô tối `#8A6548`
- **Ý đồ thẩm mỹ:** Cảm giác câu lạc bộ cờ truyền thống, sách dạy cờ kinh điển. Đọc nội dung bài học và lý thuyết dài không bị mỏi mắt.
- **Đánh giá:** Thích hợp nhất nếu sản phẩm định vị trọng tâm vào học sinh, thiếu nhi và giáo trình đào tạo bài bản.

### Option C — Charcoal + Pine + Copper
- **Bảng màu:**
  - Nền: `#0C100E` (Than chì ánh xanh) | Bề mặt: `#141A17` / `#1A221E` | Viền: `#2D3932`
  - Tương tác: `#3FAD79` (Xanh thông) | Nước cờ: `#C88954` (Đồng cổ)
  - Bàn cờ: Ô sáng `#DAD2BD`, ô tối `#66745C`
- **Ý đồ thẩm mỹ:** Bản sắc chess club và đấu trường cờ vua quốc tế mạnh mẽ. Tone màu ấm áp hơn Option A, tạo hình ảnh Huấn luyện viên cá nhân tận tâm.
- **Đánh giá:** Rất ấn tượng về mặt thương hiệu cá nhân "Ninh Lốp Trưởng", phân biệt rõ ràng giữa accent và semantic status.

### Option D — Clean Indigo Baseline (Baseline An toàn nhất)
- **Bảng màu:**
  - Nền: `#0A0A0F` | Bề mặt: `#15151B` / `#1D1D25` | Viền: `#30303B`
  - Tương tác: `#6366F1` (Indigo tinh gọn) | Nước cờ: `#CFA64F` (Gold)
  - Bàn cờ: Ô sáng `#E2E8F0`, ô tối `#59687B`
- **Ý đồ thẩm mỹ:** Giữ nguyên tinh thần của phiên bản hiện tại nhưng chuẩn hóa token, loại bỏ triệt để màu emerald gây nhiễu và làm sạch layout.
- **Đánh giá:** Rủi ro migration thấp nhất, dễ tiếp nhận nhất đối với người dùng đã quen thuộc với bản cũ.

---

## 6. Bảng Ma Trận Đánh Giá (Decision Matrix: Thang điểm 1 - 5)

| Tiêu chí Đánh giá | Trọng số | Option A (Cobalt) | Option B (Paper) | Option C (Pine) | Option D (Indigo) |
|---|---|:---:|:---:|:---:|:---:|
| **Board Prominence** (Độ nổi bật bàn cờ) | Cao | 5.0 | 4.6 | 4.8 | 4.4 |
| **Readability** (Độ dễ đọc nội dung dài) | Cao | 4.8 | 5.0 | 4.7 | 4.6 |
| **Visual Hierarchy** (Phân cấp thị giác) | Cao | 4.9 | 4.5 | 4.7 | 4.5 |
| **Brand Distinctiveness** (Độ nhận diện thương hiệu) | Trung bình | 4.8 | 4.7 | 4.9 | 3.8 |
| **Chess Identity** (Bản sắc cờ vua thực thụ) | Cao | 4.9 | 5.0 | 4.9 | 4.2 |
| **Accessibility (WCAG AA)** (Độ tương phản & A11y) | Cao | 4.9 | 4.8 | 4.7 | 4.8 |
| **Dark-Mode Fatigue** (Chống mỏi mắt ván cờ dài) | Trung bình | 5.0 | 4.2 (Light) | 4.9 | 4.6 |
| **Mobile Suitability** (Hiển thị gọn gàng trên mobile) | Cao | 4.8 | 4.7 | 4.7 | 4.7 |
| **Migration Risk** (Mức độ an toàn khi chuyển đổi) | Rất cao | 4.5 | 4.0 | 4.3 | **5.0** |
| **Product Direction Fit** (Định hướng cờ vua tương tác) | Cao | **4.9** | 4.4 | 4.8 | 4.5 |
| **TỔNG ĐIỂM BÌNH QUÂN** | — | **4.85 / 5** | **4.59 / 5** | **4.74 / 5** | **4.51 / 5** |

---

## 7. Danh mục Ảnh chụp Màn hình (Screenshots Gallery)

Toàn bộ ảnh chụp màn hình độ phân giải cao đã được xuất vào thư mục `ui-lab/screenshots/`:

| Màn hình | Option A (Cobalt) | Option B (Warm Paper) | Option C (Charcoal Pine) | Option D (Clean Indigo) |
|---|---|---|---|---|
| **Home (Desktop)** | [option-a/home-desktop.png](file:///e:/chess/ui-lab/screenshots/option-a/home-desktop.png) | [option-b/home-desktop.png](file:///e:/chess/ui-lab/screenshots/option-b/home-desktop.png) | [option-c/home-desktop.png](file:///e:/chess/ui-lab/screenshots/option-c/home-desktop.png) | [option-d/home-desktop.png](file:///e:/chess/ui-lab/screenshots/option-d/home-desktop.png) |
| **Play (Desktop)** | [option-a/play-desktop.png](file:///e:/chess/ui-lab/screenshots/option-a/play-desktop.png) | [option-b/play-desktop.png](file:///e:/chess/ui-lab/screenshots/option-b/play-desktop.png) | [option-c/play-desktop.png](file:///e:/chess/ui-lab/screenshots/option-c/play-desktop.png) | [option-d/play-desktop.png](file:///e:/chess/ui-lab/screenshots/option-d/play-desktop.png) |
| **Review (Desktop)** | [option-a/review-desktop.png](file:///e:/chess/ui-lab/screenshots/option-a/review-desktop.png) | [option-b/review-desktop.png](file:///e:/chess/ui-lab/screenshots/option-b/review-desktop.png) | [option-c/review-desktop.png](file:///e:/chess/ui-lab/screenshots/option-c/review-desktop.png) | [option-d/review-desktop.png](file:///e:/chess/ui-lab/screenshots/option-d/review-desktop.png) |
| **Play (Mobile)** | [option-a/play-mobile.png](file:///e:/chess/ui-lab/screenshots/option-a/play-mobile.png) | [option-b/play-mobile.png](file:///e:/chess/ui-lab/screenshots/option-b/play-mobile.png) | [option-c/play-mobile.png](file:///e:/chess/ui-lab/screenshots/option-c/play-mobile.png) | [option-d/play-mobile.png](file:///e:/chess/ui-lab/screenshots/option-d/play-mobile.png) |
| **Progress (Mobile)** | [option-a/progress-mobile.png](file:///e:/chess/ui-lab/screenshots/option-a/progress-mobile.png) | [option-b/progress-mobile.png](file:///e:/chess/ui-lab/screenshots/option-b/progress-mobile.png) | [option-c/progress-mobile.png](file:///e:/chess/ui-lab/screenshots/option-c/progress-mobile.png) | [option-d/progress-mobile.png](file:///e:/chess/ui-lab/screenshots/option-d/progress-mobile.png) |
| **Chế độ So sánh song song** | [screenshots/compare-desktop.png](file:///e:/chess/ui-lab/screenshots/compare-desktop.png) | — | — | — |

---

## 8. Kết quả Kiểm tra Accessibility & Responsive

1. **Bàn phím & Focus Navigation:**
   - Toàn bộ các nút, radio segmented control và tab đều hỗ trợ chuyển bằng phím `Tab` và phím mũi tên.
   - Vòng viền focus (`outline: 2px solid var(--app-accent); outline-offset: 2px`) hiển thị rõ rệt trên tất cả các nền mà không tạo quầng sáng nhòe (glow).
2. **Tuân thủ Reduced Motion:**
   - Khi hệ điều hành kích hoạt `prefers-reduced-motion: reduce`, toàn bộ transition thời gian dài và hiệu ứng active press đều tự động hạ thời lượng về `0.01ms`, đảm bảo an toàn thị giác tuyệt đối cho người dùng nhạy cảm với chuyển động.
3. **Responsive & Mobile Usability:**
   - Trên viewport di động (390x844), bàn cờ co giãn thông minh không bị tràn ngang (No horizontal overflow).
   - Touch targets của các nút hành động chính đều đạt hoặc vượt tiêu chuẩn tối thiểu `44x44px`.
   - Sidebar trên mobile được chuyển xuống phía dưới bàn cờ, không bao giờ che khuất quân cờ.

---

## 9. Khuyến nghị Kỹ thuật (Technical Recommendation)

- **Đề xuất hàng đầu:** **Option A (Graphite + Cobalt + Warm Gold)** là phương án tối ưu nhất về mặt công năng, thẩm mỹ chuyên nghiệp và độ tập trung khi chơi cờ.
- **Phương án an toàn chuyển đổi:** **Option D (Clean Indigo Baseline)** nếu bạn muốn ưu tiên giảm thiểu tối đa sự xáo trộn giao diện cũ.
- **Phương án phong cách:** **Option B** thích hợp nếu muốn nhấn mạnh tính học thuật; **Option C** nếu muốn xây dựng thương hiệu câu lạc bộ cờ cá tính.

*Lưu ý: Antigravity không tự ý chọn thay bạn. Vui lòng mở local preview để trải nghiệm trực tiếp và lựa chọn phương án bạn ưng ý nhất.*
