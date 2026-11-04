# Craft Soft Editorial — UI Architecture & Design Specification

**Document Version:** 1.0  
**Date:** 2026-11-04  
**Status:** Approved for Implementation Planning  
**Target Design Standard:** `craft.do-design.md` (Craft Soft Editorial)  
**Component Engine:** HeroUI v3 (`@heroui/react` >=3.2.4) + React Aria Components  
**CSS Foundation:** Tailwind CSS 4 (`@tailwindcss/vite`)  

---

## 1. Overview & Vision

### 1.1 Intent & Problem Statement
The current user interface is locked to a dark, rigid theme (`#0C100E`) with dense padding, small radii (8px/10px), hard borders, and a monolithic navbar that feels cluttered, utilitarian, and heavy.

This redesign completely discards the legacy dark theme and rebuilds the frontend UI from the ground up according to **Craft Soft Editorial** (`craft.do-design.md`). The outcome is an airy, light, and tactile chess learning environment with:
- Warm paper-like canvas (`#FCF9F7`) and pure white floating surfaces (`#FFFFFF`).
- Expressive editorial Serif typography for prominent headlines contrasted with modern clean Sans for chess controls.
- Pill-shaped buttons (`rounded-full`) in stark ink-black (`#030302`) and subtle secondary tones.
- Floating translucent pill Navbar with gentle backdrop blur.
- Cohesive, tranquil chessboard colorway harmonious with the light editorial palette.
- Strict preservation of chess engine logic (Stockfish), hooks (`useChessGame`), and all 795 passing test cases.

---

## 2. Design System & Tokens

### 2.1 Color Palette (`craft.do-design.md`)

```css
:root {
  color-scheme: light;

  /* Surfaces & Backgrounds */
  --app-bg: #FCF9F7;               /* Neutral warm off-white canvas */
  --app-surface: #FFFFFF;          /* Pure white for cards, panels, modals */
  --app-surface-raised: #FFFFFF;   /* Raised floating containers */
  --app-surface-hover: #F8F6F4;    /* Subtle hover state */
  --app-muted-surface: #F3F1EE;    /* Secondary quiet warm gray */

  /* Ink & Typography */
  --app-foreground: #030302;       /* Primary near-black ink */
  --app-muted: #5C6460;            /* Muted body and secondary text */
  --app-subtle: #8A948F;           /* Subtle labels, captions, metadata */
  --app-disabled: #B4BCB7;         /* Disabled state */

  /* Accents & Brand Roles */
  --app-primary: #030302;          /* Primary CTA fill (Ink Black) */
  --app-primary-foreground: #FFFFFF;
  --app-secondary: #427E8A;        /* Muted Teal accent for links & highlights */
  --app-secondary-hover: #376C77;
  --app-tertiary: #D7EAF0;         /* Pale cloud blue for soft panels & chips */
  --app-accent: #A9D8F2;           /* Sky blue highlight */
  --app-border: rgba(3, 3, 2, 0.08); /* Faint translucent border (border-soft) */
  --app-border-strong: rgba(3, 3, 2, 0.16);

  /* Semantic Feedback */
  --app-success: #3D7D72;          /* Tactile muted teal success */
  --app-warning: #C89B4F;          /* Amber for inaccuracies / caution */
  --app-danger: #D94A4A;           /* Editorial coral red for blunder / check / errors */
  --app-info: #427E8A;             /* Slate teal for information */

  /* Chessboard Specific Tokens */
  --board-light: #FBF9F5;          /* Crisp ivory / warm cream */
  --board-dark: #587982;           /* Calm muted slate teal */
  --board-selected: rgba(66, 126, 138, 0.28);
  --board-last-move: rgba(215, 234, 240, 0.65);
  --board-check: rgba(217, 74, 74, 0.40);
  --board-legal-dot: rgba(3, 3, 2, 0.25);
  --board-capture-ring: rgba(66, 126, 138, 0.50);

  /* Radius Standards */
  --radius-full: 9999px;           /* Pill shape: buttons, badges, navbar */
  --radius-card: 24px;             /* Editorial cards & panels */
  --radius-surface: 20px;          /* Sub-surfaces & modules */
  --radius-input: 14px;            /* Form fields & search */
  --radius-modal: 24px;            /* Dialogs, sheets, modals */
  --radius-chip: 9999px;           /* Tags & chips */

  /* Soft Elevation / Diffuse Shadows */
  --shadow-floating: 0 10px 30px -4px rgba(3, 3, 2, 0.05), 0 4px 12px -2px rgba(3, 3, 2, 0.03);
  --shadow-card: 0 4px 20px rgba(3, 3, 2, 0.04);
  --shadow-modal: 0 20px 50px -10px rgba(3, 3, 2, 0.12);

  /* HeroUI v3 CSS Variable Bindings */
  --background: var(--app-bg);
  --foreground: var(--app-foreground);
  --surface: var(--app-surface);
  --surface-foreground: var(--app-foreground);
  --surface-secondary: var(--app-muted-surface);
  --surface-hover: var(--app-surface-hover);
  --overlay: var(--app-surface);
  --overlay-foreground: var(--app-foreground);
  --border: var(--app-border);
  --separator: var(--app-border);
  --default: var(--app-muted-surface);
  --default-foreground: var(--app-foreground);
  --default-hover: var(--app-surface-hover);
  --accent: var(--app-secondary);
  --accent-foreground: #FFFFFF;
  --focus: var(--app-secondary);
  --muted: var(--app-muted);
  --success: var(--app-success);
  --warning: var(--app-warning);
  --danger: var(--app-danger);
  --danger-foreground: #FFFFFF;
  --radius: 20px;
  --field-radius: 14px;
}
```

### 2.2 Typography System

1. **Editorial Serif (`font-serif`)**:
   - Family: `Newsreader`, `Playfair Display`, `Cormorant Garamond`, `Georgia`, `serif`.
   - Used for: Hero banners, page h1/h2 headings, feature highlights, lesson titles.
   - Styling: Generous size, light weight (300-400), tight letter spacing (`tracking-tight`).

2. **Clean UI Sans (`font-sans`)**:
   - Family: `Plus Jakarta Sans`, `Inter`, `-apple-system`, `sans-serif`.
   - Used for: Navigation links, buttons, form controls, chess move notations, ratings, tables, and engine stats.
   - Styling: Balanced, high legibility, neutral tracking.

---

## 3. Component Architecture (`src/ui/*` & HeroUI v3)

All interactive elements must consume HeroUI v3 primitives wrapped cleanly in `src/ui/*`.

### 3.1 `AppButton`
- **Pill Shape**: `rounded-full` strictly across all variants.
- **Sizes**:
  - `sm`: Height 36px, `px-4 text-xs font-medium`
  - `md`: Height 44px, `px-5 text-sm font-medium`
  - `lg`: Height 52px, `px-8 text-base font-semibold`
- **Variants**:
  - `primary`: Background `#030302`, Text `#FFFFFF`, Hover `opacity-90`, Active `scale-[0.99]`.
  - `secondary`: Background `#FFFFFF`, Text `#030302`, Border `border border-[var(--app-border)]`, Hover `bg-[var(--app-surface-hover)]`.
  - `tertiary`: Background `transparent`, Text `#030302`, Hover `bg-[var(--app-muted-surface)]`.
  - `outline`: Background `transparent`, Text `#030302`, Border `border border-[var(--app-border-strong)]`.
  - `danger`: Background `#D94A4A`, Text `#FFFFFF`.
  - `ghost`: Background `transparent`, Text `var(--app-muted)`, Hover `text-[var(--app-foreground)]`.

### 3.2 `AppCard` & `AppSurface`
- **Shape**: `rounded-[24px]` for major cards; `rounded-[16px]` for inner nested surfaces.
- **Surface**: Crisp white `#FFFFFF` with faint translucent border `border border-[var(--app-border)]`.
- **Elevation**: Diffuse soft shadow `shadow-[var(--shadow-card)]`.
- **Padding**: Breathable default `p-6` or `p-8`.

### 3.3 `AppField` & `AppTextArea`
- **Shape**: `rounded-[14px]`.
- **Surface**: White `#FFFFFF` with clean border `border border-[var(--app-border)]`.
- **Focus**: Subtle outline in secondary teal `#427E8A` with soft ring.

### 3.4 Floating Pill Navbar (`src/components/ui/Navbar.tsx`)
- Replaces the hard edge-to-edge header.
- Behaves as a floating pill toolbar:
  - Width: Centered container, `max-w-5xl`, `mt-4 mx-auto`.
  - Container style: `bg-white/85 backdrop-blur-md rounded-full border border-[var(--app-border)] px-6 py-2.5 shadow-[var(--shadow-floating)]`.
  - Navigation items: Pill hover states, active pill indicator in `#030302` or `#F3F1EE`.
  - Actions: Primary pill CTA "Chơi cờ" or Auth button.

### 3.5 Chess Board Panel (`ChessBoardPanel.jsx` & `LiveEvaluationBar.jsx`)
- Container: Soft floating card container with rounded corners and light padding.
- Board Squares: Ivory cream light squares (`#FBF9F5`) and calm muted slate teal (`#587982`).
- Evaluation Bar: Minimalist ink-and-white vertical bar with soft slate fill.
- Notation & History: Editorial typography, clean list with subtle row hover.

---

## 4. Page Redesigns

### 4.1 `Home.jsx`
- **Hero Section**:
  - Oversized serif headline: *"Học từ chính những nước cờ của bạn"*.
  - Generous negative space and subtle cloud-like gradient backdrop.
  - Floating pill CTA buttons ("Chơi ván đầu tiên", "Xem kế hoạch hôm nay").
  - Clean floating board preview on the right with soft drop shadow.
- **Improvement Loop (4 Steps)**:
  - 4 white floating cards (`rounded-[24px]`, `p-6`), each with an ink-line icon, soft teal accent badge, and clear editorial description.
- **Personal Progress Preview**:
  - Clean statistics in serif/mono contrast with gentle borders.

### 4.2 `Play.jsx` & `GameLayout.jsx`
- Clean two-column layout:
  - Left/Center: Bounded chessboard with subtle evaluation bar.
  - Right: Clean tabs (`Ván đấu`, `Phân tích`, `Huấn luyện`) using pill indicators.
  - Tucked-in game controls and pre-game lobby with soft modal dialogs.

### 4.3 `Learn.jsx` & `LessonCard.jsx`
- Gallery of chess lessons presented as elegant editorial cards with ample whitespace.
- Lesson view: Left reading pane with beautiful typography and right demonstration board.

### 4.4 `Exercises.jsx` & `ExerciseBoard.jsx`
- Minimalist puzzle solving workspace with status badges in soft teal and cloud blue.
- Clean move feedback and retry button.

### 4.5 `Training.jsx`
- Personal dashboard featuring daily goals, strength/weakness diagnostics, and level progress on clean white cards.

### 4.6 `Openings.jsx` & `OpeningDetail.jsx`
- Opening catalog organized into clean searchable cards with serif titles and move notation chips.

### 4.7 `Login.jsx` & `Signup.jsx`
- Centered floating modal-card on warm background with pill submit button and soft input fields.

---

## 5. Technical Execution & Verification

### 5.1 Verification Checklist
1. `npm run typecheck` — 0 TypeScript errors.
2. `npm run lint` — 0 ESLint warnings/errors.
3. `npm test` — All 62 test suites & 795 test cases pass without regressions.
4. `npm run build` — Clean production bundle build with PWA service worker.
5. Responsive check: 360px, 390px, and desktop viewports without horizontal overflow.

---
