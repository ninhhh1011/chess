# Craft Soft Editorial UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the entire frontend user interface to the "Craft Soft Editorial" design language (`craft.do-design.md`) and synchronize with HeroUI v3, replacing the dark theme with a clean, light, airy, and tactile editorial experience while preserving all chess logic and passing all 795 tests.

**Architecture:** Replace the legacy Charcoal+Pine dark CSS theme with `theme-craft-editorial.css`, bind HeroUI v3 CSS tokens to the new palette, update `src/ui/*` primitives with pill-shaped buttons and 24px rounded surfaces, replace the hard-edged navbar with a centered floating pill toolbar, and restyle all pages (`Home`, `Play`, `Learn`, `Exercises`, `Training`, `Openings`, `Auth`) with editorial typography and breathable layouts.

**Tech Stack:** React 19, Vite, Tailwind CSS 4 (`@tailwindcss/vite`), HeroUI v3 (`@heroui/react`, `@heroui/styles`), React Aria Components, Lucide React, react-chessboard, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-craft-soft-editorial-ui-redesign.md`

## Global Constraints

- Never break chess business logic, Stockfish web worker protocol, or the `useChessGame` hook.
- All interactive controls must use HeroUI v3 primitives or `src/ui/*` wrappers; no raw interactive elements.
- Design tokens must strictly match `craft.do-design.md`: Canvas `#FCF9F7`, Surface `#FFFFFF`, Primary Ink `#030302`, Secondary Teal `#427E8A`, Tertiary `#D7EAF0`, Accent `#A9D8F2`, Border `rgba(3,3,2,0.08)`, Error `#D94A4A`.
- Radii: Buttons `rounded-full`, Cards `rounded-[24px]`, Inputs `rounded-[14px]`, Navbar `rounded-full`.
- All checks (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`) must pass cleanly after each milestone.
- Responsive mobile layout must support 360px and 390px viewports without horizontal overflow.

## Review Focus

1. Mobile viewport horizontal overflow on 360px/390px devices caused by wide pill navbar or cards.
2. Contrast and legibility of chess board piece visibility against light/dark squares (`#FBF9F5` / `#587982`).
3. HeroUI v3 component style conflicts or missing hover/focus rings on light background.
4. Loss of game-over modal, resignation confirmation, or promotion selector popups during UI wrapper restyle.
5. Inadvertent regression in existing test suites asserting CSS classes or DOM hierarchy.

---

### Task 1: Theme & Typography Foundation (Craft Soft Editorial Tokens & Fonts)

**Files:**
- Create: `src/styles/theme-craft-editorial.css`
- Modify: `index.html`
- Modify: `src/index.css`
- Modify: `AGENTS.md` (Update Section 3 to document Craft Soft Editorial tokens)

**Interfaces:**
- Consumes: `craft.do-design.md` token specs
- Produces: CSS custom properties (`--app-bg`, `--app-surface`, `--app-foreground`, etc.) and font definitions for the entire application.

- [ ] **Step 1: Create `src/styles/theme-craft-editorial.css`**
  Define complete light-first palette from spec:
  ```css
  :root {
    color-scheme: light;
    --app-bg: #FCF9F7;
    --app-surface: #FFFFFF;
    --app-surface-raised: #FFFFFF;
    --app-surface-hover: #F8F6F4;
    --app-muted-surface: #F3F1EE;
    --app-foreground: #030302;
    --app-muted: #5C6460;
    --app-subtle: #8A948F;
    --app-disabled: #B4BCB7;
    --app-primary: #030302;
    --app-secondary: #427E8A;
    --app-secondary-hover: #376C77;
    --app-tertiary: #D7EAF0;
    --app-accent: #A9D8F2;
    --app-border: rgba(3, 3, 2, 0.08);
    --app-border-strong: rgba(3, 3, 2, 0.16);
    --app-success: #3D7D72;
    --app-warning: #C89B4F;
    --app-danger: #D94A4A;
    --app-info: #427E8A;
    --board-light: #FBF9F5;
    --board-dark: #587982;
    --board-selected: rgba(66, 126, 138, 0.28);
    --board-last-move: rgba(215, 234, 240, 0.65);
    --board-check: rgba(217, 74, 74, 0.40);
    --board-legal-dot: rgba(3, 3, 2, 0.25);
    --board-capture-ring: rgba(66, 126, 138, 0.50);
    --radius-full: 9999px;
    --radius-card: 24px;
    --radius-surface: 20px;
    --radius-input: 14px;
    --radius-modal: 24px;
    --shadow-floating: 0 10px 30px -4px rgba(3, 3, 2, 0.05), 0 4px 12px -2px rgba(3, 3, 2, 0.03);
    --shadow-card: 0 4px 20px rgba(3, 3, 2, 0.04);
    --shadow-modal: 0 20px 50px -10px rgba(3, 3, 2, 0.12);
  }
  ```

- [ ] **Step 2: Update `index.html`**
  Remove `class="dark" data-theme="dark"` from `<html>`.
  Update `<meta name="theme-color" content="#FCF9F7" />` and `<meta name="color-scheme" content="light" />`.
  Add Google Fonts link for `Newsreader` (Editorial Serif) and `Plus Jakarta Sans` (UI Sans).

- [ ] **Step 3: Update `src/index.css`**
  Replace `@import "./styles/theme-charcoal-pine.css";` with `@import "./styles/theme-craft-editorial.css";`.
  Set default `body` background to `var(--app-bg)` and color to `var(--app-foreground)`.
  Configure `font-family` fallbacks (`font-serif` for Newsreader/Georgia, `font-sans` for Plus Jakarta Sans/Inter).

- [ ] **Step 4: Verify typecheck & build**
  Run: `npm run typecheck && npm run build`
  Expected: Clean compilation.

- [ ] **Step 5: Commit**
  ```bash
  git add src/styles/theme-craft-editorial.css index.html src/index.css AGENTS.md
  git commit -m "style: establish Craft Soft Editorial tokens and typography foundation"
  ```

---

### Task 2: Rebuild Core UI Primitives (`src/ui/*`) with HeroUI v3 & Craft Shapes

**Files:**
- Modify: `src/ui/AppButton.tsx`
- Modify: `src/ui/AppCard.tsx`
- Modify: `src/ui/AppSurface.tsx`
- Modify: `src/ui/AppField.tsx`
- Modify: `src/ui/AppTextArea.tsx`
- Modify: `src/ui/AppTabs.tsx`
- Modify: `src/ui/AppStatus.tsx`
- Modify: `src/ui/AppDialog.tsx`
- Modify: `src/ui/AppDrawer.tsx`
- Modify: `src/ui/AppPopover.tsx`

**Interfaces:**
- Consumes: CSS tokens from Task 1, `@heroui/react` primitives.
- Produces: Polished `src/ui/*` export package with pill buttons (`rounded-full`), 24px cards, 14px inputs.

- [ ] **Step 1: Restyle `src/ui/AppButton.tsx`**
  - Implement full pill shape (`rounded-full` strictly).
  - Update variant styles:
    - `primary`: `bg-[#030302] text-white hover:opacity-90 active:scale-[0.99] font-medium shadow-xs`
    - `secondary`: `bg-white text-[#030302] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]`
    - `outline`: `bg-transparent text-[#030302] border border-[var(--app-border-strong)] hover:bg-[var(--app-surface-hover)]`
    - `ghost`: `bg-transparent text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]`
    - `danger`: `bg-[var(--app-danger)] text-white hover:opacity-90`
  - Heights: `sm` (36px, px-4), `md` (44px, px-5), `lg` (52px, px-7).

- [ ] **Step 2: Restyle `src/ui/AppCard.tsx` and `src/ui/AppSurface.tsx`**
  - `AppCard`: `rounded-[24px] border border-[var(--app-border)] bg-white p-6 shadow-[var(--shadow-card)] transition-all`.
  - `AppSurface`: Smooth white and off-white background containers (`rounded-[20px]`).

- [ ] **Step 3: Restyle Form & Input Primitives (`AppField.tsx`, `AppTextArea.tsx`)**
  - Rounded `rounded-[14px]`.
  - Background `bg-white`, border `border-[var(--app-border)]`.
  - Focus ring using secondary teal `focus:ring-2 focus:ring-[var(--app-secondary)]/30`.

- [ ] **Step 4: Restyle Navigation & Overlay Primitives (`AppTabs.tsx`, `AppStatus.tsx`, `AppDialog.tsx`, `AppDrawer.tsx`)**
  - `AppTabs`: Pill tab segments with soft indicator.
  - `AppStatus`: Pill badges (`rounded-full px-3 py-1 text-xs font-medium`).
  - `AppDialog` & `AppDrawer`: `rounded-[24px]`, clean white container with soft diffuse shadow.

- [ ] **Step 5: Run tests & verify**
  Run: `npm test`
  Expected: All UI tests pass.

- [ ] **Step 6: Commit**
  ```bash
  git add src/ui/
  git commit -m "feat(ui): rebuild UI primitives to Craft Soft Editorial pill shapes and soft surfaces"
  ```

---

### Task 3: Rebuild Floating Pill Navbar & Application Shell Layout

**Files:**
- Modify: `src/components/ui/Navbar.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `AppButton`, `AppPopover`, `AppDrawer`, `AppAvatar`, `useAuth`.
- Produces: Floating pill navigation toolbar and breathable application layout shell.

- [ ] **Step 1: Refactor `src/components/ui/Navbar.tsx` into a Floating Pill Toolbar**
  - Container: Centered floating pill with `max-w-5xl mx-auto mt-3 sm:mt-5 px-4 sm:px-6`.
  - Bar style: `bg-white/85 backdrop-blur-md rounded-full border border-[var(--app-border)] py-2 px-4 sm:px-6 shadow-[var(--shadow-floating)] flex items-center justify-between`.
  - Nav links: Pill-shaped active state `bg-[var(--app-muted-surface)] text-[var(--app-foreground)] rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium`.
  - CTA button: Pill "Chơi cờ" or Auth button.
  - Mobile drawer: Slide-over with clean editorial layout and large touch targets.

- [ ] **Step 2: Update `src/components/Layout.tsx`**
  - Set root wrapper with `min-h-screen bg-[var(--app-bg)] text-[var(--app-foreground)] flex flex-col`.
  - Adjust main container padding to provide generous breathing space: `max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10`.

- [ ] **Step 3: Test responsive navigation on mobile viewports**
  Check that 360px and 390px viewports render cleanly with no overflow.
  Run: `npm test`

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/ui/Navbar.tsx src/components/Layout.tsx
  git commit -m "feat(navbar): implement floating pill toolbar and airy layout shell"
  ```

---

### Task 4: Overhaul Homepage (`Home.jsx`) to Craft Soft Editorial

**Files:**
- Modify: `src/pages/Home.jsx`

**Interfaces:**
- Consumes: `AppButton`, `AppCard`, `AppSurface`, `useAuth`, `getUserProfile`.
- Produces: Editorial landing page with large serif display headlines, floating pill CTAs, visual preview board, and 4-step learning loop cards.

- [ ] **Step 1: Rewrite Hero Section in `src/pages/Home.jsx`**
  - Hero container with soft cloud-like background surface (`bg-white rounded-[28px] border border-[var(--app-border)] p-8 sm:p-12 shadow-[var(--shadow-card)]`).
  - Headline: `font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#030302] leading-[1.15]`.
  - Subtitle: `font-sans text-base sm:text-lg text-[var(--app-muted)] max-w-xl leading-relaxed`.
  - Pill action buttons: `AppButton` variant="primary" size="lg" (`rounded-full`) and variant="secondary" size="lg".
  - Preview board: Soft rounded card with ivory cream (`#FBF9F5`) and calm slate teal (`#587982`) squares.

- [ ] **Step 2: Redesign 4-Step Improvement Loop Cards**
  - Grid of 4 floating white cards: `rounded-[24px] p-6 space-y-4 hover:shadow-[var(--shadow-floating)] transition-all`.
  - Ink line icons in circular soft blue containers (`bg-[var(--app-tertiary)]/50 text-[var(--app-secondary)]`).
  - Clear editorial typography: bold title + breathable description.

- [ ] **Step 3: Redesign Personal Progress Preview**
  - Clean minimalist metrics card with serif counts and soft labels.

- [ ] **Step 4: Test & verify Home page**
  Run: `npm test`
  Verify Home rendering and responsiveness.

- [ ] **Step 5: Commit**
  ```bash
  git add src/pages/Home.jsx
  git commit -m "feat(home): redesign homepage to Craft Soft Editorial layout"
  ```

---

### Task 5: Refactor Play Workspace & Chess Board Theme

**Files:**
- Modify: `src/components/chess/GameLayout.jsx`
- Modify: `src/components/chess/ChessBoardPanel.jsx`
- Modify: `src/components/chess/LiveEvaluationBar.jsx`
- Modify: `src/components/chess/GameInfoBar.jsx`
- Modify: `src/components/chess/PlayerBar.jsx`
- Modify: `src/components/chess/PreGameLobby.jsx`
- Modify: `src/components/chess/PostGameReview.jsx`
- Modify: `src/pages/Play.jsx`

**Interfaces:**
- Consumes: `useChessGame`, `AppTabs`, `AppCard`, `AppSurface`, `AppButton`, `react-chessboard`.
- Produces: Editorial chess play experience with harmonious board colors (`#FBF9F5` / `#587982`), minimalist evaluation bar, and pill sidebar tabs.

- [ ] **Step 1: Update Board Colors in `ChessBoardPanel.jsx` and `GameLayout.jsx`**
  - Light squares: `#FBF9F5` (crisp ivory/cream).
  - Dark squares: `#587982` (calm muted slate teal).
  - Custom square styles: Selection ring `rgba(66, 126, 138, 0.28)`, Last move `rgba(215, 234, 240, 0.65)`, Check `rgba(217, 74, 74, 0.40)`.

- [ ] **Step 2: Restyle `LiveEvaluationBar.jsx`**
  - Clean vertical pill bar with ink `#030302` and white `#FFFFFF` indicators, soft slate background, subtle text.

- [ ] **Step 3: Restyle Sidebar & Tabs in `GameLayout.jsx`**
  - Container: White card `rounded-[24px] border border-[var(--app-border)] p-4 shadow-[var(--shadow-card)]`.
  - Pill tabs: "Ván đấu", "Phân tích", "Huấn luyện" with pill indicators.
  - Clean move history list with high contrast notation.

- [ ] **Step 4: Restyle `PreGameLobby.jsx` and `PlayerBar.jsx`**
  - Bot selector with pill chips, difficulty slider, color selection pills.
  - Player bar with clean avatar and timer pill.

- [ ] **Step 5: Run Play integration tests**
  Run: `npm test src/components/ChessGameBoard.integration.test.jsx src/hooks/useBotMove.test.ts`
  Expected: All integration tests pass.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/chess/ src/pages/Play.jsx
  git commit -m "feat(play): restyle chessboard and play workspace to Craft Soft Editorial"
  ```

---

### Task 6: Refactor Learn, Exercises, & Training Pages

**Files:**
- Modify: `src/pages/Learn.jsx` & `src/components/LessonCard.jsx`
- Modify: `src/pages/Exercises.jsx` & `src/components/ExerciseBoard.jsx`
- Modify: `src/pages/Training.jsx` & `src/components/training/*`

**Interfaces:**
- Consumes: Lesson and puzzle services, `AppCard`, `AppButton`, `AppSurface`.
- Produces: Polished educational views with editorial card galleries and tactile tactical solvers.

- [ ] **Step 1: Restyle `Learn.jsx` and `LessonCard.jsx`**
  - Lesson cards: White floating cards `rounded-[24px]` with serif titles, soft tags, and pill CTA.
  - Detail view: Editorial split layout (reading guide left, demonstration board right with ivory/slate colors).

- [ ] **Step 2: Restyle `Exercises.jsx` and `ExerciseBoard.jsx`**
  - Centered workspace card with clear tactical prompt, puzzle rating badge, and retry/next pill buttons.
  - Board styling aligned with ivory/slate palette.

- [ ] **Step 3: Restyle `Training.jsx` and Training components**
  - Personal dashboard cards with daily goals, level progress bar in teal/cloud-blue, and recommendation cards.

- [ ] **Step 4: Run Learn & Exercises test suites**
  Run: `npm test src/pages/Learn.test.jsx src/test/exerciseBoardRealSolution.test.jsx src/test/dailyPlan.test.js`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/pages/Learn.jsx src/components/LessonCard.jsx src/pages/Exercises.jsx src/components/ExerciseBoard.jsx src/pages/Training.jsx src/components/training/
  git commit -m "feat(learn-training): overhaul Learn, Exercises, and Training to editorial style"
  ```

---

### Task 7: Refactor Openings & Authentication Pages

**Files:**
- Modify: `src/pages/Openings.jsx` & `src/components/openings/OpeningCard.jsx`
- Modify: `src/pages/OpeningDetail.jsx` & `src/components/openings/OpeningTrainerBoard.jsx`
- Modify: `src/pages/Login.jsx`
- Modify: `src/pages/Signup.jsx`

**Interfaces:**
- Consumes: `AppCard`, `AppField`, `AppButton`, `useAuth`, openings database.
- Produces: Editorial openings explorer and minimalist authentication cards.

- [ ] **Step 1: Restyle `Openings.jsx` and `OpeningDetail.jsx`**
  - Filter chips as pill buttons.
  - Opening cards: White cards `rounded-[24px]`, serif title, move sequence notation chips in `#F3F1EE`.
  - Opening detail trainer board with synchronized board theme.

- [ ] **Step 2: Restyle `Login.jsx` and `Signup.jsx`**
  - Centered floating card `rounded-[28px] max-w-md mx-auto p-8 bg-white border border-[var(--app-border)] shadow-[var(--shadow-modal)]`.
  - Serif heading *"Chào mừng trở lại"*, soft input fields `rounded-[14px]`, pill submit button `bg-[#030302] text-white rounded-full`.

- [ ] **Step 3: Run Openings & Auth tests**
  Run: `npm test src/pages/Openings.test.jsx src/contexts/AuthContext.test.jsx`
  Expected: PASS.

- [ ] **Step 4: Commit**
  ```bash
  git add src/pages/Openings.jsx src/components/openings/ src/pages/OpeningDetail.jsx src/pages/Login.jsx src/pages/Signup.jsx
  git commit -m "feat(openings-auth): restyle Openings catalog and Auth views to Craft Soft Editorial"
  ```

---

### Task 8: Full Verification & Mobile Responsive Polish

**Files:**
- Modify: Any layout/styling adjustments needed based on verification.

**Interfaces:**
- Verification suite: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

- [ ] **Step 1: Run TypeScript typecheck**
  Run: `npm run typecheck`
  Expected: 0 errors.

- [ ] **Step 2: Run ESLint**
  Run: `npm run lint`
  Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Run full Vitest test suite**
  Run: `npm test`
  Expected: All 62 test files and 795 tests PASS.

- [ ] **Step 4: Run production build**
  Run: `npm run build`
  Expected: Build finishes cleanly and generates PWA artifacts.

- [ ] **Step 5: Verify mobile responsive layout**
  Verify 360px and 390px viewports for zero horizontal overflow and minimum 44px touch targets.

- [ ] **Step 6: Final Commit**
  ```bash
  git add .
  git commit -m "chore(ui): complete Craft Soft Editorial overhaul verification"
  ```

---
