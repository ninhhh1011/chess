# HeroUI v3 Maximization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maximize HeroUI v3 usage across all application presentation layers, replacing remaining bespoke raw `<button>` elements, custom alert boxes, and raw `<div>` wrappers with HeroUI compound cards (`AppCard`), surfaces (`AppSurface`), tabs (`AppTabs`), chips (`AppStatus`), and native HeroUI button variants while preserving chess domain specifics.

**Architecture:** Use HeroUI v3 primitives directly or via `src/ui/*` single-source wrappers. Replace hand-coded surface `<div>` panels with compound `AppCard` (`Header`, `Title`, `Description`, `Content`, `Footer`) and `AppSurface`. Replace raw `<button>` elements with `AppButton` or HeroUI interactive items. Keep Option C design tokens (`#0C100E`, `#141A17`, `#3FAD79`, `#C88954`).

**Tech Stack:** React 19, `@heroui/react` v3.2.4, `@heroui/styles` v3.2.4, Tailwind CSS 4, React Aria Components, Vite 8, Vitest.

**Spec:** `AGENTS.md`, `docs/HEROUI_FULL_MIGRATION_PLAN.md`

## Global Constraints

- Never reintroduce `framer-motion` or parallel design systems in `src/design-system/`.
- Do not use `<HeroUIProvider>`.
- Maintain Option C Charcoal + Pine + Copper visual identity.
- Retain custom chess domain logic (chessboard rendering, drag-and-drop, evaluation bar calculations, Stockfish UCI).
- All 749 unit/integration tests must remain 100% green at every step.
- No TypeScript or ESLint errors allowed.

## Review Focus

1. Move list clicks in `MoveHistory.jsx` when `analysisMode` is active vs inactive.
2. Form submission and validation error displays in `Login.jsx` and `Signup.jsx`.
3. Puzzle interaction and feedback banner state in `ExerciseBoard.jsx`.
4. Opening category filtering in `Openings.jsx` and mode switching in `OpeningDetail.jsx`.
5. Mobile viewport responsiveness without horizontal scroll or layout breaks.

---

### Task 1: Migrate MoveHistory to HeroUI Native List & Chips

**Files:**
- Modify: `src/components/chess/MoveHistory.jsx`
- Test: `src/components/chess/MoveHistory.test.jsx` (or run `npm test`)

**Interfaces:**
- Consumes: `AppButton`, `AppSurface`, `AppStatus`
- Produces: Accessible HeroUI move history list with native chip badges and copy button

- [ ] **Step 1: Check existing MoveHistory tests**
Run: `npx vitest run src/components/chess/MoveHistory.test.jsx`
Expected: PASS

- [ ] **Step 2: Update MoveHistory.jsx to replace raw `<button>` and `<span>` with HeroUI components**
Replace raw `<button>` with HeroUI `AppButton` (or interactive `AppSurface` / styled button) and replace raw annotation `<span>` with `AppStatus` with proper tone mapping.

- [ ] **Step 3: Run tests to verify MoveHistory behavior**
Run: `npx vitest run src/components/chess/MoveHistory.test.jsx`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/components/chess/MoveHistory.jsx
git commit -m "feat(ui): migrate MoveHistory to HeroUI button and chip compounds"
```

---

### Task 2: Migrate Login and Signup to HeroUI AppCard Compounds & Clean Alerts

**Files:**
- Modify: `src/pages/Login.jsx`
- Modify: `src/pages/Signup.jsx`

**Interfaces:**
- Consumes: `AppCard`, `AppButton`, `AppField`, `AppSurface`
- Produces: Full HeroUI card layout with header, title, description, content, footer, and navigation button

- [ ] **Step 1: Update Login.jsx**
Replace `AppSurface` outer wrapper with `AppCard` compound (`AppCard.Header`, `AppCard.Title`, `AppCard.Description`, `AppCard.Content`, `AppCard.Footer`). Replace raw `<button type="button" onClick={() => navigate('/signup')}>` with `AppButton` variant="ghost" / link. Replace raw error `<div>` with standard alert styling.

- [ ] **Step 2: Update Signup.jsx**
Replace `AppSurface` outer wrapper with `AppCard` compound (`AppCard.Header`, `AppCard.Title`, `AppCard.Description`, `AppCard.Content`, `AppCard.Footer`). Replace raw `<button type="button" onClick={() => navigate('/login')}>` with `AppButton` variant="ghost" / link. Replace raw error `<div>` with standard alert styling.

- [ ] **Step 3: Run tests and typecheck**
Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/pages/Login.jsx src/pages/Signup.jsx
git commit -m "feat(ui): upgrade Login and Signup to HeroUI AppCard compound architecture"
```

---

### Task 3: Migrate Exercises and ExerciseBoard to HeroUI Compounds

**Files:**
- Modify: `src/pages/Exercises.jsx`
- Modify: `src/components/ExerciseBoard.jsx`

**Interfaces:**
- Consumes: `AppCard`, `AppSurface`, `AppButton`, `AppStatus`
- Produces: Consistent exercise layout with HeroUI card details, surface board, and status chips

- [ ] **Step 1: Update Exercises.jsx**
Use `AppSurface` for corpus status and error banners. Use `AppStatus` for accuracy/progress indicators.

- [ ] **Step 2: Update ExerciseBoard.jsx**
Replace outer `<div>` with `AppSurface` for board wrapper and `AppCard` compound for puzzle details (`AppCard.Header`, `AppCard.Title`, `AppCard.Description`, `AppCard.Content`, `AppCard.Footer`).

- [ ] **Step 3: Run tests and verify**
Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/pages/Exercises.jsx src/components/ExerciseBoard.jsx
git commit -m "feat(ui): migrate Exercises and ExerciseBoard to HeroUI compounds"
```

---

### Task 4: Migrate Openings and OpeningDetail to HeroUI Tabs and Compounds

**Files:**
- Modify: `src/pages/Openings.jsx`
- Modify: `src/pages/OpeningDetail.jsx`
- Modify: `src/components/openings/OpeningTrainerBoard.jsx`

**Interfaces:**
- Consumes: `AppTabs`, `AppCard`, `AppSurface`, `AppButton`, `AppStatus`
- Produces: Seamless tab-based filtering and HeroUI card layouts for opening exploration

- [ ] **Step 1: Update Openings.jsx**
Replace custom filter button mapping with `AppTabs` (or structured HeroUI button group) for category selection.

- [ ] **Step 2: Update OpeningDetail.jsx & OpeningTrainerBoard.jsx**
Use `AppTabs` for mode switching (Learn vs Practice). Replace raw `<div className="...rounded-lg border bg-[var(--app-surface)]">` and `<aside>` with `AppSurface` and `AppCard` compounds.

- [ ] **Step 3: Run tests and verify**
Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/pages/Openings.jsx src/pages/OpeningDetail.jsx src/components/openings/OpeningTrainerBoard.jsx
git commit -m "feat(ui): migrate Openings and OpeningDetail to HeroUI tabs and cards"
```

---

### Task 5: Migrate Learn.jsx to HeroUI AppCard & Surface

**Files:**
- Modify: `src/pages/Learn.jsx`

**Interfaces:**
- Consumes: `AppCard`, `AppSurface`, `AppButton`
- Produces: Structured HeroUI compound card for lesson content and surface for chessboard preview

- [ ] **Step 1: Update Learn.jsx**
Replace raw `<article>` with `AppCard` compound (`AppCard.Header`, `AppCard.Title`, `AppCard.Content`). Wrap chessboard in `AppSurface`. Wrap example explanation in `AppSurface variant="raised"`.

- [ ] **Step 2: Run tests and verify**
Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/pages/Learn.jsx
git commit -m "feat(ui): migrate Learn lesson view to HeroUI AppCard and AppSurface"
```

---

### Task 6: Replace Remaining Raw Buttons in Analysis and Review Panels

**Files:**
- Modify: `src/components/analysis/GameReviewPanel.jsx`
- Modify: `src/components/review/PostGameReview.tsx`
- Modify: `src/components/OpeningExplorer.jsx`

**Interfaces:**
- Consumes: `AppButton`, `AppStatus`, `AppSurface`
- Produces: Fully interactive HeroUI buttons/items without raw unstyled button elements

- [ ] **Step 1: Update GameReviewPanel.jsx**
Replace raw `<button>` for blunder/worst moves with `AppButton` (variant="ghost" / custom interactive styling) with proper data attributes and HeroUI focus rings.

- [ ] **Step 2: Update PostGameReview.tsx**
Replace raw `<button>` for mistake items with `AppButton` (variant="ghost" / interactive surface) and clean HeroUI badge chips.

- [ ] **Step 3: Update OpeningExplorer.jsx**
Replace raw `<button>` for accordion toggle with `AppButton` or HeroUI Accordion structure.

- [ ] **Step 4: Run tests and verify**
Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/analysis/GameReviewPanel.jsx src/components/review/PostGameReview.tsx src/components/OpeningExplorer.jsx
git commit -m "feat(ui): replace raw buttons in GameReviewPanel, PostGameReview, and OpeningExplorer with HeroUI components"
```

---

### Task 7: Full Suite Verification & Browser Visual Inspection

**Files:**
- All touched files

- [ ] **Step 1: Run typecheck**
Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 2: Run linter**
Run: `npm run lint`
Expected: 0 warnings, 0 errors

- [ ] **Step 3: Run entire test suite**
Run: `npm test`
Expected: 55/55 test files pass, 749/749 tests pass

- [ ] **Step 4: Run production build**
Run: `npm run build`
Expected: Vite build succeeds with 0 errors

- [ ] **Step 5: Browser visual inspection with browser_subagent**
Verify Home, Play, Learn, Exercises, and Openings in the browser.

- [ ] **Step 6: Push to GitHub**
```bash
git push origin main
```
