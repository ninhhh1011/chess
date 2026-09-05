# BÁO CÁO TỔNG KẾT THIẾT KẾ UI LAB — OPTION C (LOCKED)
### CHARCOAL + PINE + COPPER DESIGN SYSTEM & PROTOTYPE VERIFICATION

---

## 1. Tóm Tắt Quyết Định Thiết Kế (Option C Locked)

Trong đợt thực thi này, toàn bộ thiết kế giao diện phòng thí nghiệm (`ui-lab/`) được **khóa và triển khai duy nhất theo Hướng Option C: Charcoal + Pine + Copper**.

- **Loại bỏ phân mảnh lựa chọn**: Không phát triển hay tái tạo Option A, B, hay D. Xóa bỏ theme switcher và màn hình so sánh để tập trung hoàn toàn vào việc hoàn thiện chiều sâu trải nghiệm Option C.
- **Trọng tâm sản phẩm**:
  - **Bàn cờ là tâm điểm tuyệt đối** (chiếm 65% màn hình desktop), không bị phân tán bởi các panel thừa.
  - **Tone màu trầm tĩnh (Quiet Aesthetic)**: Nền than củi sâu (`#0C100E`), bề mặt xanh rêu tối (`#141A17`, `#1A221E`), tương tác chính màu xanh lá thông Pine (`#3FAD79`), điểm nhấn cờ màu đồng Copper (`#C88954`).
  - **Quiet Motion**: Chuyển động vi mô mượt mà từ 120ms đến 240ms, không dùng lò xo giật cục, hỗ trợ chế độ giảm chuyển động (`prefers-reduced-motion`).
  - **Sự thật trong UI (Truth in UI)**: Loại bỏ các cụm badge AI/Engine khó hiểu; thay bằng dòng `SourceDisclosure` minh bạch nguồn gốc nước cờ (Stockfish 18, Diễn giải cơ bản, Trợ lý AI).
  - **Nội dung thực tế**: Không dùng claim giật gân, không dùng số Elo giả định trong sảnh đấu, không tạo card lồng card.

---

## 2. Bảng Đối Chiếu Design Tokens Option C

Toàn bộ tokens được định nghĩa tập trung tại [`ui-lab/src/styles/theme-charcoal-pine.css`](file:///e:/chess/ui-lab/src/styles/theme-charcoal-pine.css):

| Nhóm Token | Tên Biến CSS | Giá trị Hex / Đơn vị | Vai trò Giao diện |
| :--- | :--- | :--- | :--- |
| **Base Surface** | `--app-bg` | `#0C100E` | Nền ứng dụng chính (Charcoal tối sâu) |
| **Container Surface**| `--app-surface` | `#141A17` | Bề mặt các khung bao, thanh điều hướng |
| **Raised Surface** | `--app-surface-raised` | `#1A221E` | Bề mặt card, panel, hàng danh sách |
| **Hover Surface** | `--app-surface-hover` | `#222C27` | Bề mặt khi rê chuột |
| **Borders** | `--app-border` | `#2D3932` | Đường viền mảnh phân tách tự nhiên |
| **Strong Border** | `--app-border-strong` | `#425047` | Viền nhấn hoặc trạng thái focus |
| **Foreground** | `--app-foreground` | `#F1F4F2` | Màu chữ chính, độ tương phản cao |
| **Muted Text** | `--app-muted` | `#9BA89F` | Chữ thứ cấp, mô tả phụ |
| **Subtle Text** | `--app-subtle` | `#708078` | Nhãn kỹ thuật, thời gian, ký hiệu |
| **Primary Interaction**| `--app-accent` | `#3FAD79` | **Pine Green**: Nút chính, lượt đi, focus |
| **Accent Hover** | `--app-accent-hover` | `#52BD8A` | Trạng thái hover của Pine Green |
| **Accent Soft** | `--app-accent-soft` | `#173628` | Nền nhạt cho badge, tag của Pine |
| **Chess Highlight** | `--app-copper` | `#C88954` | **Copper**: Nước đi vừa đi, nước đề xuất, cúp vàng |
| **Copper Soft** | `--app-copper-soft` | `#3B271C` | Nền highlight nước cờ Copper |
| **Semantic Success** | `--app-success` | `#49A6A0` | **Teal**: Tiến độ đạt, nước đi tốt (tách biệt với Pine) |
| **Semantic Warning** | `--app-warning` | `#C89B4F` | **Amber**: Nước cờ thiếu lực, cảnh báo |
| **Semantic Danger** | `--app-danger` | `#D46666` | **Coral Red**: Sai lầm (Blunder), đầu hàng, chiếu Vua |
| **Radius Button/Input**| `--radius-button` | `8px` | Bán kính nút bấm và ô nhập liệu (chuẩn HeroUI v3) |
| **Radius Card/Panel**| `--radius-card` | `10px` | Bán kính card nhiệm vụ, hàng thống kê |
| **Radius Modal** | `--radius-modal` | `12px` | Bán kính modal dialog popover |
| **Radius Badge** | `--radius-badge` | `6px` | Bán kính nhãn trạng thái và tag |

---

## 3. Hệ Thống HeroUI v3 Component Wrappers

Toàn bộ các thành phần giao diện HeroUI v3.2.4 được chuẩn hóa dưới dạng wrappers trong thư mục [`ui-lab/src/ui/`](file:///e:/chess/ui-lab/src/ui/) tuân thủ chặt chẽ Compound Component Pattern:

1. [**`AppButton`**](file:///e:/chess/ui-lab/src/ui/AppButton.tsx):
   - Hỗ trợ 6 biến thể: `primary` (Pine Green), `secondary`, `tertiary`, `outline`, `danger`, `ghost`.
   - Bán kính góc cố định 8px (`--radius-button`), không dùng dạng bo tròn pill button.
   - Hỗ trợ icon trái/phải, spinner trạng thái `isLoading`, phím tắt Enter/Space, focus ring chuẩn WCAG.
2. [**`AppDialog`**](file:///e:/chess/ui-lab/src/ui/AppDialog.tsx):
   - Xây dựng trên nền React Aria Modal Dialog và HeroUI compound structure.
   - Bán kính 12px (`--radius-modal`), nền surface raised, viền tinh tế, không lồng card bên trong.
   - Tích hợp Focus Trap, tự động trả focus về trigger element khi đóng, đóng bằng phím ESC hoặc bấm ra ngoài.
3. [**`AppTabs`**](file:///e:/chess/ui-lab/src/ui/AppTabs.tsx):
   - Hỗ trợ biến thể `underline` (thanh trượt chỉ thị) và `segment` (khung bo tab).
   - Tích hợp điều hướng bàn phím bằng phím mũi tên Trái/Phải theo chuẩn WAI-ARIA tablist.
4. [**`AppField`**](file:///e:/chess/ui-lab/src/ui/AppField.tsx):
   - Ô nhập liệu văn bản với nhãn accessible, thông báo lỗi, icon bổ trợ, bán kính góc 8px.
5. [**`AppSelect`**](file:///e:/chess/ui-lab/src/ui/AppSelect.tsx):
   - Hộp chọn dropdown tùy chỉnh với nhãn, gợi ý con và focus ring Pine Green.
6. [**`AppStatus`**](file:///e:/chess/ui-lab/src/ui/AppStatus.tsx):
   - Nhãn trạng thái ngữ nghĩa cho Engine, AI Coach, Blunder, Inaccuracy, Best Move với bán kính 6px.
7. [**`AppTooltip`**](file:///e:/chess/ui-lab/src/ui/AppTooltip.tsx):
   - Chú thích thông tin khi rê chuột với độ trễ 150ms, nền than củi và mũi tên định vị.
8. [**`AppPopover`**](file:///e:/chess/ui-lab/src/ui/AppPopover.tsx):
   - Khung thông tin và cài đặt dạng nổi (Popover), quản lý phím Escape và click ngoài.
9. [**`AppProgress`**](file:///e:/chess/ui-lab/src/ui/AppProgress.tsx):
   - Thanh tiến độ kỹ năng với 4 gam màu ngữ nghĩa (Pine, Teal, Copper, Warning), bán kính 6px.
10. [**`SourceDisclosure`**](file:///e:/chess/ui-lab/src/components/SourceDisclosure.tsx):
   - Thành phần công khai nguồn dữ liệu minh bạch, đáp ứng quy tắc Section 11: *“Nguồn: Stockfish 18 · Diễn giải cơ bản”*, loại bỏ badge cụm gây hiểu nhầm.

---

## 4. Giải Pháp Quiet Motion & Accessibility

Thiết kế loại bỏ toàn bộ các animation nảy lò xo (spring physics) gián đoạn sự tập trung khi đánh cờ:
- **Thời lượng chuyển động ngắn**:
  - `Fast` (120ms): Phản hồi bấm nút, hover state, chuyển đổi màu nền.
  - `Base` (180ms): Hiển thị tooltip, mở dropdown select, chuyển đổi tab.
  - `Slow` (240ms): Mở modal dialog, mở rộng accordion thống kê.
- **Easing Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` đem lại cảm giác tự nhiên, đĩnh đạc.
- **Hỗ trợ Chế độ Giảm chuyển động**:
  Được khai báo trong [`ui-lab/src/styles/motion.css`](file:///e:/chess/ui-lab/src/styles/motion.css):
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !urls;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## 5. Danh Sách 10 Ảnh Chụp Màn Hình Tự Động (Option C)

Toàn bộ 10 ảnh chụp màn hình được sinh tự động bằng Playwright Chromium tại 2 độ phân giải tiêu chuẩn:
- **Desktop**: 1440 × 900 px
- **Mobile**: 390 × 844 px

Vị trí lưu trữ: [`ui-lab/screenshots/option-c/`](file:///e:/chess/ui-lab/screenshots/option-c/) và [`ui-lab/public/screenshots/option-c/`](file:///e:/chess/ui-lab/public/screenshots/option-c/)

| Màn hình | Tệp Desktop (1440×900) | Tệp Mobile (390×844) | Trạng thái Cuộn ngang |
| :--- | :--- | :--- | :---: |
| **1. Home** | `home-desktop.png` (264 KB) | `home-mobile.png` (134 KB) | **Zero Overflow** ✓ |
| **2. Lobby** | `lobby-desktop.png` (145 KB) | `lobby-mobile.png` (110 KB) | **Zero Overflow** ✓ |
| **3. Play** | `play-desktop.png` (241 KB) | `play-mobile.png` (129 KB) | **Zero Overflow** ✓ |
| **4. Review** | `review-desktop.png` (167 KB) | `review-mobile.png` (114 KB) | **Zero Overflow** ✓ |
| **5. Progress**| `progress-desktop.png` (330 KB)| `progress-mobile.png` (125 KB)| **Zero Overflow** ✓ |

---

## 6. Danh Sách Các Route Trong UI Lab

| Đường dẫn Route | Tên Màn hình | Vai trò & Điểm nhấn Thiết kế |
| :--- | :--- | :--- |
| **`/`** | **Option C Showcase & Gallery** | Trang tổng quan Option C, bảng màu, liên kết các màn hình và thư viện 10 ảnh chụp xem trước. |
| **`/home`** | **Trang chủ (Home)** | Khẩu hiệu thực chiến *"Học từ chính những nước cờ của bạn"*, preview bàn cờ thế cờ thực tế, luồng học 4 bước. |
| **`/lobby`** | **Tiền sảnh (Lobby)** | Thiết lập ván cờ với bộ chọn segmented 4 cấp độ (Dễ, Vừa, Khó, Thử thách), chọn màu quân Trắng/Đen, không hiển thị số Elo. |
| **`/play`** | **Màn chơi (Play & Analysis)** | Bàn cờ chiếm 65% desktop, sidebar 3 tab tinh gọn, thanh đánh giá thế cờ, popover cài đặt, thông tin minh bạch SourceDisclosure. |
| **`/review`**| **Đánh giá ván cờ (Review)** | Cấu trúc 5 phần: Kết quả ván -> Tóm tắt 1 câu -> 3 sai lầm then chốt (MistakeReviewRow) -> CTA tiếp theo -> Thống kê thu gọn. |
| **`/progress`**|**Lộ trình ngày (Progress)** | 5 nhiệm vụ cụ thể kèm lý do đề xuất (1 lesson, 3 puzzle, 1 challenge), thanh đo kỹ năng AppProgress, trạng thái đồng bộ nhỏ gọn. |
| **`/components`**|**Component Catalog** | Khu trưng bày tương tác kiểm thử độc lập cho toàn bộ các Wrapper HeroUI v3. |
| **`/screenshots`**|**Thư viện ảnh chụp** | Alias trực tiếp chuyển tới Gallery ảnh chụp màn hình độ phân giải cao. |

---

## 7. Kết Quả Kiểm Tra Kỹ Thuật (Verification Matrix)

| Hạng mục Kiểm thử | Lệnh Thực thi | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Typecheck** | `npm run typecheck` trong `ui-lab/` | **PASS** ✓ | `tsc --noEmit` hoàn tất không có bất kỳ lỗi TypeScript nào. |
| **Production Build** | `npm run build` trong `ui-lab/` | **PASS** ✓ | Bundle thành công với Vite v6: `dist/index.html`, CSS, JS tối ưu hóa. |
| **Option C Smoke Suite** | `npm test` trong `ui-lab/` | **PASS** ✓ | Đạt 8/8 bộ kiểm thử: tokens, quiet motion, wrappers, disclosure, screens, fixtures, 10 screenshots, dist bundle. |
| **No Horizontal Overflow** | `playwright evaluate` trên 10 viewports | **PASS** ✓ | 100% các màn hình trên cả Desktop và Mobile không bị tràn thanh cuộn ngang. |
| **Production Repo Safety** | `git status --short` tại root | **PASS** ✓ | Chỉ phát sinh thư mục mới `?? ui-lab/`, 0 file production bị sửa đổi. |

---

## 8. Cam Kết Về An Toàn Mã Nguồn Production

1. **Không can thiệp cấu hình production**: File `package.json` của repository gốc giữ nguyên 100% phụ thuộc (`tailwindcss: 3.4.19`, `vite: 8.0.10`, `react: 19.2.5`).
2. **Không trộn lẫn UI**: Toàn bộ mã nguồn Option C nằm hoàn toàn bên trong thư mục biệt lập `ui-lab/`.
3. **Không sửa đổi logic nghiệp vụ cờ**: Không chạm vào Chess engine, Stockfish WebWorker, Corpus 25.320 câu đố hay Coach Prompt production.
4. **Không tự ý commit/push**: Không thực hiện bất kỳ lệnh `git commit` hay `git push` tự động nào.

---

## 9. Hướng Dẫn Chạy Thử UI Lab Tại Máy Cục Bộ

Để xem trực tiếp giao diện Option C trên trình duyệt:

```powershell
# Di chuyển vào thư mục ui-lab
cd e:\chess\ui-lab

# Khởi chạy môi trường thử nghiệm
npm run preview
# hoặc khởi chạy dev server
npm run dev
```

Mở trình duyệt tại đường dẫn: `http://localhost:4175` hoặc `http://localhost:5173`.
Bấm vào các thẻ màn hình để tương tác trực tiếp với bàn cờ, modal đánh giá ván đấu và lộ trình rèn luyện cá nhân hóa.
