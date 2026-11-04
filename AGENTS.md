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

## 3. Visual Identity (Craft Soft Editorial: craft.do-design.md)
- **Palette**:
  - Background: `#FCF9F7` (`--app-bg`)
  - Surface: `#FFFFFF` (`--app-surface`)
  - Surface Raised: `#FFFFFF` (`--app-surface-raised`)
  - Surface Hover: `#F8F6F4` (`--app-surface-hover`)
  - Muted Surface: `#F3F1EE` (`--app-muted-surface`)
  - Border: `rgba(3, 3, 2, 0.08)` (`--app-border`)
  - Border Strong: `rgba(3, 3, 2, 0.16)` (`--app-border-strong`)
  - Foreground: `#030302` (`--app-foreground`)
  - Muted: `#5C6460` (`--app-muted`)
  - Subtle: `#8A948F` (`--app-subtle`)
  - Primary Ink: `#030302` (`--app-primary`)
  - Secondary Teal: `#427E8A` (`--app-secondary`)
  - Secondary Hover: `#376C77` (`--app-secondary-hover`)
  - Tertiary Cloud Blue: `#D7EAF0` (`--app-tertiary`)
  - Accent Sky Blue: `#A9D8F2` (`--app-accent`)
  - Semantic Roles: Success `#3D7D72`, Warning Amber `#C89B4F`, Danger Coral `#D94A4A`, Info `#427E8A`
- **Radius Standards**:
  - Buttons & Badges: `rounded-full` (9999px)
  - Cards & Modals: `24px`
  - Sub-surfaces & Panels: `20px`
  - Inputs & Form Fields: `14px`
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

## 7. Agent Context & Documentation
- Start with `README.md` for setup and `docs/README.md` to find the one relevant document.
- Treat `src/` and current runtime behavior as implementation truth. `docs/CURRENT_RUNTIME.md` is a source map, not a substitute for checking the touched code.
- Do not read `docs/CODEX_TECH_EXECUTION_PLAN.md`, `docs/task-reports/`, or `docs/verifications/` unless the task explicitly needs roadmap details or matching historical evidence. These are not current implementation instructions.
- For architecture questions, query the generated code graph first: `graphify query "<focused question>" --budget 1200`. The graph indexes `src/`; regenerate after structural source changes with `graphify extract src --code-only --no-cluster --out .`.
- Keep generated Graphify output out of commits. Use targeted file searches and read only the callers and code relevant to the change.
