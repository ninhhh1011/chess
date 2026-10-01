# Kế hoạch Đồng bộ Toàn diện Giao diện sang HeroUI v3 (HEROUI_FULL_MIGRATION_PLAN)

## 1. Hiện trạng Codebase (Current State Audit)

Dựa trên kết quả audit trực tiếp từ source code, `package.json`, và runtime tests:

### 1.1. Phiên bản & Môi trường thực tế
- **React**: `19.2.5`
- **Tailwind CSS**: `4.3.3` (với `@tailwindcss/vite`)
- **HeroUI**: `@heroui/react@3.2.4`, `@heroui/styles@3.2.4`
- **Kiến trúc HeroUI v3**: Dựa trên React Aria Components (RAC), Compound Components, không cần `<HeroUIProvider>`, hoạt động thông qua CSS tokens của Tailwind v4 và `@heroui/styles`.

### 1.2. Thống kê UI Components hiện tại
1. **Đã dùng HeroUI thực tế**:
   - `AppButton.tsx` (dùng `Button as HeroUIButton`, nhưng cần tinh gọn và tối ưu hóa).
2. **Wrapper giả lập (Fake wrappers trong `src/ui/` - bên trong vẫn dùng native HTML / custom event listeners)**:
   - `AppField.tsx`: Dùng `<label>` và `<input>` thô, không có RAC / HeroUI semantics.
   - `AppSelect.tsx`: Dùng native `<select>` và `<option>` bọc với Chevron icon.
   - `AppTabs.tsx`: Dùng mapping `<button>` với custom state và custom bottom indicator.
   - `AppDialog.tsx`: Dùng `Modal` nhưng bọc `if (!isOpen) return null;` và tự làm nút close bằng `<button>` & icon `X` thay vì `Modal.CloseTrigger`.
   - `AppPopover.tsx`: Tự quản lý `document.addEventListener('keydown')`, `mousedown outside`, absolute positioning.
   - `AppMenu.tsx`: Tự quản lý `document.addEventListener`, raw `<button>` / `<a>` cho menu items.
   - `AppTooltip.tsx`: Tự viết `useState(false)` với `onMouseEnter` / `onMouseLeave`.
   - `AppProgress.tsx`: Tự viết `<div role="progressbar">` và inline width styling.
   - `AppSkeleton.tsx`: Tự viết animate-pulse div.
   - `AppStatus.tsx`: Custom badge span.
3. **Thành phần còn thiếu trong `src/ui/`**:
   - `AppAlertDialog.tsx` (dành cho xác nhận đầu hàng / reset ván / hành động phá hủy)
   - `AppDrawer.tsx` (dành cho mobile navigation menu)
   - `AppTextArea.tsx` (dành cho PGN import / multi-line input)
   - `AppSlider.tsx` (dành cho engine depth, bot skill slider)
   - `AppSwitch.tsx` (dành cho bot settings toggles, sound toggles)
   - `AppRadioGroup.tsx` / `AppRadio.tsx` (dành cho chọn độ khó bot, chọn bên cầm quân Trắng/Đen)
   - `AppSpinner.tsx` (dành cho loading states)
   - `AppAvatar.tsx` (dành cho player / opponent / coach avatar)
   - `AppSurface.tsx` (dành cho panel, sidebar, board container, settings sections)
4. **Raw HTML Interactive Elements trong ứng dụng**:
   - Raw `<button>`: `Navbar.tsx`, `PreGameLobby.jsx`, `BotSettings.jsx`, `GameControls.jsx`, `PromotionModal.jsx`, `MoveHistory.jsx`, `ReviewNavigator.jsx`, `PostGameReview.tsx`, `OpeningExplorer.jsx`, `LessonCard.jsx`, `Login.jsx`, `Signup.jsx`, `SourceDisclosure.tsx`, `MobileControls.jsx`, `GameStats.jsx`, `BoardThemeSelector.jsx`.
   - Raw `<select>`: `BotSettings.jsx`.
   - Raw `<input>`: `OpeningExplorer.jsx`, `EngineAnalysisPanel.jsx`.
   - Raw `<textarea>`: `PgnImport.jsx`.
5. **Legacy Code & Dead Dependencies**:
   - `src/pages/Home.tsx`: Dead duplicate của `Home.jsx`. Import Framer Motion và `src/design-system/primitives`.
   - `src/design-system/`: Legacy design system chỉ được gọi bởi `Home.tsx` và `ErrorBoundary.jsx` (và các test riêng của nó). Không có lý do để duy trì song song với `src/ui`.
   - `framer-motion`: Sau khi loại bỏ `Home.tsx` và `src/design-system`, `framer-motion` có 0 caller trong codebase. Cần gỡ bỏ khỏi build bundle.
   - `tailwind.config.js`: File cấu hình Tailwind 3 cũ với bảng màu Indigo (`#6366F1`) xung đột với Option C.

---

## 2. Kiến trúc Mục tiêu (Target Architecture)

```text
               ┌───────────────────────────────┐
               │         HeroUI v3             │
               │  (@heroui/react + RAC)        │
               └───────────────┬───────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │            src/ui             │
               │  (Thống nhất Design Tokens    │
               │   Option C Charcoal + Pine)   │
               └───────────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  App Shell    │      │  Play Screen  │      │ Learning &    │
│  (Navbar,     │      │  (Lobby,      │      │ Auth Pages    │
│   Drawer,     │      │   Controls,   │      │ (Learn, Puzzles,│
│   User Menu)  │      │   Analysis,   │      │  Openings,    │
│               │      │   Coach)      │      │  Login, etc.) │
└───────────────┘      └───────────────┘      └───────────────┘
```

Mọi component đều tuân thủ các quy tắc:
1. **Behavior, A11y, Keyboard navigation, Focus trap, Overlays**: Do HeroUI v3 đảm nhận.
2. **Visual identity (Colors, Spacing, Radius, Motion)**: Tuân thủ triệt để token Option C Charcoal + Pine + Copper.
3. **Domain Exception**: Giữ nguyên tính độc lập chuyên biệt của Chessboard, quân cờ, highlight nước đi, drag/drop, evaluation bar và logic cờ vua.

---

## 3. Bảng Ánh xạ Chuyển đổi (Migration Matrix)

| Existing Element / Custom Primitive | HeroUI v3 Target Component | src/ui Primitive | Ghi chú & Tính năng |
|---|---|---|---|
| Native `<button>` / `.btn-primary` / `.btn-secondary` | HeroUI `Button` | `AppButton` | Variants: primary, secondary, tertiary, outline, danger, ghost. Radius 8px. |
| Custom `AppField` (raw `<input>` & `<label>`) | HeroUI `TextField`, `Input`, `Label`, `FieldError`, `Description`, `InputGroup` | `AppField` | Label, error, helper, prefix icon, suffix action, proper a11y IDs. |
| Native `<textarea>` | HeroUI `TextField` + `TextArea` / `InputGroup.TextArea` | `AppTextArea` | Dùng cho PGN import, feedback, coach notes. |
| Native `<select>` & `<option>` | HeroUI `Select`, `Select.Trigger`, `Select.Value`, `Select.Indicator`, `Select.Popover`, `ListBox`, `ListBox.Item` | `AppSelect` | Hỗ trợ keyboard selection, scrollable popover, proper `id` & `textValue`. |
| Custom `<button>`-based `AppTabs` | HeroUI `Tabs`, `Tabs.ListContainer`, `Tabs.List`, `Tabs.Tab`, `Tabs.Indicator`, `Tabs.Panel` | `AppTabs` | Phím mũi tên trái/phải, controlled selectedKey, quiet motion indicator. |
| Custom `AppDialog` (manual close & backdrop) | HeroUI `Modal`, `Modal.Backdrop`, `Modal.Container`, `Modal.Dialog`, `Modal.Header`, `Modal.Heading`, `Modal.Body`, `Modal.Footer`, `Modal.CloseTrigger` | `AppDialog` | Chuẩn RAC modal, focus trap, Escape to dismiss, responsive layout. |
| Custom confirm modals / inline alerts | HeroUI `AlertDialog`, `AlertDialog.Backdrop`, `AlertDialog.Dialog`, `AlertDialog.Header`, `AlertDialog.Footer` | `AppAlertDialog` | Dùng cho Đầu hàng, Tạo ván mới, Reset tiến độ. |
| Custom mobile navbar dropdown | HeroUI `Drawer`, `Drawer.Backdrop`, `Drawer.Content`, `Drawer.Dialog`, `Drawer.CloseTrigger` | `AppDrawer` | Chuẩn mobile slide-in drawer, min 44px touch targets. |
| Custom `AppPopover` (event listener hack) | HeroUI `Popover`, `Popover.Trigger`, `Popover.Content`, `Popover.Dialog` | `AppPopover` | Quản lý focus tự động, không rò rỉ event listeners. |
| Custom `AppMenu` (dropdown hack) | HeroUI `Dropdown`, `Dropdown.Trigger`, `Dropdown.Popover`, `Dropdown.Menu`, `Dropdown.Item`, `Dropdown.Section` | `AppMenu` | Menu dropdown chuẩn WAI-ARIA cho user account, action menus. |
| Custom `AppTooltip` (hover hack) | HeroUI `Tooltip`, `Tooltip.Trigger`, `Tooltip.Content`, `Tooltip.Arrow` | `AppTooltip` | A11y tooltip chuẩn, delay 150ms, arrow tinh tế. |
| Custom `AppProgress` (inline style hack) | HeroUI `ProgressBar`, `ProgressBar.Track`, `ProgressBar.Fill`, `ProgressBar.Output`, `Label` | `AppProgress` | Thanh tiến độ học tập, level progress. |
| Native numeric `<input>` / sliders | HeroUI `Slider`, `Slider.Track`, `Slider.Fill`, `Slider.Thumb`, `Slider.Output` | `AppSlider` | Dùng cho engine depth, bot difficulty, sound volume. |
| Custom checkbox/toggle buttons | HeroUI `Switch`, `Switch.Control`, `Switch.Thumb` | `AppSwitch` | Bật/tắt gợi ý, âm thanh, tự động xoay bàn cờ. |
| Custom radio buttons in lobby | HeroUI `RadioGroup`, `Radio`, `Radio.Control`, `Radio.Indicator` | `AppRadioGroup`, `AppRadio` | Chọn mức độ Bot, chọn bên Trắng/Đen. |
| Custom status badges | HeroUI `Chip`, `Chip.Label` | `AppStatus` / `AppChip` | Badge trạng thái động cơ, nguồn Stockfish, tags khai cuộc. |
| Custom user icon / initial box | HeroUI `Avatar`, `Avatar.Image`, `Avatar.Fallback` | `AppAvatar` | Avatar người chơi, Bot, AI Coach. |
| Custom spinner SVG | HeroUI `Spinner` | `AppSpinner` | Loading indicator nhất quán. |
| Custom skeleton pulse | HeroUI `Skeleton` | `AppSkeleton` | Loading placeholder. |
| Raw panel `<div>` with hardcoded borders | HeroUI `Surface` | `AppSurface` | Vùng nền có viền (sidebar, analysis box, toolbar). |
| Custom lesson/opening cards | HeroUI `Card`, `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer` | `AppCard` / `Card` | Card cho các thực thể độc lập (Bài học, Khai cuộc, Bài tập). |

---

## 4. Kế hoạch Triển khai theo 7 Giai đoạn (Phases)

### Giai đoạn 1 — Foundation (Lớp nền tảng UI)
1. Cập nhật `AGENTS.md` (hoàn tất).
2. Tinh chỉnh và hoàn thiện các HeroUI tokens trong `src/styles/theme-charcoal-pine.css` và `src/index.css`.
3. Xây dựng lại toàn bộ `src/ui/`:
   - `AppButton.tsx` (HeroUI `Button` native)
   - `AppField.tsx` (HeroUI `TextField` + `InputGroup` + `Input` + `Label` + `FieldError`)
   - `AppTextArea.tsx` (HeroUI `TextField` + `InputGroup.TextArea`)
   - `AppSelect.tsx` (HeroUI `Select` + `ListBox`)
   - `AppTabs.tsx` (HeroUI `Tabs` + `Tabs.List` + `Tabs.Tab` + `Tabs.Indicator`)
   - `AppDialog.tsx` (HeroUI `Modal` + `Modal.CloseTrigger`)
   - `AppAlertDialog.tsx` (HeroUI `AlertDialog`)
   - `AppDrawer.tsx` (HeroUI `Drawer`)
   - `AppPopover.tsx` (HeroUI `Popover`)
   - `AppMenu.tsx` (HeroUI `Dropdown` + `Dropdown.Menu`)
   - `AppTooltip.tsx` (HeroUI `Tooltip`)
   - `AppProgress.tsx` (HeroUI `ProgressBar`)
   - `AppSlider.tsx` (HeroUI `Slider`)
   - `AppSwitch.tsx` (HeroUI `Switch`)
   - `AppRadioGroup.tsx` (HeroUI `RadioGroup` + `Radio`)
   - `AppStatus.tsx` (HeroUI `Chip`)
   - `AppAvatar.tsx` (HeroUI `Avatar`)
   - `AppSkeleton.tsx` (HeroUI `Skeleton`)
   - `AppSpinner.tsx` (HeroUI `Spinner`)
   - `AppSurface.tsx` (HeroUI `Surface`)
   - Re-export toàn diện qua `src/ui/index.ts`.

### Giai đoạn 2 — App Shell (Khung ứng dụng)
1. `Navbar.tsx`:
   - Chuyển mobile navigation sang `AppDrawer` (HeroUI `Drawer`).
   - Chuyển menu đăng nhập/người dùng sang `AppMenu` (HeroUI `Dropdown`).
   - Chuyển Avatar sang `AppAvatar`.
   - Đảm bảo touch targets >= 44px trên mobile.
2. `Layout.tsx`:
   - Sử dụng layout token đồng bộ, loại bỏ các margin/padding thừa.

### Giai đoạn 3 — Màn hình Play (Trung tâm ứng dụng)
1. `PreGameLobby.jsx`:
   - Thay các nút chọn bot level và chọn màu cờ sang `AppRadioGroup` / `Radio` được style theo chuẩn Option C.
2. `BotSettings.jsx`:
   - Thay native `<select>` bằng `AppSelect`.
   - Thay slider bằng `AppSlider`.
   - Thay toggles bằng `AppSwitch`.
3. `GameControls.jsx`:
   - Chuyển toàn bộ các nút điều khiển sang `AppButton` với `AppTooltip` và `aria-label`.
   - Chuyển xác nhận Đầu hàng / Ván mới sang `AppAlertDialog`.
4. `PromotionModal.jsx`:
   - Chuyển sang `AppDialog` / `Modal` chuẩn với `AppButton`.
5. `GameLayout.jsx`:
   - Chuyển sidebar tabs sang `AppTabs` (HeroUI `Tabs`).
   - Sử dụng `AppSurface` cho các panels.
6. `MoveHistory.jsx`:
   - Giữ bàn cờ và move row semantic, dùng `AppButton` hoặc standard pressable styling cho các nút điều hướng lịch sử nước đi.
7. `EngineAnalysisPanel.jsx`:
   - Thay các numeric input / slider depth bằng `AppSlider` / `AppField`.
   - Sử dụng `AppSpinner` cho calculating indicator.
8. `AICoachPanel.tsx`:
   - Sử dụng `AppField`, `AppButton`, `AppSpinner`, `AppStatus` (Chip).
9. `PostGameReview.tsx` / `PostGameReview.jsx`:
   - Đồng bộ modal và review actions sang `AppDialog`, `AppTabs`, `AppButton`.

### Giai đoạn 4 — Learning Pages (Các trang học tập)
1. `Learn.jsx`:
   - `LessonCard.jsx` dùng HeroUI `Card` độc lập, `AppButton`.
2. `Exercises.jsx`:
   - Bộ lọc tactics, level filters dùng `AppSelect` / `AppField`.
   - Trạng thái giải bài dùng `AppStatus` / `AppProgress`.
3. `Openings.jsx` & `OpeningDetail.jsx`:
   - `OpeningCard.jsx` dùng HeroUI `Card`.
   - Search/filter dùng `AppField`.
   - Trainer controls dùng `AppButton`.
4. `Training.jsx`:
   - `DailyTrainingPlan.jsx`, `LevelProgress.jsx` dùng `AppProgress` (HeroUI ProgressBar).
   - Sync badges dùng `AppStatus` (HeroUI Chip).

### Giai đoạn 5 — Auth & Global Screens
1. `Login.jsx` & `Signup.jsx`:
   - Dùng `AppField` (HeroUI `TextField` + `InputGroup`), `AppButton`, `AppSpinner`.
2. `OnboardingModal.jsx`:
   - Dùng `AppDialog` (HeroUI `Modal`).
3. `ErrorBoundary.jsx`:
   - Dùng `AppButton` thay vì legacy design system primitive.

### Giai đoạn 6 — Dọn dẹp Code & Dependencies thừa (Cleanup)
1. Xóa file trùng lặp `src/pages/Home.tsx`.
2. Xóa toàn bộ `src/design-system/` và các test liên quan (`Button.test.tsx`, `Card.test.tsx`, `Input.test.tsx`).
3. Dọn dẹp CSS legacy (`.btn-primary`, `.btn-secondary`, `.panel`...) khỏi `src/index.css`.
4. Xóa `tailwind.config.js` vì Tailwind 4 dùng CSS-first configuration.
5. Kiểm tra và gỡ `framer-motion` khỏi `package.json` và `vite.config.js` (loại bỏ `vendor-animation` chunk).

### Giai đoạn 7 — Kiểm tra & Xác minh (Verification & Hardening)
1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. Kiểm tra responsive trên các kích thước 360px, 390px, 768px, 1024px.
6. Soát lỗi accessibility (focus trap, ARIA, keyboard navigation).
7. Lập báo cáo cuối cùng tại `docs/HEROUI_MIGRATION_REPORT.md`.
