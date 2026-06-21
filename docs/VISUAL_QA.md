# Ninh Chess Visual QA

Use this checklist when automated browser inspection is unavailable. Test at desktop width (1440 x 900) and mobile width (390 x 844) with the browser at 100% zoom.

## Global

- [ ] The app uses a dark slate page background with slightly lighter slate panels.
- [ ] Panel borders are thin and visible without reading as bright outlines.
- [ ] Emerald is limited to primary actions, focus rings, active states, and positive/live status.
- [ ] Buttons and compact panels use approximately 6-8px corner radii; controls do not look pill-shaped unless they are status badges.
- [ ] Inter or the system sans-serif fallback is used throughout.
- [ ] Keyboard focus is clearly visible as an emerald outline on links, buttons, inputs, and selects.
- [ ] No Supabase name, logo, or product-specific layout appears in the UI.

## `/`

- [ ] Ninh Chess remains the first prominent product signal.
- [ ] The hero structure and chess-board preview remain unchanged in purpose; the preview is framed by a compact dark panel with a thin border.
- [ ] The primary CTA is emerald with dark text. Secondary actions remain slate outline buttons.
- [ ] `Chơi Online` includes a small amber `Beta` badge inside the button.
- [ ] Feature cards are flat dark panels with thin borders and compact spacing, without nested cards or decorative gradients.
- [ ] At mobile width, hero content stacks without horizontal scrolling, clipped text, or overlapping controls.

## `/play`

- [ ] The chess board is the largest and most visually dominant element.
- [ ] The board is horizontally centered within the left play area and retains a square aspect ratio.
- [ ] The board frame uses an 8px radius, thin slate border, and restrained shadow.
- [ ] Player bars and game status remain directly associated with the board.
- [ ] On desktop, the analysis/control sidebar sits to the right and is narrower than the board area.
- [ ] Sidebar tabs use emerald only for the active tab; inactive tabs remain muted slate.
- [ ] On mobile, the sidebar stacks below the board with no overlap or horizontal overflow.

## `/play/online/test-visual`

- [ ] The route shows a compact `Online Play` status strip above the board when session state permits rendering.
- [ ] The status strip includes a visible amber `Beta` badge.
- [ ] The network caveat is secondary muted text and does not compete with the board.
- [ ] Waiting state uses an amber bordered banner; abandoned/error state uses a rose bordered banner.
- [ ] Online status UI does not resize, cover, or displace the board unexpectedly.
- [ ] If authentication redirects to login, confirm the intended redirect and repeat with an authenticated test session.

## AI Coach Panel

- [ ] Open `/play`, start a game, and select the AI Coach tab in the right sidebar.
- [ ] The header shows the coach avatar and a clear `Stockfish on` or `No engine context` badge.
- [ ] The panel states that response source is shown.
- [ ] After requesting advice, the response displays `Source: AI live`, `Source: Fallback`, or `Source: Fallback mock`.
- [ ] Live source uses emerald; fallback/mock source uses amber.
- [ ] The hint action uses a restrained emerald treatment; other coach actions remain slate controls.
- [ ] Advice text remains readable and the controlled meme tone does not alter the product-oriented layout.

## Online Beta Banner

- [ ] The Home online action and online route both display `Beta` consistently in amber.
- [ ] `Beta` remains legible at mobile width and does not wrap outside its control.
- [ ] Beta treatment is visibly secondary to the primary learning/play actions.

## Mobile Width

- [ ] Test at 390px width with no horizontal page scrolling.
- [ ] Navigation collapses to the existing mobile menu.
- [ ] Buttons wrap cleanly and labels remain inside their controls.
- [ ] The board fits the viewport width and remains square.
- [ ] Evaluation bar, player bars, notices, and sidebar content do not overlap the board.

## Dark Mode Contrast

- [ ] Primary text is clearly readable against slate backgrounds.
- [ ] Muted text remains readable and is not darker than necessary for secondary information.
- [ ] Emerald CTA text uses dark slate text with sufficient contrast.
- [ ] Slate borders remain visible between adjacent surfaces.
- [ ] Amber beta/fallback and rose error states are distinguishable without relying on color alone because each includes a text label.

## Board Centered Layout

- [ ] At desktop width, available left-column space is distributed evenly around the board.
- [ ] The evaluation bar stays immediately beside the board.
- [ ] Changing tabs or status text does not shift the board horizontally.
- [ ] At tall desktop sizes, the board grows only to its configured maximum and does not crowd the sticky sidebar.
- [ ] At mobile width, the board remains centered after the sidebar stacks below it.
