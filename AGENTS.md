# AGENTS.md — Guidelines for Antigravity & AI Coding Agents

## 1. UI Stack & Architecture
- **Framework & Runtime**: React 19 (`>=19.0.0`), Vite, TypeScript / JavaScript
- **Styling Foundation**: Tailwind CSS 4 (`@tailwindcss/vite`), `@heroui/styles` v3
- **Component System**: HeroUI v3 (`@heroui/react` >=3.2.4) based on React Aria Components
- **Architecture Flow**:
  ```text
  HeroUI v3 primitives
         ↓
  src/ui/* (Single application UI layer)
         ↓
  Application features & pages (src/pages, src/components)
  ```

## 2. Mandatory UI Rules
- **Use HeroUI First**: Never create or maintain a custom interactive primitive (buttons, fields, selects, dialogs, drawers, popovers, tooltips, menus, tabs, progress bars, sliders, switches, radio groups) when HeroUI v3 provides one.
- **Single Source of UI**: All application screens must consume components from `src/ui/` or direct HeroUI v3 primitives. Do not invent raw interactive elements or parallel design systems.
- **Truth in UI**: Provide authentic, clear information (e.g. precise engine sources) instead of redundant visual badges.

## 3. Visual Identity (Option C: Charcoal + Pine + Copper)
- **Palette**:
  - Background: `#0C100E` (`--app-bg`)
  - Surface: `#141A17` (`--app-surface`)
  - Surface Raised: `#1A221E` (`--app-surface-raised`)
  - Surface Hover: `#222C27` (`--app-surface-hover`)
  - Border: `#2D3932` (`--app-border`)
  - Border Strong: `#425047` (`--app-border-strong`)
  - Foreground: `#F1F4F2` (`--app-foreground`)
  - Muted: `#9BA89F` (`--app-muted`)
  - Subtle: `#708078` (`--app-subtle`)
  - Primary Pine: `#3FAD79` (`--app-accent`)
  - Primary Hover: `#52BD8A` (`--app-accent-hover`)
  - Copper: `#C88954` (`--app-copper`)
  - Semantic Roles: Success Teal `#49A6A0`, Warning Amber `#C89B4F`, Danger Coral `#D46666`, Info `#6B98C8`
- **Radius Standards**:
  - Buttons & Inputs: `8px`
  - Panels & Cards: `10px`
  - Modals & Overlays: `12px`
  - Badges & Chips: `6px`
- **Quiet Motion**: Fast 120ms, Base 180ms, Slow 240ms. No jarring spring physics. Always respect `prefers-reduced-motion`.
- **Card Hierarchy**: Use `Surface` for panels, toolbars, sidebars, and page regions. Reserve `Card` strictly for independent semantic entities (e.g., individual lessons, openings, exercises). Avoid nested cards.

## 4. Domain Exceptions (Keep Custom)
The following domain-specific elements are intentionally custom and must not be forced into generic HeroUI widgets:
- Chessboard rendering and pieces (`ChessBoardPanel`, `react-chessboard`, SVG pieces)
- Drag-and-drop interaction, selected squares, legal move indicators, capture rings, check highlights, last-move highlights
- Live evaluation bar visualization (`LiveEvaluationBar`)
- Move notation & annotations specific to chess review
- Stockfish engine integration & chess business logic (`chess.js`, bot difficulty, UCI protocol)

## 5. Strictly Forbidden
- **No HeroUI v2 / NextUI APIs**: Do not use deprecated APIs or props from v2.
- **No `<HeroUIProvider>`**: HeroUI v3 with Tailwind CSS 4 does not require `<HeroUIProvider>`.
- **No Parallel Design Systems**: Do not recreate or resurrect `src/design-system/` or unneeded CSS utility classes (e.g. `.btn-primary`).
- **No Raw Form Primitives**: Do not write raw `<button>`, `<input>`, `<select>`, `<textarea>` when HeroUI components fit.
- **No Framer Motion for standard UI**: Rely on HeroUI v3 CSS animations and Quiet Motion rules.

## 6. Required Verification Before Completion
Always run and pass all checks before declaring work complete:
```bash
npm run typecheck
npm run lint
npm test
npm run build
```
Verify responsive behavior on 360px and 390px mobile viewports without horizontal overflow.
