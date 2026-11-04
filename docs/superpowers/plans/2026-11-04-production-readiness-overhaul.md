# Implementation Plan: Production Readiness Overhaul (Chess Standards, Elo, Clocks & History)

## 1. Goal
Upgrade the web chess application to **Full Production-Ready Standard (9.5+/10)**:
1. **Player Elo Rating System**: Standard FIDE Elo calculation with post-game rating deltas (+/- Elo) and level calibration.
2. **Bot Engine & Elo Expansion**: Expand bot levels (400, 800, 1200, 1600, 1800, 2000, 2200, 2600+ Master), calibrate Stockfish depth vs movetime, and improve heuristic fallback.
3. **Dual Chess Clock**: Countdown timer for White & Black with selectable time controls (10m Rapid, 5+3 Blitz, 3m Bullet, Unlimited) and timeout flag-drop forfeit.
4. **Match History & PGN Archive**: Store played games with full PGN history, allow replay/analysis of past games.
5. **FIDE Standards Polish**: Seven Tag Roster PGN formatting and "Offer Draw" with bot evaluation acceptance.

---

## 2. Proposed Architecture & Module Changes

### Phase 1: Player Elo System & Rating Calculation
- `src/domain/elo/eloRating.ts`: Pure FIDE Elo formula:
  - Expected score: $E_A = 1 / (1 + 10^{(R_B - R_A) / 400})$
  - New rating: $R'_A = \text{round}(R_A + K \times (S_A - E_A))$
  - $K$-factor: $K=32$ (or $K=40$ for provisional games $<30$, $K=20$ for $>30$).
- `src/services/persistenceContract.ts` & `src/services/userProfileService.js`:
  - Add `playerElo: number` (default 1200, min 100, max 3500) and `eloHistory: { at: string; elo: number; delta: number; gameId: string }[]`.
  - Update `updateAfterGame` to calculate and record new player Elo based on game outcome (`win`, `lose`, `draw`) against `botElo`.
- Unit tests: `src/domain/elo/eloRating.test.ts` verifying win/loss/draw Elo calculations, edge cases, and bounds.

### Phase 2: Bot Levels Expansion & Calibration
- `src/data/botLevels.js`:
  - Add 1800 (Khá), 2000 (Giỏi), 2200 (Kiện tướng), and 2600 (Master).
  - Fine-tune: For 400 Elo, don't use large movetime; use `depth: 3` and `movetime: null` so it doesn't search deeply.
- `src/services/heuristicBotEngine.js`:
  - For fallback, replace pure random with a sensible lightweight 2-ply minimax so the fallback doesn't hang pieces absurdly.
- `src/components/chess/PreGameLobby.jsx`:
  - Display expanded levels in an elegant grid/select matching Craft Soft Editorial.
- Unit tests: verify all bot levels map properly and return valid configurations.

### Phase 3: Dual Chess Clock & Time Controls
- `src/domain/clock/chessClock.ts`:
  - Time controls: `{ id: 'rapid_10', label: '10 phút (Rapid)', initialSeconds: 600, incrementSeconds: 0 }`, `{ id: 'blitz_5_3', label: '5+3 (Blitz)', initialSeconds: 300, incrementSeconds: 3 }`, `{ id: 'bullet_3', label: '3 phút (Bullet)', initialSeconds: 180, incrementSeconds: 0 }`, `{ id: 'unlimited', label: 'Không giới hạn', initialSeconds: null, incrementSeconds: 0 }`.
  - Pure state manager for dual clocks: track White remaining ms, Black remaining ms, active turn, last tick timestamp.
  - Detect timeout: when active clock reaches 0, trigger `'timeout'` outcome.
- `src/domain/game/gameOutcome.ts`:
  - Update `GameOutcome` type to include `{ reason: 'timeout'; winner: Color }`.
- `src/contexts/ChessGameContext.tsx`:
  - Wire time control selection from PreGameLobby.
  - Tick active turn clock, apply increment upon move commit, trigger timeout if clock expires.
- `src/components/chess/PlayerBar.jsx`:
  - Display sleek countdown clock pill (`MM:SS`) for both White and Black with low-time warning indicator (<30s).
- Unit tests: `src/domain/clock/chessClock.test.ts`.

### Phase 4: Match History & PGN Archive
- `src/services/persistenceContract.ts`:
  - Add `playedGames: PlayedGameRecord[]` to profile schema:
    `{ id: string; pgn: string; playedAt: string; result: 'win'|'lose'|'draw'; botElo: number; playerColor: 'w'|'b'; eloDelta: number; movesCount: number; timeControl: string }`.
  - Auto-limit to last 50 games to keep localStorage lean and performant.
- `src/components/chess/MatchHistoryModal.jsx`:
  - Modal/Drawer in Craft Soft Editorial style listing past games with filters (win/loss), date, opponent Elo, and buttons to "Sao chép PGN" or "Xem lại & Phân tích" (loads game into review/analysis mode).
- Link from `Play.jsx` and `Training.jsx`.

### Phase 5: Seven Tag Roster PGN & Offer Draw
- `src/utils/pgnFormat.ts`:
  - Format full PGN with Event ("Ninh Lốp Trưởng Chess Bot Match"), Site ("Localhost / Ninh Chess"), Date (YYYY.MM.DD), White ("Bạn" or "Ninh Bot"), Black, Result ("1-0", "0-1", "1/2-1/2"), WhiteElo, BlackElo.
- `src/contexts/ChessGameContext.tsx`:
  - Add `offerDraw()` method: Check current live evaluation. If $|eval| \le 50$ centipawns and move history $\ge 20$, bot accepts and triggers `{ reason: 'draw'; winner: null }`. If rejected, returns false with reason.
- `src/components/chess/GameControls.jsx`:
  - Add "Xin hòa" button with confirmation popover / feedback toast.

### Phase 6: Full Verification
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Playwright mobile responsive verification on 360px and 390px viewports.

---

## 3. Execution Order
1. Task 1: Player Elo Formula & Profile Integration (`src/domain/elo/eloRating.ts`, `userProfileService.js`, tests)
2. Task 2: Bot Levels Expansion & Calibration (`botLevels.js`, `PreGameLobby.jsx`, `heuristicBotEngine.js`)
3. Task 3: Dual Chess Clock System (`chessClock.ts`, `gameOutcome.ts`, `PlayerBar.jsx`, `PreGameLobby.jsx`, tests)
4. Task 4: Match History Archive & Modal (`userProfileService.js`, `MatchHistoryModal.jsx`, `Play.jsx`, tests)
5. Task 5: PGN Seven Tag Roster & Offer Draw feature (`pgnFormat.ts`, `GameControls.jsx`, `ChessGameContext.tsx`)
6. Task 6: Full Quality Gate Verification & Mobile Responsive Checks
