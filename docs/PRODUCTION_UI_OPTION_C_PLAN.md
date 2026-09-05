# Production UI Option C Migration Plan
# Áp dụng thiết kế Option C (Charcoal + Pine + Copper) vào Production Chess Web App

**Repository**: `e:\chess` (Production)
**Visual Reference & Source of Truth**: `ui-lab/`
**Target Design System**: Option C — Charcoal (`#0C100E`, `#141A17`, `#1A221E`) + Pine (`#3FAD79`) + Copper (`#C88954`)
**UI Foundation**: HeroUI v3.2.4 + Tailwind CSS v4

---

## 1. Baseline System & Status

### Git & Environment
- **Branch**: `main`
- **HEAD commit**: `ad619df fix(training): safely render task objects in daily training plan`
- **Node.js**: `v24.15.0`
- **NPM**: `11.12.1`
- **Dirty Files before start**:
  - Untracked `UI_OPTION_C_REPORT.md` (from UI lab phase)
  - Untracked `ui-lab/**` (standalone prototype directory)
  - Untracked `scripts/take-baseline-screenshots.cjs`
  - Untracked `artifacts/ui-option-c/baseline/*.png` (12 baseline screenshots)

### Baseline Quality Checks
1. **Lint** (`npm run lint`):
   - Found 111 errors caused by ESLint trying to lint bundled `ui-lab/dist/**`.
   - Core production files: clean when `ui-lab/**` is excluded.
2. **Typecheck** (`npm run typecheck`):
   - **PASS** (Exit code 0, clean TypeScript check with `tsc --noEmit`).
3. **Unit / Integration Tests** (`npm run test`):
   - **580 passed** out of 580 tests. Only failed on `ui-lab/test/smoke.test.cjs` (which was a standalone node runner script in prototype). All 30 production suites passed with 100% success (including 25,320 puzzles gate, bot stress test 200 requests, game latency benchmark).
4. **Production Build** (`npm run build`):
   - **PASS** (Exit code 0, 2355 modules transformed, PWA precache generated).
5. **Playwright E2E Tests** (`npx playwright test`):
   - Total 67 tests across 4 files: `chess.spec.js` (29 tests), `productFlow.spec.js` (26 tests), `smoke.spec.js` (7 tests), `stockfish.spec.js` (5 tests).
   - 65 passed, 2 failed in `productFlow.spec.js` due to a mismatch where tests checked `parsed.tasks` on the root profile in `localStorage` instead of `parsed.dailyTrainingPlan.tasks`.
6. **Baseline Screenshots Captured**:
   - `artifacts/ui-option-c/baseline/` (1440x900 & 390x844 for Home, Lobby, Play, Review, Training, Login).

---

## 2. Active Production Modules & Duplicate Audit

### Active Production Modules (Resolved from `src/App.jsx` & `src/main.jsx`)
- Entry: `src/main.jsx` -> `src/App.jsx` -> `src/index.css`
- Shell / Navigation: `src/components/Layout.tsx`, `src/components/ui/Navbar.tsx`
- Home: `src/pages/Home.jsx` (Active caller from `src/App.jsx`)
- Play: `src/pages/Play.jsx` -> `src/components/ChessGameBoard.jsx` -> `src/components/chess/GameLayout.jsx`
- Board & Controls:
  - `src/components/chess/ChessBoardPanel.jsx`
  - `src/components/chess/GameControls.jsx`
  - `src/components/chess/GameInfoBar.jsx`
  - `src/components/chess/PlayerBar.jsx`
  - `src/components/chess/LiveEvaluationBar.jsx`
  - `src/components/chess/MoveHistory.jsx`
  - `src/components/chess/MoveHintDisplay.jsx`
  - `src/components/chess/PromotionModal.jsx`
  - `src/components/chess/ReviewNavigator.jsx`
  - `src/components/chess/StartNotice.jsx`
- Lobby: `src/components/chess/PreGameLobby.jsx`
- Post Game Review: `src/components/chess/PostGameReview.jsx` (Imported by `GameLayout.jsx`)
- Analysis & Coach:
  - `src/components/analysis/EngineAnalysisPanel.jsx`
  - `src/components/analysis/MoveClassificationBadge.jsx`
  - `src/components/AICoachPanel.tsx`
- Training: `src/pages/Training.jsx`, `src/components/training/DailyTrainingPlan.jsx`
- Secondary Pages: `src/pages/Learn.jsx`, `src/pages/Exercises.jsx`, `src/pages/Openings.jsx`, `src/pages/OpeningDetail.jsx`, `src/pages/Login.jsx`, `src/pages/Signup.jsx`, `src/pages/OnlinePlay.jsx`

### Duplicate / Inactive Modules Identified
1. `src/pages/Home.tsx`: Dead duplicate of `src/pages/Home.jsx`. Vite resolves `Home.jsx` by default.
2. `src/components/review/PostGameReview.tsx`: Dead duplicate of `src/components/chess/PostGameReview.jsx`.
3. `src/components/analysis/GameReviewPanel.jsx`: Unused alternate panel.
4. Old Design System Primitives: `src/design-system/primitives/` (Button.tsx, Card.tsx, Input.tsx, Badge.tsx) — used only by legacy unit tests and dead `Home.tsx`.
*Strategy*: Consolidate active implementations without breaking existing imports or tests.

---

## 3. Dependency & Tooling Migration

### HeroUI v3 & Tailwind v4 Strategy
Matches tested versions from `ui-lab/package.json`:
- `@heroui/react`: `^3.2.4`
- `@heroui/styles`: `^3.2.4`
- `react-aria-components`: `^1.7.1`
- `react-aria`: `^3.38.1`
- `tailwindcss`: `^4.0.9`
- `@tailwindcss/vite`: `^4.0.9`

### Configuration Adjustments
- `vite.config.js`: Add `@tailwindcss/vite` plugin, ensure path aliases `@` -> `./src` are intact, configure HeroUI styles.
- `src/index.css`: Replace Tailwind v3 directives (`@tailwind base;` etc.) with `@import "tailwindcss";` and import Option C theme tokens (`--app-bg`, `--app-surface`, `--app-accent`, `--app-copper`, etc.) along with quiet motion definitions and reduced-motion rules.
- `eslint.config.js` & `vitest.config.js`: Add `'ui-lab/**'` to ignores/excludes to keep prototype isolated from production test runs.

---

## 4. Production UI Wrapper Architecture (`src/ui/`)

Adapt tested primitives from `ui-lab/src/ui/`:
```
src/ui/
├── AppButton.tsx        # Variants: primary (pine), secondary, danger, outline, ghost; size: sm/md/lg; quiet press motion
├── AppDialog.tsx        # HeroUI Modal wrapper, 12px radius, focus trap, ESC handling, dark overlay
├── AppTabs.tsx          # HeroUI Tabs wrapper with pine accent indicator
├── AppField.tsx         # HeroUI Input / TextField wrapper, 8px radius, accessible labels, error association
├── AppSelect.tsx        # HeroUI Select wrapper
├── AppStatus.tsx        # Truthful status badge (Teal success, Amber warning, Red danger, Blue info)
├── AppTooltip.tsx       # HeroUI Tooltip wrapper with quiet motion (160ms)
├── AppPopover.tsx       # HeroUI Popover wrapper for settings & menu dropdowns
├── AppProgress.tsx      # HeroUI Progress bar wrapper with pine/teal semantic tracks
├── AppMenu.tsx          # HeroUI Dropdown / Menu wrapper
├── AppSkeleton.tsx      # Clean loading skeleton (no infinite aggressive pulsing)
└── index.ts             # Clean export barrier (@/ui)
```

Domain components (Chess board, Piece rendering, Eval bar, Legal move dots, Capture rings) remain specialized and will NOT be wrapped in generic cards.

---

## 5. Token System & Visual Hierarchy (Option C)

```css
--app-bg: #0C100E;
--app-surface: #141A17;
--app-surface-raised: #1A221E;
--app-surface-hover: #222C27;
--app-border: #2D3932;
--app-border-strong: #425047;

--app-foreground: #F1F4F2;
--app-muted: #9BA89F;
--app-subtle: #708078;
--app-disabled: #536159;

--app-accent: #3FAD79;        /* Pine: primary actions, turn indicators, focus */
--app-accent-hover: #52BD8A;
--app-accent-pressed: #328C63;
--app-accent-soft: #173628;

--app-copper: #C88954;        /* Copper: chess highlight, last move, gold eval */
--app-copper-hover: #D69A67;
--app-copper-soft: #3B271C;

--app-success: #49A6A0;       /* Teal: verified correct, success only */
--app-warning: #C89B4F;       /* Amber: warning, inaccuracy */
--app-danger: #D46666;        /* Coral red: blunder, check, resign */
--app-info: #6B98C8;          /* Blue: informational state */
```

---

## 6. Migration Tasks & Checklists

- [ ] **Task 1: Tooling & Foundation**
  - Install HeroUI v3.2.4 & Tailwind v4 dependencies.
  - Update `vite.config.js` and `src/index.css`.
  - Fix `eslint.config.js` and `vitest.config.js` exclusions.
  - Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.

- [ ] **Task 2: Wrapper Primitives (`src/ui/`)**
  - Implement all 11 wrappers in `src/ui/` adapting from `ui-lab/src/ui/`.
  - Add `SourceDisclosure.tsx` component in `src/components/common/`.
  - Verify wrappers with TypeScript and lint.

- [ ] **Task 3: Global Shell, Navigation & Layout**
  - Migrate `src/components/Layout.tsx` and `src/components/ui/Navbar.tsx`.
  - Responsive mobile drawer / popover with touch target >= 44px, ESC handling.
  - Remove decorative emojis in navbar; keep all existing routes intact.

- [ ] **Task 4: Home Page Migration**
  - Migrate `src/pages/Home.jsx` to Option C layout.
  - Use approved heading: "Học từ chính những nước cờ của bạn".
  - Use approved description: "Chơi một ván, xem các lỗi quan trọng và luyện đúng kỹ năng cần cải thiện."
  - Primary CTA: "Chơi ván đầu tiên" -> `/play`.
  - Secondary CTA: "Xem kế hoạch hôm nay" -> `/training`.
  - 4-step loop presentation (Chơi -> Review bằng Stockfish -> Luyện đúng lỗi -> Theo dõi tiến bộ).
  - Remove unsubstantiated marketing claims.

- [ ] **Task 5: Pre-Game Lobby**
  - Migrate `src/components/chess/PreGameLobby.jsx` using `AppTabs`/segmented controls.
  - 4 difficulty levels: Dễ, Vừa, Khó, Thử thách (hide Elo numbers from UI, preserve internal bot settings).
  - Color selection toggle (Trắng / Đen).
  - Single primary CTA: "Bắt đầu ván".

- [ ] **Task 6: Play Screen & Controls**
  - Migrate `src/components/chess/GameLayout.jsx`, `src/components/chess/GameControls.jsx`, `src/components/chess/GameInfoBar.jsx`.
  - 3 main sidebar tabs: Ván đấu (`moves`), Phân tích (`analysis`), Huấn luyện (`coach`).
  - Bot Settings moved to `AppPopover` from gear icon button.
  - Primary/Secondary action visual hierarchy; no 5 equal weight buttons.
  - Add ARIA labels and tooltips.

- [ ] **Task 7: Coach Panel & Disclosure**
  - Migrate `src/components/AICoachPanel.tsx`.
  - Honest disclosure: "Nguồn: Stockfish 18 · Diễn giải cơ bản" or "AI Coach" when API active.
  - Clean skeleton loading; no full panel pulse.

- [ ] **Task 8: Post-Game Review Modal**
  - Migrate `src/components/chess/PostGameReview.jsx` with `AppDialog`.
  - Priority layout: 1. Result -> 2. Summary -> 3. Top 3 mistakes -> 4. Actions -> 5. Collapsible stats.
  - Real mistake rows with real move data.

- [ ] **Task 9: Training / Progress Screen**
  - Migrate `src/pages/Training.jsx` and `src/components/training/DailyTrainingPlan.jsx`.
  - Connect real user profile & daily training plan contract.
  - Use `AppProgress` with Option C tokens.

- [ ] **Task 10: Secondary Routes**
  - Migrate `src/pages/Learn.jsx`, `src/pages/Exercises.jsx`, `src/pages/Openings.jsx`, `src/pages/OpeningDetail.jsx`, `src/pages/Login.jsx`, `src/pages/Signup.jsx`, `src/pages/OnlinePlay.jsx`.

- [ ] **Task 11: Production Self-Play Verification**
  - Scenario A: White, Dễ, >= 10 plies, hint & undo check.
  - Scenario B: Black, Vừa, >= 10 plies, resign & review modal check.
  - Scenario C: Interrupted game with new game request, no stale state.

- [ ] **Task 12: Visual & Accessibility Verification**
  - Capture 17 final screenshots at 1440x900, 390x844, 768x1024, 1920x1080.
  - Generate side-by-side gallery `artifacts/ui-option-c/gallery.html`.

- [ ] **Task 13: Full Test Suite & Report**
  - Full vitest (580+ tests), Playwright E2E suite, production preview audit.
  - Generate `docs/PRODUCTION_UI_OPTION_C_REPORT.md`.
