# Chess Single-player Redesign Plan

## 1. Product scope

Ninh Lốp Trưởng Chess is a Vietnamese single-player chess learning and practice website. It keeps the current website name and `avatarcoach.webp`, but uses concise, professional copy without memes or playful “gáy” language.

Supported product areas:

- Play against a bot.
- Stockfish analysis and move hints.
- Chess lessons, tactics exercises, and opening practice.
- Deterministic recommendations and local progress tracking.
- Optional authentication for cloud progress sync.
- AI Coach only behind a disabled-by-default feature flag and a protected backend.

Explicitly excluded:

- Online or local multiplayer.
- Matchmaking, invitations, realtime games, chat, and multiplayer leaderboards.
- Claims of AI personalization when recommendations are rule-based.

## 2. Current information architecture

| Route | Current responsibility | Decision |
|---|---|---|
| `/` | Marketing home, progress summary, activity links, online CTA | Redesign; remove online flow and fake claims |
| `/play` | Bot/local game lobby, board, analysis, Coach | Keep; bot-only refactor |
| `/play/online/:gameId` | Supabase realtime game | Delete |
| `/learn` | Lesson catalogue and lesson detail | Keep; adopt shared page patterns |
| `/exercises` | Tactics exercise runner | Keep; adopt shared page patterns |
| `/openings` | Opening catalogue and filters | Keep; adopt shared page patterns |
| `/openings/:openingId` | Opening lesson and practice | Keep; align board and component states |
| `/training` | Progress, recommendations, and cloud sync | Keep; rename navigation label to `Tiến độ` |
| `/login`, `/signup` | Optional Supabase auth | Keep; fix Rules of Hooks and redirect behavior |

Global providers remain `AuthProvider` and `ChessGameProvider`. Authentication remains optional; guest users can access every core learning and bot feature.

## 3. Keep

- React, Vite, Tailwind, `chess.js`, `react-chessboard`, Vitest, and the existing Stockfish workers.
- Bot levels, heuristic fallback, lessons, exercises, openings, and local profile storage.
- Supabase authentication and progress sync when configured.
- `avatarcoach.webp` and the name `Ninh Lốp Trưởng Chess`.
- Existing real chessboard component and standard pieces.
- The current route structure except the online route.

## 4. Delete

- `src/pages/OnlinePlay.jsx`.
- `src/services/onlineGameService.js`.
- `/play/online/:gameId` and its lazy import.
- Home online-game state, handler, CTA, invite flow, and related imports.
- `GAME_MODES.LOCAL`, local-mode UI, and local-mode branches that are unreachable after the bot-only change.
- The online-game Supabase migration and online-game-only schema code.
- Dead multiplayer comments, imports, state, compiled references, and README claims.
- Obsolete duplicate chess UI components after caller checks confirm they are unused.
- Temporary comments such as `FIX BUG`, `NEW`, and unnecessary console logging.
- Mock AI responses presented as interactive AI Coach output.

## 5. Core refactors

### Authentication

- `Login`, `Signup`, `Navbar`, and `Training` consume `signIn`, `signUp`, and `signOut` directly from `useAuth`.
- Form handlers await the context methods and convert `{ data, error }` into page state locally.
- Auth service functions never call React hooks.
- Authenticated redirects use `<Navigate replace>` or effects, never navigation during render.
- Auth tests cover login, signup, logout, unconfigured Supabase, and guest access.

### Evaluation

- Normalize Stockfish centipawn and mate scores to White POV at the Stockfish service boundary.
- Every analysis result includes `perspective: 'white'` and an explicit `source`.
- The evaluation bar, formatting, move annotations, game review, and Coach payload consume the normalized result without turn-based sign conversion.
- Fallback results remain visibly distinct and never claim Stockfish depth or evaluation they do not have.
- Move loss is calculated from the mover’s perspective using before/after White POV values.

### Promotion

- Detect a legal promotion attempt before calling `makeMove`.
- Store `{ from, to, color }` in `pendingPromotion` and open `PromotionModal`.
- Apply the move only after selection of `q`, `r`, `b`, or `n`.
- Cancel only clears `pendingPromotion`; the game position stays unchanged.
- Drag and click interactions share the same promotion path.

### AI Coach

- Add one client feature flag, disabled by default.
- When disabled or unconfigured, render an honest unavailable state and make no request.
- Remove client fallback behavior that returns mock prose after API failure.
- The serverless endpoint rejects disabled, unauthenticated, oversized, malformed, or rate-limited requests.
- Server responses return generic client-safe errors; raw provider errors stay server-side.
- Limit request body fields, text length, history length, PGN length, output tokens, and request duration.

### CI

- Change GitHub Actions from Node 18 to Node 22.
- Preserve the required sequence: `npm ci`, lint, test, build.
- Verify locally where possible and report that the current audit baseline ran on Node 24, not Node 22.

## 6. Component refactor map

Reuse existing components before adding new ones. Add only shared pieces used by at least two pages.

| Area | Refactor |
|---|---|
| App shell | Simplify `Navbar` links and auth prominence; use a compact responsive menu |
| Shared pages | Add shared page header, state panel, progress bar, difficulty badge, and activity card only where duplication exists |
| Home | Replace emoji feature grid and hand-built 64-square preview with a real non-interactive chessboard preview |
| Play | Keep `GameLayout`, `ChessBoardPanel`, player bars, controls, tabs, and lobby; remove local-mode branches |
| Promotion | Route click and drag promotion attempts through `PromotionModal` |
| Evaluation | Centralize perspective conversion in a utility/service, not in visual components |
| Learning pages | Align headers, filters, cards, progress, badges, loading, empty, and error states |
| Modals | Add dialog semantics, Escape handling, focus containment, and focus restoration |

## 7. Design tokens

`DESIGN.md` becomes the only UI source of truth. The Lab029s document remains unchanged and is used only as a reference for hierarchy, spacing, surfaces, and states.

### Color

| Token | Value | Role |
|---|---|---|
| `canvas` | `#F4F5F2` | Page background |
| `surface` | `#FFFFFF` | Cards, header, forms |
| `surface-muted` | `#E7EAE7` | Disabled and secondary surfaces |
| `ink` | `#17201A` | Primary text |
| `ink-muted` | `#59635C` | Secondary text |
| `primary` | `#284B3B` | Primary CTA, active state, progress |
| `primary-hover` | `#1F3D30` | Hover/pressed primary |
| `border` | `#D9DED8` | Default border |
| `attention` | `#C58B37` | Hint and warning emphasis |
| `danger` | `#A74444` | Destructive/error state |
| `board-light` | `#EDE4D4` | Light squares |
| `board-dark` | `#71805B` | Dark squares |

Move-quality colors remain semantic and secondary to the primary brand color. Every colored state also includes text, a symbol, or a border treatment.

### Typography and geometry

- Keep Inter and system fallbacks; add no font dependency.
- Display sizes: 48/56 desktop and 36/40 mobile.
- Page headings: 32/40 desktop and 28/34 mobile.
- Body: 16/24; small UI: 14/20; metadata: 12/16.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64, 80.
- Radius: 6, 10, 14, 18, full.
- Borders: 1px default; 2px focus or selected state.
- Shadows: flat, raised, and modal only; no layered decorative shadows.
- No decorative emoji. Controls prefer clear text labels; chess-piece symbols are restricted to chess content.
- No pervasive gradients or glassmorphism.

## 8. Home flow

1. Compact header with primary learning navigation.
2. Hero with one value proposition, `Chơi với Ninh Bot` primary CTA, and `Luyện bài tập` secondary CTA.
3. Real, non-interactive chessboard preview using the installed board component.
4. Continue-learning section only when persisted progress exists.
5. Four main activities: bot game, tactics, openings, basics.
6. Recommended path generated from existing deterministic rules with a visible reason.
7. Optional account prompt framed only as progress synchronization.

Each section has one primary action. No fake metrics, online CTA, or AI personalization claim.

## 9. Play flow

### Pre-game

- Bot level.
- White, Black, or random color.
- Training goal.
- Local time control; unsupported controls are not shown as active options.

### Desktop order

1. Status.
2. Opponent bar.
3. Evaluation bar beside the board.
4. Board.
5. Player bar.
6. Primary controls.
7. Fixed-width sidebar with `Nước đi`, `Phân tích`, `Coach`, and `Cài đặt`.

### Mobile order

1. Game status.
2. Opponent bar.
3. Evaluation bar and board fitted within 360px.
4. Player bar.
5. Primary controls.
6. Tabs and tab content.

The sidebar never precedes the board on mobile. The page has no horizontal scrolling.

## 10. Responsive strategy

- Mobile: 360–767px, single column, 16px page gutters, 44px minimum targets.
- Tablet: 768–1023px, two-column content grids where useful; Play remains board-first.
- Desktop: 1024–1439px, full navigation and Play sidebar.
- Wide: 1440px+, content capped to readable widths.
- Validate at 360, 390, 768, 1024, and 1440px.
- Use fluid board sizing with `aspect-ratio`; never set a minimum width that forces overflow.
- Mobile menu exposes correct Vietnamese labels, `aria-expanded`, Escape closing, and focus return.

## 11. Production issues found in audit

1. Online multiplayer route, page, service, migration, and Home CTA are shipped.
2. Local two-player mode is still exposed in settings and context.
3. Auth service calls hooks from plain functions and does not await context promises.
4. Login navigates during render.
5. Promotion auto-queens before the modal can choose a piece.
6. Stockfish scores alternate between side-to-move and assumed White POV across consumers.
7. Game review compares raw before/after scores without mover perspective.
8. Fallback and Stockfish results are handled differently in view components rather than normalized once.
9. AI Coach calls `/api/coach` by default and substitutes mock prose after failure.
10. The serverless Coach endpoint lacks authentication, rate limiting, body limits, and safe error responses.
11. Current `DESIGN.md` describes another product and is not a Chess design system.
12. Home uses a hand-built 64-square Unicode board preview.
13. Navigation and learning pages use inconsistent naming, spacing, cards, and states.
14. Mobile menu label is missing Vietnamese accents.
15. Modals lack complete keyboard focus management.
16. Temporary comments and console logs remain.
17. Training reads a `tasks` shape that the current generated daily plan does not produce.
18. CI uses Node 18 instead of Node 22.
19. Audit lint, 31 tests, and build pass on local Node 24; Node 22 remains unverified.

## 12. Acceptance criteria

- [ ] Only single-player bot mode remains in code and production UI.
- [ ] No online/local multiplayer route, CTA, service, migration, invitation, or copy remains.
- [ ] Bot play works for White and Black.
- [ ] Promotion supports Queen, Rook, Bishop, and Knight; cancel preserves the position.
- [ ] Castling, en passant, checkmate, draw, undo-during-bot-processing, and game reset are covered.
- [ ] Stockfish analysis, evaluation bar, move classification, review, and Coach context use White POV.
- [ ] Stockfish and fallback sources are distinguishable.
- [ ] Login, signup, and logout follow the Rules of Hooks and await promises.
- [ ] Guests can play, learn, solve exercises, and practice openings.
- [ ] AI Coach is disabled by default and cannot make an uncontrolled provider request.
- [ ] `DESIGN.md` contains the complete Chess design system and governs all UI changes.
- [ ] Home and Play follow the approved desktop/mobile flows.
- [ ] Learning pages share a coherent visual language and honest state handling.
- [ ] Keyboard navigation, visible focus, modal behavior, semantic HTML, and Vietnamese labels are accessible.
- [ ] No horizontal overflow exists at 360px.
- [ ] GitHub Actions uses Node 22 and runs `npm ci`, lint, test, and build.
- [ ] Final lint, test, and build pass; any unmet criterion is reported without a production-ready claim.
