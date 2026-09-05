# TÀI LIỆU KỸ THUẬT TÍCH HỢP HEROUI V3 (HEROUI INTEGRATION NOTES)

**Ngày kiểm tra & tích hợp:** 05/09/2026  
**Official Repository URL:** [https://github.com/heroui-inc/heroui](https://github.com/heroui-inc/heroui)  
**Official Documentation:** [https://heroui.com](https://heroui.com)  
**Release Tag tham chiếu:** `v3.2.4`  
**Git Commit SHA:** `21b1e8e53fd147284f7a19325db40330b84d0684`  
**Package Versions được Pin chính xác (ui-lab):**
- `"@heroui/react": "3.2.4"`
- `"@heroui/styles": "3.2.4"`

---

## 1. Tương thích Môi trường (Compatibility)

### 1.1. React Compatibility
- **Yêu cầu:** React 19 (`>=19.0.0`, `react-dom >=19.0.0`).
- **Môi trường ui-lab:** Sử dụng React `19.2.5` và React DOM `19.2.5` hoàn toàn tương thích và đồng bộ với core project.

### 1.2. Tailwind CSS Compatibility
- **Yêu cầu:** Tailwind CSS v4 (`>=4.0.0`).
- **Môi trường ui-lab:** Sử dụng Tailwind CSS `^4.0.0` với plugin `@tailwindcss/vite`.
- **Lưu ý cô lập (Isolation Guarantee):** Root repository vẫn giữ nguyên **Tailwind CSS v3.4.19**. Chỉ có module độc lập `ui-lab/` chạy Tailwind CSS v4, đảm bảo không gây bất kỳ breaking change nào cho mã nguồn production.

---

## 2. Danh mục Component APIs Đã Sử Dụng

HeroUI v3 áp dụng kiến trúc **Compound Component Pattern** dựa trên nền tảng **React Aria Components (RAC)**, mang lại khả năng truy cập (A11y), quản lý focus và phím bấm chuẩn WAI-ARIA.

| Component HeroUI | Cấu trúc Compound API sử dụng | Ứng dụng trong ui-lab |
|---|---|---|
| **Button** | `<Button variant="..." size="..." isDisabled={...}>` | `AppButton`: Nút chơi, chuyển bước, CTA bài tập |
| **Modal / Dialog** | `<Modal>`, `<Modal.Backdrop>`, `<Modal.Container>`, `<Modal.Dialog>`, `<Modal.Header>`, `<Modal.Heading>`, `<Modal.Body>`, `<Modal.Footer>`, `<Modal.CloseTrigger>` | `AppDialog`: Post-game Review modal, xác nhận đầu hàng |
| **Tabs** | `<Tabs>`, `<Tabs.ListContainer>`, `<Tabs.List>`, `<Tabs.Tab>`, `<Tabs.Indicator>`, `<Tabs.Panel>` | `AppTabs`: Chuyển tab sidebar (Ván đấu / Phân tích / Huấn luyện), chế độ so sánh theme |
| **TextField / Input** | `<TextField>`, `<Input>`, `<Label>`, `<FieldError>`, `<Description>` | `AppField`: Ô nhập câu hỏi trợ lý AI, lọc bài tập |
| **RadioGroup** | `<RadioGroup>`, `<Radio>`, `<Radio.Content>`, `<Radio.Control>`, `<Radio.Indicator>`, `<Label>` | `LobbyPrototype`: Chọn mức độ bot (Dễ, Vừa, Khó, Thử thách), chọn quân Trắng/Đen |
| **Select** | `<Select>`, `<Select.Trigger>`, `<Select.Value>`, `<Select.Indicator>`, `<Select.Popover>`, `<ListBox>`, `<ListBox.Item>` | `AppSelect`: Bộ lọc danh mục khai cuộc, theme selector |
| **Tooltip** | `<Tooltip>`, `<Tooltip.Trigger>`, `<Tooltip.Content>`, `<Tooltip.Arrow>` | `AppTooltip`: Giải thích nguồn gốc dữ liệu Stockfish / AI Coach |
| **Popover** | `<Popover>`, `<Popover.Content>` | Cài đặt ván cờ, menu âm thanh và bàn cờ |
| **Dropdown / Menu** | `<Dropdown>`, `<Dropdown.Popover>`, `<Dropdown.Menu>`, `<Dropdown.Item>`, `<Dropdown.Section>` | Menu người dùng, tùy chọn xuất PGN |
| **ProgressBar** | `<ProgressBar>`, `<ProgressBar.Track>`, `<ProgressBar.Fill>`, `<ProgressBar.Output>`, `<Label>` | Tiến độ hoàn thành lộ trình ngày, tỷ lệ thành thạo kỹ năng |
| **Skeleton** | `<Skeleton className="...">` | Trạng thái tải bài tập, khởi tạo Stockfish worker |
| **Spinner** | `<Spinner size="..." />` | Chỉ báo bot đang suy nghĩ, engine calculating |
| **Toast** | `toast.add({ title, description, variant })`, `<ToastQueue />` | Thông báo sao chép PGN, hoàn thành bài tập |

---

## 3. Chiến lược Wrapper (Wrapper Strategy)

Để đảm bảo sau này khi migrate sang production có thể kiểm soát toàn diện design tokens, không component nào trong `ui-lab/src/screens/` được import trực tiếp từ `@heroui/react`. Thay vào đó, toàn bộ màn hình giao tiếp qua lớp wrapper nội bộ tại `ui-lab/src/ui/`:

1. **`AppButton.tsx`**:
   - Wrap HeroUI `Button` với các variants tiêu chuẩn: `primary`, `secondary`, `tertiary`, `danger`, `ghost`.
   - Chuẩn hóa radius 8px, font-medium, micro-tap animation (translateY 1px), hỗ trợ leftIcon, rightIcon, isLoading và slot close.
2. **`AppDialog.tsx`**:
   - Wrap HeroUI `Modal` compound API, hỗ trợ focus trap, ESC escape, backdrop blur nhẹ, radius 12px, responsive full-width trên mobile.
3. **`AppTabs.tsx`**:
   - Wrap HeroUI `Tabs`, `Tabs.List`, `Tabs.Tab` với thanh `Tabs.Indicator` phẳng (không dùng spring quá đà), chuyển tab nhanh 160ms.
4. **`AppField.tsx`**:
   - Wrap HeroUI `TextField` + `Input` + `Label` + `FieldError`, border tinh gọn 1px, focus ring rõ ràng.
5. **`AppSelect.tsx`**:
   - Wrap HeroUI `Select` + `ListBox`, hỗ trợ keyboard selection, dropdown popover bóng nhẹ.
6. **`AppStatus.tsx`**:
   - Hiển thị badge trạng thái chuẩn mực (Engine ready, Coach basic, Stockfish source) với radius 6px và màu ngữ nghĩa.
7. **`AppTooltip.tsx`**:
   - Wrap HeroUI `Tooltip` với delay thân thiện 150ms và arrow tinh tế.

---

## 4. Những HeroUI Defaults Đã Override

| Thuộc tính | HeroUI v3 Mặc định | Override trong ui-lab | Lý do |
|---|---|---|---|
| **Radius** | `--radius: 0.5rem`, `--field-radius: 0.75rem`, nhiều nơi pill tròn | Button: 8px; Input/Select: 8px; Card/Panel: 8-10px; Modal: 12px; Badge: 6px | Tránh cảm giác đồ chơi hoặc dashboard AI phổ thông; tạo cảm giác công cụ chuyên nghiệp, tập trung. |
| **Shadow** | Đổ bóng đa tầng nặng (`--overlay-shadow`, `--surface-shadow`) | Giảm thiểu shadow trên Card; Modal/Popover shadow nhẹ; ưu tiên độ tương phản giữa Surface và Border | Giữ thị giác người chơi tập trung vào bàn cờ và nội dung nước đi. |
| **Motion** | Spring animations, transform liên tục | Micro-transitions 80-180ms ("Quiet Motion"); hỗ trợ triệt để `prefers-reduced-motion: reduce` | Tránh gây mỏi mắt khi phân tích ván cờ kéo dài. |
| **Colors** | Default oklch blue/zinc palette | 4 Themes riêng biệt: Option A (Graphite Cobalt), B (Warm Paper), C (Charcoal Pine), D (Clean Indigo) | Bản sắc cờ vua thực thụ, tách biệt hoàn toàn accent tương tác với semantic success. |
| **Focus Ring** | Outline màu accent mặc định | `outline: 2px solid var(--app-accent)`, `outline-offset: 2px`, rõ ràng trên mọi độ tương phản | Tuân thủ tiêu chuẩn Accessibility WCAG 2.1 AA. |

---

## 5. Những Component Giữ Custom (Không Dùng HeroUI Card)

Để bảo tồn ngữ nghĩa và hiệu năng tối đa của trò chơi cờ vua, các thành phần sau được xây dựng custom hoàn toàn:
1. **`ChessBoardPrototype`**: Bàn cờ SVG độ nét cao với tỷ lệ ô cờ chuẩn mực, overlay màu cờ (selected, last move, check) gắn trực tiếp với CSS variables của từng theme.
2. **`EvaluationBarPrototype`**: Thanh đánh giá lợi thế cờ vua với gradient động giữa Trắng và Đen, hiển thị điểm centipawn hoặc mate.
3. **`MoveHistoryPrototype`**: Bảng ghi biên bản nước cờ hai cột (Trắng - Đen) với chỉ báo highlight nước cờ hiện tại và phân loại sai lầm.
4. **`MistakeReviewRow`**: Hàng phân tích sai lầm chuyên sâu cho phép so sánh nước cờ thực tế vs nước cờ tối ưu, nguyên nhân và nút luyện tập liên quan.
5. **`DailyPlanPrototype` & Task Rows**: Thể hiện cấu trúc 5 nhiệm vụ ngày (1 bài học, 3 bài tập, 1 thử thách ván cờ) với logic hiển thị trực quan.
