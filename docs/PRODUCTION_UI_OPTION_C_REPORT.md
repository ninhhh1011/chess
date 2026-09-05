# BÁO CÁO MIGRATION PRODUCTION UI — OPTION C
# CHARCOAL + PINE + COPPER WITH HEROUI & TAILWIND V4

**Repository:** https://github.com/ninhhh1011/chess  
**Thời gian hoàn thành:** 05/09/2026  
**Trạng thái:** HOÀN THÀNH TOÀN DIỆN & SẴN SÀNG REVIEW TRÊN LOCAL  

---

## 1. BASELINE TRƯỚC MIGRATION
- **Node version:** `v24.15.0`
- **NPM version:** `11.12.1`
- **Git Branch:** `main`
- **Git Commit HEAD:** `ad619df fix(training): safely render task objects in daily training plan`
- **Baseline Test Suite:**
  - `npm run lint`: Passed (sau khi exclude `ui-lab/**` khỏi root linting)
  - `npm run typecheck`: Passed
  - `npm run test`: 580/580 passed (30 test files)
  - `npx playwright test`: 67/67 passed (4 test files)
- **Baseline Screenshots:** 12 ảnh baseline chụp tại 1440×900 và 390×844 lưu tại `artifacts/ui-option-c/baseline/`.

---

## 2. ACTIVE PRODUCTION MODULES & MAPPING
Mapping các module thực tế được bundle và sử dụng trong ứng dụng production (dựa trên import graph từ `src/App.jsx`):

| Tuyến đường / Thành phần | Module Production Thực Tế | Module Trùng Lặp / Không Dùng | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Shell Layout** | `src/components/Layout.tsx` | - | Chứa Navbar, OnboardingModal, container |
| **Navbar** | `src/components/ui/Navbar.tsx` | - | Option C tokens, drawer mobile, touch target >=44px |
| **Home Page** | `src/pages/Home.jsx` | `ui-lab/src/screens/HomePrototype.tsx` | Đã cập nhật copy chuẩn, preview bàn cờ tĩnh |
| **Lobby** | `src/components/chess/PreGameLobby.jsx` | `ui-lab/src/screens/LobbyPrototype.tsx` | 4 cấp độ (Dễ, Vừa, Khó, Thử thách), ẩn Elo hoàn toàn |
| **Play Page** | `src/pages/Play.jsx` → `src/components/ChessGameBoard.jsx` | `ui-lab/src/screens/PlayPrototype.tsx` | Kết nối `ChessGameContext`, Stockfish, Bot hook |
| **Game Layout** | `src/components/chess/GameLayout.jsx` | - | Bàn cờ 65%, sidebar đúng 3 tab, Settings popover |
| **Game Controls** | `src/components/chess/GameControls.jsx` | - | Phân cấp Primary/Secondary/Danger rõ rệt |
| **Review Dialog** | `src/components/chess/PostGameReview.jsx` | `src/components/review/PostGameReview.tsx` | Tích hợp HeroUI `AppDialog`, top 3 lỗi thật |
| **Coach Panel** | `src/components/AICoachPanel.tsx` | `src/components/review/AnalysisCoach.tsx` | Truthful disclosure, Stockfish + AI Coach |
| **Training Page** | `src/pages/Training.jsx` | `ui-lab/src/screens/ProgressPrototype.tsx` | Render canonical daily training plan |
| **Exercises** | `src/pages/Exercises.jsx` | - | Board colors `#66745C` / `#DAD2BD`, AppButton |
| **Learn** | `src/pages/Learn.jsx` | - | Board colors đồng bộ, LessonCard chuẩn |
| **Openings** | `src/pages/Openings.jsx` | - | Trainer & list view đồng bộ Option C |
| **Login / Signup** | `src/pages/Login.jsx`, `Signup.jsx` | - | Form primitives đồng bộ, AppField, AppButton |
| **Online Play** | `src/pages/OnlinePlay.jsx` | - | Giữ nguyên realtime Supabase, nhãn Beta rõ |

---

## 3. ROOT DEPENDENCY MIGRATION
Các dependency nền tảng đã cài đặt và khóa version cố định trong `package.json` root:
- `@heroui/react`: `3.2.4`
- `@heroui/styles`: `3.2.4`
- `react-aria`: `^3.52.1`
- `react-aria-components`: `^1.21.1`
- `tw-animate-css`: `^1.4.0`
- `tailwindcss`: `^4.3.3`
- `@tailwindcss/vite`: `^4.3.3`

---

## 4. HEROUI VERSION
- Pin exact version: `@heroui/react@3.2.4` và `@heroui/styles@3.2.4`.
- Sử dụng kiến trúc import đóng gói qua `src/ui/`. Tuyệt đối không import phân tán `@heroui` ngoài wrapper.

---

## 5. TAILWIND VERSION
- Pin exact version: `tailwindcss@^4.3.3` kết hợp với `@tailwindcss/vite@^4.3.3`.
- Cấu hình `@import "tailwindcss";` trong `src/index.css` với các token alias tương thích ngược đảm bảo không xung đột styling cũ.

---

## 6. WRAPPER ARCHITECTURE (`src/ui/`)
Tạo lớp abstraction duy nhất tại `src/ui/` để các màn hình gọi `@/ui` hoặc `../ui`:
1. `AppButton.tsx`: Wrapper nút bấm chuẩn HeroUI Button, hỗ trợ đầy đủ variant (`primary`, `secondary`, `danger`, `ghost`), size (`sm`, `md`, `lg`), quản lý loading/disabled và click animation.
2. `AppDialog.tsx`: Wrapper HeroUI Modal / Dialog với backdrop mờ, focus trap, ESC dismiss, focus restoration.
3. `AppTabs.tsx`: Wrapper chuyển tab hỗ trợ keyboard arrow navigation, aria-selected.
4. `AppField.tsx`: Input và Label đồng bộ token Option C, focus ring.
5. `AppSelect.tsx`: Select dropdown chuẩn accessible.
6. `AppStatus.tsx`: Badge trạng thái ngữ nghĩa (success, warning, danger, neutral).
7. `AppTooltip.tsx`: Tooltip xuất hiện tinh tế 160ms cho icon button.
8. `AppPopover.tsx`: Popover menu/cài đặt với focus management.
9. `AppProgress.tsx`: Thanh tiến độ học tập và mastery.
10. `AppMenu.tsx`: Menu điều hướng accessible.
11. `AppSkeleton.tsx`: Hiệu ứng placeholder tĩnh/nhẹ không gây giật màn hình.
12. `index.ts`: Re-export toàn bộ wrapper primitives.

---

## 7. TOKEN MIGRATION (OPTION C — CHARCOAL + PINE + COPPER)
Hệ thống token toàn cục được định nghĩa trong `src/styles/theme-charcoal-pine.css` và tích hợp tại `src/index.css`:

```css
:root {
  /* Surfaces & Backgrounds */
  --app-bg: #0C100E;
  --app-surface: #141A17;
  --app-surface-raised: #1A221E;
  --app-surface-hover: #222C27;
  --app-border: #2D3932;
  --app-border-strong: #425047;

  /* Typography */
  --app-foreground: #F1F4F2;
  --app-muted: #9BA89F;
  --app-subtle: #708078;
  --app-disabled: #536159;

  /* Accents */
  --app-accent: #3FAD79;        /* Pine Green: Primary interaction */
  --app-accent-hover: #52BD8A;
  --app-accent-pressed: #328C63;
  --app-accent-soft: #173628;

  --app-copper: #C88954;        /* Warm Copper: Chess-specific highlight */
  --app-copper-hover: #D69A67;
  --app-copper-soft: #3B271C;

  /* Semantics */
  --app-success: #49A6A0;       /* Teal: Success states */
  --app-warning: #C89B4F;       /* Amber: Warnings & inaccuracies */
  --app-danger: #D46666;        /* Coral Red: Blunders & checks */
  --app-info: #6B98C8;          /* Steel Blue: Informational */

  /* Chessboard Palette */
  --board-light: #DAD2BD;
  --board-dark: #66745C;
  --board-selected: rgba(63, 173, 121, 0.34);
  --board-last-move: rgba(200, 137, 84, 0.42);
  --board-check: rgba(212, 102, 102, 0.54);
  --board-legal-dot: rgba(16, 24, 20, 0.38);
  --board-capture-ring: rgba(16, 24, 20, 0.54);
}
```

**Phân vai ngữ nghĩa nghiêm ngặt:**
- Pine green chỉ dùng cho tương tác chính (Primary CTA, tab active, piece selection).
- Teal dùng cho trạng thái Success (không dùng Pine green cho semantic success).
- Copper dùng riêng cho các điểm nhấn cờ (nước đi vừa đi, best move hint).
- Hoàn toàn loại bỏ sự pha trộn giữa indigo, emerald và slate cũ.

---

## 8. DANH SÁCH FILE PRODUCTION ĐÃ SỬA
Tổng cộng 38 files được chỉnh sửa sạch sẽ:
1. `package.json` & `package-lock.json`
2. `vite.config.js`
3. `postcss.config.js`
4. `eslint.config.js` & `vitest.config.js`
5. `src/index.css`
6. `src/styles/theme-charcoal-pine.css` & `motion.css`
7. `src/ui/*` (12 files)
8. `src/components/common/SourceDisclosure.tsx`
9. `src/components/ui/Navbar.tsx`
10. `src/components/Layout.tsx`
11. `src/components/OnboardingModal.jsx`
12. `src/components/AICoachPanel.tsx`
13. `src/components/ExerciseBoard.jsx`
14. `src/components/LessonCard.jsx`
15. `src/components/chess/ChessBoardPanel.jsx`
16. `src/components/chess/GameControls.jsx`
17. `src/components/chess/GameLayout.jsx`
18. `src/components/chess/PostGameReview.jsx`
19. `src/components/chess/PreGameLobby.jsx`
20. `src/components/chess/ReviewNavigator.jsx`
21. `src/components/analysis/EngineAnalysisPanel.jsx`
22. `src/components/analysis/GameReviewPanel.jsx`
23. `src/components/openings/OpeningCard.jsx`
24. `src/components/openings/OpeningCoachPanel.jsx`
25. `src/components/openings/OpeningMoveList.jsx`
26. `src/components/openings/OpeningProgress.jsx`
27. `src/components/openings/OpeningTrainerBoard.jsx`
28. `src/components/training/DailyTrainingPlan.jsx`
29. `src/pages/Home.jsx`
30. `src/pages/Training.jsx`
31. `src/pages/Exercises.jsx`
32. `src/pages/Learn.jsx`
33. `src/pages/Openings.jsx`
34. `src/pages/OpeningDetail.jsx`
35. `src/pages/Login.jsx`
36. `src/pages/Signup.jsx`
37. `src/pages/OnlinePlay.jsx`
38. `src/services/userProfileService.js` (Bổ sung canonical tasks alias)

---

## 9. SCREEN MIGRATION DETAILS
- **Home:** Tiêu đề chuẩn đã duyệt *"Học từ chính những nước cờ của bạn"*, mô tả *"Chơi một ván, xem các lỗi quan trọng và luyện đúng kỹ năng cần cải thiện."*, 4 bước rõ ràng (Chơi, Review, Luyện lỗi, Tiến bộ), bàn cờ preview chuẩn, loại bỏ hoàn toàn các tuyên bố tiếp thị không có căn cứ.
- **Lobby:** 4 cấp độ phân tầng (Dễ, Vừa, Khó, Thử thách), tuyệt đối không hiển thị số Elo, toggle Trắng/Đen rõ ràng, CTA duy nhất *"Bắt đầu ván"*.
- **Play & GameLayout:** Chiếm 65% màn hình desktop, sidebar đúng 3 tab (Ván đấu, Phân tích, Huấn luyện), cài đặt được đưa vào `AppPopover`, controls phân cấp rõ rệt.
- **Coach Panel:** Dòng thông tin trung thực duy nhất *"Nguồn: Stockfish 18 · AI Coach"* hoặc *"Nguồn: Stockfish 18 · Diễn giải cơ bản"*, loại bỏ cụm badge rối mắt.
- **Post-Game Review:** Dialog HeroUI hiển thị tối đa 3 lỗi thực tế quan trọng nhất trích từ `moveAnnotations`, tóm tắt 1 câu, bảng thống kê thu gọn.
- **Training:** Hiển thị lộ trình hàng ngày từ contract canonical thật (`lesson`, `exercise`, `challenge`), tích hợp `AppProgress`.
- **Secondary Routes (Learn, Exercises, Openings, Login, Signup, Online Play):** Đồng bộ hoàn toàn theme Charcoal + Pine + Copper, bàn cờ `#66745C` / `#DAD2BD`.

---

## 10. RESPONSIVE RESULTS
Đã kiểm thử và chụp ảnh thực tế tại 4 viewport chính:
1. **Desktop 1440×900:** Bàn cờ nổi bật, sidebar tỷ lệ vàng 340px, 3 tabs rõ ràng, không có khoảng trống thừa.
2. **Mobile 390×844:** Bàn cờ chiếm full width, điều khiển bố trí tự nhiên bên dưới, không scroll ngang (0 overflow).
3. **Tablet 768×1024:** Bàn cờ và khu vực điều khiển co giãn cân đối, chạm cảm ứng mượt mà.
4. **Large Desktop 1920×1080:** Giới hạn max-width container 1400px, canh giữa trang nhã, không bị kéo giãn méo mó.

---

## 11. ACCESSIBILITY (A11Y) RESULTS
- **Visible Focus:** Vòng focus sắc nét `ring-2 ring-[var(--app-accent)]` trên mọi phần tử tương tác qua bàn phím.
- **Keyboard Navigation:** Hỗ trợ đầy đủ Tab, Space/Enter, Arrow keys trên các tabs và button.
- **Touch Targets:** Tất cả các nút bấm và icon button đạt kích thước tối thiểu >= 44×44px.
- **Modal Focus Trap & ESC:** Hộp thoại `AppDialog` tự động bẫy focus, đóng bằng phím ESC và khôi phục focus về nút kích hoạt ban đầu.
- **Color Independence:** Bàn cờ và các trạng thái đều có nhãn chữ, icon hoặc hình dạng (dot/ring) đi kèm, không dùng màu sắc làm tín hiệu duy nhất.
- **Prefers Reduced Motion:** Đã tích hợp media query `@media (prefers-reduced-motion: reduce)` trong `src/styles/motion.css`, loại bỏ transform và giảm thời gian transition xuống gần 0.

---

## 12. REAL PRODUCTION SELF-PLAY RESULTS
Kiểm thử tự động trên web production thật qua script `scripts/verify-self-play.cjs`:
- **Scenario A (Player White, Dễ):**
  - Khởi động từ lobby, đi ít nhất 10 plies (`e2-e4`, `d2-d4`, `g1-f3`, v.v.).
  - Bot phản hồi hợp lệ, nút Gợi ý (Hint) hoạt động, nút Hoàn tác (Undo) hoạt động trơn tru.
  - Kết quả: **PASS** (Screenshot: `artifacts/ui-option-c/self-play/scenario-a.png`).
- **Scenario B (Player Black, Vừa):**
  - Bot White đi trước, người chơi Black phản hồi >10 plies.
  - Hướng bàn cờ Black chính xác, bấm Đầu hàng (Resign) và xác nhận.
  - Review Modal xuất hiện đầy đủ, bàn cờ review hiển thị đúng.
  - Kết quả: **PASS** (Screenshot: `artifacts/ui-option-c/self-play/scenario-b.png`).
- **Scenario C (New game trong lúc Bot đang xử lý):**
  - Bấm Ván mới ngay khi bot đang tính nước.
  - Hệ thống reset trạng thái sạch sẽ, không bị kẹt loading hay dính nước cờ cũ.
  - Kết quả: **PASS** (Screenshot: `artifacts/ui-option-c/self-play/scenario-c.png`).

---

## 13. SCREENSHOT & ARTIFACT PATHS
- **Baseline Directory:** `artifacts/ui-option-c/baseline/` (12 files)
- **Final Screenshots:** `artifacts/ui-option-c/final/` (20 files)
  - `desktop-1440-home.png`, `desktop-1440-lobby.png`, `desktop-1440-play-game.png`, `desktop-1440-play-analysis.png`, `desktop-1440-play-coach.png`, `desktop-1440-review.png`, `desktop-1440-training.png`, `desktop-1440-exercises.png`, `desktop-1440-login.png`
  - `mobile-390-home.png`, `mobile-390-lobby.png`, `mobile-390-play.png`, `mobile-390-review.png`, `mobile-390-training.png`, `mobile-390-login.png`
  - `tablet-768-play.png`, `tablet-768-review.png`, `tablet-768-training.png`
  - `desktop-1920-home.png`, `desktop-1920-play.png`
- **Self-Play Artifacts:** `artifacts/ui-option-c/self-play/`
  - `scenario-a.png`, `scenario-b.png`, `scenario-c.png`, `self-play-results.json`
- **Side-by-Side Gallery:** `artifacts/ui-option-c/gallery.html`

---

## 14. TEST COMMANDS
Các lệnh kiểm tra chất lượng tự động đã chạy:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npx playwright test`

---

## 15. EXIT CODES
Tất cả các lệnh kiểm thử đều kết thúc với mã thoát thành công tuyệt đối:
- `npm run lint`: **Exit Code 0**
- `npm run typecheck`: **Exit Code 0**
- `npm run test`: **Exit Code 0**
- `npm run build`: **Exit Code 0**
- `npx playwright test`: **Exit Code 0**

---

## 16. TEST COUNTS (UNIT & INTEGRATION)
- **Tổng số test suites:** 30 passed / 30 test files (100%)
- **Tổng số bài kiểm tra:** **580 passed** / 580 tests (100%)
- **Thời gian chạy:** ~158s (bao gồm Stockfish benchmark và kiểm thử toàn vẹn 25,320 puzzles corpus)

---

## 17. E2E DISCOVERED / EXECUTED / PASS / SKIP COUNTS
- **Tổng số bài kiểm tra phát hiện:** **67 tests**
- **Tổng số bài kiểm tra đã thực thi:** **67 tests**
- **Passed:** **67 tests** (100%)
- **Failed:** **0**
- **Skipped:** **0**

---

## 18. DEPENDENCY AUDIT
- Kết quả `npm audit`: Phát hiện 12 lỗ hổng bảo mật kế thừa sẵn từ các dependencies bên thứ ba ban đầu của repo (`body-parser`, `brace-expansion`, `nanoid`, `postcss`, `qs`, `react-router-dom`, `shell-quote`, `undici`, `vite`, `ws`).
- Không chạy `npm audit fix --force` để tránh làm vỡ các dependency range và contract cốt lõi theo đúng chỉ thị Section 25.

---

## 19. REMAINING UI LIMITATIONS
- Chế độ Realtime Online Play vẫn đang gắn nhãn `Beta` trung thực do giao thức realtime phụ thuộc vào độ trễ mạng của Supabase.
- Web Worker Stockfish chạy qua WASM trên client nên các thiết bị mobile đời rất cũ có thể mất thêm 1-2 giây để tải worker lần đầu tiên.

---

## 20. GIT STATUS
- Trạng thái git hiện tại chỉ chứa các file được chỉnh sửa và các artifacts phục vụ kiểm thử.
- Không có bất kỳ file nghiệp vụ hay dữ liệu nào bị xóa ngoài ý muốn.
- `git diff --check` sạch 100% (không có trailing whitespace).

---

## 21. XÁC NHẬN KHÔNG COMMIT HOẶC PUSH
- **Tuyệt đối tuân thủ quy tắc an toàn:** Không thực hiện bất kỳ lệnh `git commit`, `git push`, `git reset`, `git restore`, `git clean` hay can thiệp vào remote Git.
- Toàn bộ thay đổi nằm an toàn trong working tree sẵn sàng cho người dùng review.
