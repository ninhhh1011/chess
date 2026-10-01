# BÁO CÁO TOÀN DIỆN DI TRÚ HEROUI V3 (HEROUI MIGRATION REPORT)

> **Dự án**: Chess Web Application (`ninhhh1011/chess`)  
> **Phiên bản UI Foundation**: HeroUI v3 (`@heroui/react@^3.2.4`, `@heroui/styles@^3.2.4`)  
> **Ngôn ngữ & Runtime**: React 19, Tailwind CSS 4, Vite 8, TypeScript / JavaScript  
> **Hệ thống Design Identity**: Option C (Charcoal `#0C100E` + Pine `#3FAD79` + Copper `#C88954`)  
> **Thời gian hoàn thành**: Tháng 10/2026

---

## 1. TỔNG QUAN (SUMMARY)

Dự án đã hoàn tất chuyển đổi toàn bộ presentation layer sang **HeroUI v3** làm nền tảng UI duy nhất:
- Loại bỏ hoàn toàn các fake wrapper (wrapper chỉ bọc thẻ HTML `<button>`, `<input>`, `<select>`, `<dialog>` thủ công).
- Triển khai đầy đủ **21 UI Primitives** chuẩn hóa tại `src/ui/` sử dụng trực tiếp các thành phần compound của `@heroui/react` và `@heroui/styles`, kết hợp chặt chẽ với theme Option C.
- Di trú 100% các thành phần interactive generic trong ứng dụng (Game Controls, Bot Settings, PreGame Lobby, Promotion Modal, Analysis, Review, Coach, Learn, Training, Exercises, Openings, Navbar, Auth, Onboarding, Dialogs, Overlays, Toasts/Alerts).
- Thanh lý toàn bộ legacy design system (`src/design-system/`), xóa file duplicate `src/pages/Home.tsx`, xóa cấu hình legacy `tailwind.config.js`, xóa class `.btn-primary` cũ và gỡ bỏ hoàn toàn dependency `framer-motion`.
- Bảo toàn tuyệt đối 100% logic cờ vua, UCI bot protocol, Stockfish engine, PGN parser, Corpus contracts và persistence layer.

---

## 2. MA TRẬN CHUYỂN ĐỔI THÀNH PHẦN (COMPONENT MIGRATION MATRIX)

| Giao diện / Chức năng trước đây | Triển khai sau di trú (HeroUI v3) | Cơ chế / Primitive áp dụng |
|---|---|---|
| Native `<button>` / `.btn-primary` / `Button.tsx` (design-system cũ) | `AppButton` | `@heroui/react` `Button` với semantic variants (`primary`, `secondary`, `tertiary`, `outline`, `danger`, `ghost`), hỗ trợ `onPress` & `onClick`, auto focus-visible |
| Custom `AppField` (native `<label>` + `<input>`) | `AppField` | `@heroui/react` `TextField`, `Label`, `Input`, `Description`, `FieldError` |
| Native `<textarea>` | `AppTextArea` | `@heroui/react` `TextArea` kết hợp cùng `TextField` |
| Native `<select>` trong `BotSettings` | `AppSelect` | `@heroui/react` `Select`, `ListBox`, `ListBox.Item` với accessible keyboard navigation |
| Custom tabs nút bấm (`activeTab === ...`) | `AppTabs` | `@heroui/react` `Tabs`, `Tabs.List`, `Tabs.Tab`, `Tabs.Panel` chuẩn ARIA roles |
| Custom popover (listener `mousedown` outside) | `AppPopover` | `@heroui/react` `Popover`, `Popover.Trigger`, `Popover.Content`, `Popover.Dialog` |
| Custom menu profile / dropdown | `AppMenu` | `@heroui/react` `Dropdown`, `Dropdown.Popover`, `Dropdown.Menu`, `Dropdown.Item` |
| Custom tooltip (hover state JS) | `AppTooltip` | `@heroui/react` `Tooltip`, `Tooltip.Trigger`, `Tooltip.Content` |
| Custom modal (backdrop div + `role="dialog"`) | `AppDialog` | `@heroui/react` `Modal` (`Backdrop`, `Container`, `Dialog`, `CloseTrigger`, `Header`, `Body`, `Footer`) |
| Confirm panels (Resign, New Game, Reset) | `AppAlertDialog` | `@heroui/react` `AlertDialog` với keyboard trap & backdrop dismissal an toàn |
| Mobile menu tự viết trong `Navbar` | `AppDrawer` | `@heroui/react` `Drawer` trượt từ cạnh phải, trap focus, đóng bằng Escape |
| Loading spinner tự chế CSS | `AppSpinner` | `@heroui/react` `Spinner` với Pine accent |
| Skeleton CSS animation cũ | `AppSkeleton` | `@heroui/react` `Skeleton` |
| Custom div progress bar (`width: x%`) | `AppProgress` | `@heroui/react` `ProgressBar` ARIA-compliant |
| Status badges tự viết | `AppStatus` | `@heroui/react` `Chip` (`pine`, `copper`, `neutral`, `danger`, `warning`, `info`) |
| User profile image fallback | `AppAvatar` | `@heroui/react` `Avatar` |
| Slider tùy chỉnh độ sâu engine | `AppSlider` | `@heroui/react` `Slider` |
| Toggle switch engine options | `AppSwitch` | `@heroui/react` `Switch` |
| Radio buttons / Level selector / Theme selector | `AppRadioGroup`, `AppRadioCard` | `@heroui/react` `RadioGroup`, `Radio` |
| Generic container panel / sidebar | `AppSurface` | `@heroui/react` `Surface` |
| Semantic entity cards (Lesson, Opening) | `AppCard` | `@heroui/react` `Card` |

---

## 3. DANH SÁCH FILE THAY ĐỔI THEO NHÓM (FILES MODIFIED)

### 3.1. Foundation Layer (`src/ui/`, Config, Rules)
- `AGENTS.md`: Quy chuẩn bắt buộc cho agent tiếp theo (React 19, HeroUI v3, Option C, cấm HeroUI v2/NextUI/Provider thừa).
- `docs/HEROUI_FULL_MIGRATION_PLAN.md`: Kế hoạch audit và di trú chi tiết 7 giai đoạn.
- `src/ui/AppButton.tsx`: Viết lại dựa trên `@heroui/react` `Button`.
- `src/ui/AppField.tsx`: Viết lại dựa trên `@heroui/react` `TextField` compound.
- `src/ui/AppTextArea.tsx`: Xây dựng mới dựa trên `@heroui/react` `TextArea`.
- `src/ui/AppSelect.tsx`: Xây dựng mới dựa trên `@heroui/react` `Select` + `ListBox`.
- `src/ui/AppTabs.tsx`: Viết lại dựa trên `@heroui/react` `Tabs` compound.
- `src/ui/AppDialog.tsx`: Viết lại dựa trên `@heroui/react` `Modal` compound.
- `src/ui/AppAlertDialog.tsx`: Xây dựng mới dựa trên `@heroui/react` `AlertDialog`.
- `src/ui/AppDrawer.tsx`: Xây dựng mới dựa trên `@heroui/react` `Drawer`.
- `src/ui/AppPopover.tsx`: Xây dựng mới dựa trên `@heroui/react` `Popover`.
- `src/ui/AppMenu.tsx`: Xây dựng mới dựa trên `@heroui/react` `Dropdown`.
- `src/ui/AppTooltip.tsx`: Xây dựng mới dựa trên `@heroui/react` `Tooltip`.
- `src/ui/AppProgress.tsx`: Viết lại dựa trên `@heroui/react` `ProgressBar`.
- `src/ui/AppSlider.tsx`: Xây dựng mới dựa trên `@heroui/react` `Slider`.
- `src/ui/AppSwitch.tsx`: Xây dựng mới dựa trên `@heroui/react` `Switch`.
- `src/ui/AppRadioGroup.tsx`: Xây dựng mới với `AppRadioGroup` & `AppRadioCard`.
- `src/ui/AppStatus.tsx`: Viết lại dựa trên `@heroui/react` `Chip`.
- `src/ui/AppAvatar.tsx`: Xây dựng mới dựa trên `@heroui/react` `Avatar`.
- `src/ui/AppSkeleton.tsx`: Viết lại dựa trên `@heroui/react` `Skeleton`.
- `src/ui/AppSpinner.tsx`: Xây dựng mới dựa trên `@heroui/react` `Spinner`.
- `src/ui/AppSurface.tsx`: Xây dựng mới dựa trên `@heroui/react` `Surface`.
- `src/ui/AppCard.tsx`: Xây dựng mới dựa trên `@heroui/react` `Card`.
- `src/ui/index.ts`: Export toàn bộ 21 primitives nhất quán.

### 3.2. App Shell
- `src/components/ui/Navbar.tsx`: Chuyển mobile navigation sang `AppDrawer`, menu tài khoản sang `AppMenu`, avatar sang `AppAvatar`, các nút hành động sang `AppButton`.

### 3.3. Play & Chess Interaction
- `src/components/chess/PreGameLobby.jsx`: Chuyển chọn độ khó & màu quân sang `AppRadioGroup` / `AppRadioCard`, bọc trong `AppSurface`.
- `src/components/chess/BotSettings.jsx`: Chuyển các setting và tab sang `AppSelect`, `AppTabs`, `AppSurface`.
- `src/components/chess/GameControls.jsx`: Chuyển tất cả control buttons sang `AppButton` + `AppTooltip`; xác nhận Resign và New Game sang `AppAlertDialog`.
- `src/components/chess/PromotionModal.jsx`: Chuyển sang `AppDialog` + `AppButton` với phong cách cờ vua chuyên nghiệp.
- `src/components/chess/GameLayout.jsx`: Tái cấu trúc layout với `AppSurface`, `AppTabs`, `AppPopover`, `AppAlertDialog`.
- `src/components/chess/MoveHistory.jsx`: Di trú sang `AppSurface`, `AppButton` cho các nước đi tương tác.
- `src/components/analysis/EngineAnalysisPanel.jsx`: Di trú toggle options sang `AppSwitch`, status sang `AppStatus`, các controls sang `AppButton`.
- `src/components/AICoachPanel.tsx`: Di trú layout, avatar, loading spinner sang `AppAvatar`, `AppSpinner`, `AppSurface`.
- `src/components/review/AnalysisCoach.tsx`: Chuyển buttons và panels sang `AppButton`, `AppSurface`, `AppStatus`.
- `src/components/chess/ReviewNavigator.jsx`: Di trú sang `AppButton`, `AppSurface`.
- `src/components/chess/PostGameReview.jsx` & `src/components/review/PostGameReview.tsx`: Di trú progress và summary cards sang `AppProgress`, `AppSurface`, `AppStatus`, `AppButton`.
- `src/components/BoardThemeSelector.jsx`: Chuyển selector sang `AppRadioGroup` + `Radio`.
- `src/components/PgnImport.jsx`: Chuyển sang `AppTextArea`, `AppButton`, `AppSurface`, `AppStatus`.
- `src/components/OpeningExplorer.jsx`: Chuyển sang `AppField`, `AppButton`, `AppSurface`, `AppStatus`.
- `src/components/MobileControls.jsx`: Chuyển sang `AppButton`, `AppAlertDialog`, `AppSurface`.
- `src/components/chess/PlayerBar.jsx`: Chuyển sang `AppAvatar`, `AppStatus`, `AppSurface`.
- `src/components/chess/BotInfoPanel.jsx`: Chuyển sang `AppAvatar`, `AppSurface`.

### 3.4. Learning Pages
- `src/pages/Learn.jsx` & `src/components/LessonCard.jsx`: Chuyển cards sang `AppCard`, actions sang `AppButton`.
- `src/pages/Exercises.jsx`: Chuyển trạng thái tải và thông báo lỗi sang `AppSpinner`, `AppSurface`.
- `src/pages/Openings.jsx` & `src/components/openings/OpeningCard.jsx`: Chuyển cards sang `AppCard`, tags sang `AppStatus`.
- `src/pages/OpeningDetail.jsx`: Chuyển sang `AppButton`, `AppSurface`.
- `src/pages/Training.jsx`: Chuyển badges và container sang `AppStatus`, `AppSurface`.
- `src/components/training/DailyTrainingPlan.jsx`: Chuyển sang `AppSurface`, `AppButton`.
- `src/components/training/LevelProgress.jsx`: Chuyển progress sang `AppProgress`, `AppSurface`, `AppStatus`.

### 3.5. Auth & Global Overlays
- `src/pages/Login.jsx`: Di trú form sang `AppSurface`, `AppField`, `AppButton`.
- `src/pages/Signup.jsx`: Di trú form sang `AppSurface`, `AppField`, `AppButton`.
- `src/components/OnboardingModal.jsx`: Di trú modal sang `AppDialog` + `AppButton`.
- `src/components/ErrorBoundary.jsx`: Gỡ bỏ phụ thuộc `design-system` cũ, chuyển sang `AppSurface`, `AppButton`.
- `src/components/GameStats.jsx`: Chuyển dialog và progress sang `AppSurface`, `AppProgress`, `AppButton`, `AppAlertDialog`.
- `src/components/common/SourceDisclosure.tsx`: Chuyển trigger button sang `AppButton`.

### 3.6. Cleanup & Infrastructure
- `src/index.css`: Xóa bỏ các class legacy `.btn-primary`, `.btn-secondary`, tối ưu token Option C.
- `vite.config.js`: Xóa manual chunk rule `vendor-animation` đã chết.
- `package.json`: Gỡ bỏ `framer-motion`.

---

## 4. CÁC THÀNH PHẦN HEROUI ĐƯỢC SỬ DỤNG TRONG TOÀN BỘ PROJECT

Tất cả các thành phần HeroUI v3 sau đây hiện là lõi presentation layer của ứng dụng:

1. **`Button`**: `@heroui/react`
2. **`TextField`**, **`Label`**, **`Input`**, **`Description`**, **`FieldError`**: `@heroui/react`
3. **`TextArea`**: `@heroui/react`
4. **`Select`**, **`ListBox`**, **`ListBox.Item`**: `@heroui/react`
5. **`Tabs`**, **`Tabs.List`**, **`Tabs.Tab`**, **`Tabs.Panel`**: `@heroui/react`
6. **`Modal`** (`Backdrop`, `Container`, `Dialog`, `CloseTrigger`, `Header`, `Heading`, `Body`, `Footer`): `@heroui/react`
7. **`AlertDialog`**: `@heroui/react`
8. **`Drawer`**: `@heroui/react`
9. **`Popover`**, **`Popover.Trigger`**, **`Popover.Content`**, **`Popover.Dialog`**: `@heroui/react`
10. **`Dropdown`**, **`Dropdown.Popover`**, **`Dropdown.Menu`**, **`Dropdown.Item`**: `@heroui/react`
11. **`Tooltip`**, **`Tooltip.Trigger`**, **`Tooltip.Content`**: `@heroui/react`
12. **`ProgressBar`**: `@heroui/react`
13. **`Slider`**: `@heroui/react`
14. **`Switch`**: `@heroui/react`
15. **`RadioGroup`**, **`Radio`**: `@heroui/react`
16. **`Chip`**: `@heroui/react`
17. **`Avatar`**: `@heroui/react`
18. **`Skeleton`**: `@heroui/react`
19. **`Spinner`**: `@heroui/react`
20. **`Surface`**: `@heroui/react`
21. **`Card`**: `@heroui/react`

---

## 5. THÀNH PHẦN CUSTOM ĐƯỢC GIỮ LẠI CÓ CHỦ ĐÍCH (INTENTIONALLY RETAINED)

Theo đúng quy định tại Mục 6 và Mục 23 của yêu cầu kỹ thuật, các thành phần sau được giữ nguyên implementation tùy biến vì thuộc domain cờ vua đặc thù:

1. **Bàn cờ (`ChessGameBoard`, `react-chessboard`, `standardPieces`)**:
   - *Lý do*: Hiển thị bàn cờ 64 ô, render các quân cờ SVG, tính toán tỉ lệ khung hình (aspect ratio) phản hồi theo kích thước màn hình và hiệu năng kéo thả (drag & drop) với 60 FPS. Không thể và không được bọc từng ô cờ bằng HeroUI Button.
2. **Move Indicators & Visual Overlays (Selected square, Legal move dots, Capture rings, Check highlight, Last move highlight)**:
   - *Lý do*: Đồ họa vector và lớp phủ CSS tọa độ bàn cờ đặc thù cho tương tác cờ vua.
3. **Thanh đánh giá thế trận (`EvaluationBar`)**:
   - *Lý do*: Biểu đồ đánh giá thế trận từ centipawn/mate score của Stockfish với chuyển động mượt mà theo thang đo cờ vua.
4. **Hệ thống Stockfish Engine, Bot UCI Protocol Worker, PGN Parser, Corpus Contracts**:
   - *Lý do*: Tầng xử lý tính toán và business logic cờ vua thuần túy, không thuộc presentation layer.

---

## 6. MÃ NGUỒN VÀ DEPENDENCIES ĐÃ XÓA (REMOVED LEGACY CODE & DEPS)

### 6.1. File và Thư mục đã xóa:
- `src/design-system/`: Đã xóa toàn bộ thư mục cùng tất cả file bên trong:
  - `src/design-system/primitives/Badge.tsx`
  - `src/design-system/primitives/Button.tsx`
  - `src/design-system/primitives/Button.test.tsx`
  - `src/design-system/primitives/Card.tsx`
  - `src/design-system/primitives/Card.test.tsx`
  - `src/design-system/primitives/Input.tsx`
  - `src/design-system/primitives/Input.test.tsx`
  - `src/design-system/primitives/index.ts`
  - `src/design-system/animations/variants.ts`
  - `src/design-system/animations/index.ts`
- `src/pages/Home.tsx`: File duplicate đã lỗi thời, không có caller (file hoạt động chính thức là `src/pages/Home.jsx`).
- `tailwind.config.js`: File cấu hình thừa kế từ Tailwind v3 không còn tác dụng trong hệ sinh thái Tailwind v4 CSS-first.

### 6.2. Dependencies đã gỡ bỏ:
- `framer-motion`: Gỡ bỏ hoàn toàn khỏi `package.json` và `package-lock.json`. Ứng dụng chuyển sang chuẩn chuyển động "Quiet Motion" (CSS transitions 120ms/180ms/240ms native từ HeroUI v3 và Tailwind v4).

---

## 7. KẾT QUẢ KIỂM TRA & XÁC MINH THỰC TẾ (VERIFICATION RESULTS)

Tất cả các lệnh kiểm tra chất lượng mã nguồn đã được thực thi trực tiếp trên repository:

| Công cụ / Lệnh | Kết quả thực tế | Chi tiết xác minh |
|---|---|---|
| **Typecheck (`npm run typecheck`)** | **PASS** | `tsc --noEmit` hoàn tất với **0 lỗi** |
| **Linter (`npm run lint`)** | **PASS** | `eslint .` hoàn tất với **0 lỗi, 0 cảnh báo** (không có warning nào) |
| **Unit & Integration Tests (`npm test`)** | **PASS** | Chạy toàn bộ test suites của dự án: **55 test files passed (100%)**, **749 tests passed (100%)**, 0 failures |
| **Production Build (`npm run build`)** | **PASS** | Vite v8.0.10 biên dịch client thành công trong 10.43s; tạo bundle PWA sạch, module `vendor-heroui` đạt 95.44 kB gzip, không còn bundle animation thừa |
| **E2E Playwright (`playwright test e2e/smoke.spec.js`)** | **PASS** | Chạy toàn diện 9 smoke test cases trên Chromium: **9 passed (100%)** (Bao gồm Homepage, Play game start, Training page, Learn page, Console errors check, Mobile 360 no overflow, Desktop 1366 no overflow, Keyboard navigation, Prefers-reduced-motion) |
| **Raw HTML Elements Audit** | **PASS** | Quét ripgrep toàn bộ `src/`: 0 native `<button>`, `<input>`, `<select>`, `<textarea>` hoặc custom dialog/menu nằm ngoài HeroUI và test suites |

---

## 8. CÁC VẤN ĐỀ CÒN LẠI (REMAINING ISSUES)

- **Không có vấn đề tồn đọng nào** (0 blocker, 0 lỗi biên dịch, 0 lỗi kiểm thử).
- Hệ thống UI hiện tại hoàn toàn đồng nhất, sẵn sàng cho các tính năng tiếp theo phát triển trực tiếp trên HeroUI v3.
