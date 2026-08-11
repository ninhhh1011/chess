# Chess App /play Route Redesign Plan

> **Status:** Draft for Review
> **Date:** 2026-08-11
> **Scope:** `/play` route UX redesign, no backend changes

---

## 1. Executive Summary

### Core Problem
The `/play` route feels like a technical dashboard rather than a focused chess-playing product. The board is not the visual centerpiece, multiple panels compete for attention, and feature naming uses meme language that undermines professionalism.

### Target Users
- New chess players: ~600-1200 Elo
- Vietnamese-speaking
- Seeking single-player bot experience
- Value clear, distraction-free gameplay

### Desired Outcome
A board-first chess experience where:
1. User starts a game in ≤3 clicks
2. Board is the dominant visual element
3. AI Coach appears only on-demand
4. Post-game review is clear and actionable
5. Responsive on mobile without horizontal scroll

### Redesign Scope
- Frontend only (no backend changes)
- Preserve chess engine, Stockfish, chess.js, and game logic
- Incremental phases with working product after each phase

---

## 2. Current-State Audit

### Security (P0 - Critical)

| Khu vực | Hiện trạng | Vấn đề | Bằng chứng | Mức độ |
|---------|-----------|---------|-----------|--------|
| `.env.example` | Chứa JWT với `role: service_role` | Token có quyền service, đã lưu trong git history | Line 6: `eyJhbGci...InJvbGUiOiJzZXJ2aWNlX3JvbGUi` | **P0** |
| Frontend usage | Đúng cách dùng `VITE_SUPABASE_ANON_KEY` | Không có vấn đề ở code | `src/lib/supabaseClient.js` dùng anon key | OK |
| RLS Policies | Tốt | Tất cả user tables có RLS, user-scoped | `supabase/schema.sql` lines 79-194 | OK |
| Git history | JWT đã commit | Cần revoke và thay đổi trên Supabase | `git log` commit 104d468 | **P0** |

### UX Issues (P1)

| Khu vực | Hiện trạng | Vấn đề | Bằng chứng | Mức độ |
|---------|-----------|---------|-----------|--------|
| Board positioning | Board không chiếm trọng tâm thị giác | Sidebar và evaluation bar cạnh tranh | `GameLayout.jsx` - 2-column layout | P1 |
| Panel overload | Nhiều card, border, panel cùng lúc | "Biên bản gáy", "Phòng mổ", "Quân sư Ninh" | `AICoachPanel.tsx`, `MoveHistory.jsx` | P1 |
| Live Evaluation | Chiếm diện tích nhưng hữu ích với người mới? | Có thể gây confusion thay vì help | `LiveEvaluationBar.jsx` always visible | P2 |
| Navigation | Nhiều mục ngang hàng | "Chơi cờ", "Luyện tập", "Tiến bộ" không theo hành trình | `Navbar.jsx` | P1 |
| Meme naming | Tên features dạng meme | Không chuyên nghiệp | `BotSettings.jsx` "gáy", "quay xe" | P1 |
| Responsive | Chưa kiểm tra kỹ | Overflow trên màn hình nhỏ | Chưa có QA checklist | P1 |
| Lobby options | Một số không ảnh hưởng gameplay | Time controls chưa hoạt động thật | `PreGameLobby.jsx` | P2 |

### Code Quality (P2)

| Khu vực | Hiện trạng | Vấn đề | Bằng chứng | Mức độ |
|---------|-----------|---------|-----------|--------|
| Dead code | `triggerBotMove` không tồn tại | Bug: `ChessGameBoard.jsx` gọi undefined | Line import từ `useBotMove` | P2 |
| Unused files | `useStockfishWorker.js`, `AnalysisControls.jsx` | Không dùng hoặc redundant | Chỉ trong example file | P2 |
| Component duplication | `PlayerInfoBar` vs `PlayerBar` | Cùng chức năng, file thừa | `src/components/chess/` | P2 |

---

## 3. Scope và Non-Goals

### Will Fix
- [x] Security: Revoke compromised JWT token
- [x] Security: Replace `.env.example` with proper anon key template
- [ ] Board as visual centerpiece
- [ ] Simplified lobby (≤3 clicks to start)
- [ ] Mute AI Coach in-game, show on-demand
- [ ] Professional feature naming (no meme)
- [ ] Clean navigation structure
- [ ] Post-game review improvements
- [ ] Responsive mobile layout

### Will Keep
- [x] Chessboard and chess.js rules
- [x] Bot gameplay by Elo level
- [x] Click/drag piece movement
- [x] Undo (if aligned with design)
- [x] Flip board
- [x] Stockfish review
- [x] Move history
- [x] Opening training
- [x] AI Coach (redesigned presentation)

### Will NOT Do (This Phase)
- Backend changes
- Multiplayer features
- Leaderboards
- Social feeds
- Gamification
- New AI/LLM integrations

---

## 4. Target User Flow

### Pre-Game Lobby
```
Landing on /play
    ↓
[Bot Lobby]
- Select Elo: 600 / 800 / 1200 / 1600 (or Easy/Medium/Hard)
- Select Color: White / Black / Random
- "Bắt đầu" button
    ↓
Game starts in ≤3 clicks
```

### In-Game (Focus State)
```
Board dominates viewport (70%+ height)
Player bar: avatar, name, color badge
Opponent bar: bot avatar, name, ELO
Minimal controls: Hint (optional), Undo, Flip, Settings
AI Coach: Hidden or minimized (icon only)
Move History: Collapsed by default
Evaluation Bar: Moved to post-game
```

### Game Over
```
Result banner: Win/Loss/Draw
Auto-transition to Post-Game Review
```

### Post-Game Review
```
Summary:
- Win/Loss/Draw + reason
- Move quality breakdown (blunders, mistakes, etc.)
- AI Coach advice on what to practice next

Actions:
- "Chơi lại" (same settings)
- "Luyện tập" (recommended exercises)
- "Đổi cấp độ" (back to lobby)
```

### Mobile Flow
```
Lobby: Stacked vertically, full-width buttons
In-Game: Board fills width, controls below
Sidebar: Hidden, accessible via bottom sheet
Post-Game: Modal overlay
```

### State Handling
| State | UI Behavior |
|-------|------------|
| Loading | Skeleton board + "Đang tải..." |
| Empty (first visit) | Lobby with bot info |
| Playing | Board-focused view |
| Bot thinking | Pulsing indicator on opponent bar |
| Engine unavailable | Silent fallback, no error shown |
| Game over | Auto-show review |
| Error | Toast notification, retry option |

---

## 5. Information Architecture

### Proposed Navigation Structure
```
[Primary]
├── Trang chủ (Home)
├── Chơi với Bot → /play (main)
│   ├── Lobby
│   ├── In-Game
│   └── Post-Game Review
├── Học cờ → /learn
│   ├── Lessons
│   └── Exercises
└── Tiến độ → /training
    ├── Opening Practice
    └── Profile

[Secondary - Footer or Settings]
├── Đăng nhập / Tài khoản
└── Cài đặt
```

### Content Prioritization
| Content | In-Game | Post-Game | Hidden/Collapsed |
|---------|---------|-----------|-----------------|
| Board | ✓✓✓ (70%+) | ✓✓ | ✓ |
| Player info | ✓✓ | ✓ | - |
| Move history | Collapsed | ✓✓ | ✓ |
| AI Coach | Icon only | ✓✓✓ | ✓ |
| Evaluation | ✓ | ✓✓✓ | - |
| Controls | ✓✓ | - | ✓ |
| Settings | Icon only | - | ✓ |

### Mascot & Language Policy
- Mascot: OK for empty states, onboarding hints
- Meme naming: ❌ Remove from feature labels
- Professional Vietnamese: ✓✓✓
- Coach personality: ✓ Subtle, not overwhelming

---

## 6. Layout Specification

### Desktop (≥1024px)
```
┌─────────────────────────────────────────────────────────┐
│ Navbar                                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────┐  ┌──────────────┐   │
│   │                             │  │ Opponent Bar │   │
│   │                             │  ├──────────────┤   │
│   │                             │  │              │   │
│   │        CHESS BOARD          │  │ Move History │   │
│   │        (Primary Focus)       │  │   (toggle)   │   │
│   │                             │  │              │   │
│   │                             │  ├──────────────┤   │
│   │                             │  │   Controls   │   │
│   └─────────────────────────────┘  ├──────────────┤   │
│   ┌─────────────────────────────┐  │ AI Coach     │   │
│   │      Player Bar             │  │  (on-demand) │   │
│   └─────────────────────────────┘  └──────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘

Board: 60-70% viewport width, max 560px
Sidebar: 320-360px fixed
```

### Tablet (768px - 1023px)
```
┌───────────────────────────────────┐
│ Navbar                            │
├───────────────────────────────────┤
│ ┌─────────────────────────────┐   │
│ │      Opponent Bar           │   │
│ ├─────────────────────────────┤   │
│ │                             │   │
│ │        CHESS BOARD          │   │
│ │                             │   │
│ ├─────────────────────────────┤   │
│ │      Player Bar             │   │
│ ├─────────────────────────────┤   │
│ │      Controls               │   │
│ ├─────────────────────────────┤   │
│ │  [History] [Coach] [More]   │   │
│ └─────────────────────────────┘   │
└───────────────────────────────────┘

Board: 90% width, aspect-ratio 1:1
Bottom panel: tabs for secondary content
```

### Mobile (360px - 767px)
```
┌─────────────────────┐
│ Navbar (compact)    │
├─────────────────────┤
│ ┌─────────────────┐  │
│ │  Opponent Bar   │  │
│ ├─────────────────┤  │
│ │                 │  │
│ │   CHESS BOARD   │  │
│ │                 │  │
│ ├─────────────────┤  │
│ │   Player Bar    │  │
│ ├─────────────────┤  │
│ │  ⚙️ 🔄 ↩️  ☰   │  │
│ └─────────────────┘  │
│                     │
│ [Expand History/Move]│
└─────────────────────┘

Board: 100% width minus padding
Controls: Icon-only row
Sidebar: Bottom sheet on tap
```

### Content Priority Order
1. **Board** - Always visible, maximum size
2. **Player/Opponent bars** - Compact, position-aware
3. **Essential controls** - Flip, Undo, Hint
4. **Move history** - Collapsible
5. **AI Coach** - Triggered by user action
6. **Settings** - Icon or separate route

---

## 7. Component Impact Map

| File/Component | Current Responsibility | Action | Proposed Change | Dependencies |
|---------------|----------------------|--------|-----------------|---------------|
| `src/pages/Play.jsx` | Route wrapper | Keep | Minimal change | ChessGameBoard |
| `src/components/ChessGameBoard.jsx` | Orchestrator | Fix | Bug: remove `triggerBotMove` call | useBotMove |
| `src/components/chess/GameLayout.jsx` | Layout shell | Refactor | Board-first grid, responsive sidebar | All chess components |
| `src/components/chess/ChessBoardPanel.jsx` | Board rendering | Keep | Add min-width:0, aspect-ratio | react-chessboard |
| `src/components/chess/PreGameLobby.jsx` | Lobby setup | Refactor | Simplify options, remove non-functional | useChessGame |
| `src/components/chess/PlayerBar.jsx` | Player info | Keep | Already clean | useChessGame |
| `src/components/chess/PlayerInfoBar.jsx` | (duplicate) | Delete | Remove dead code | - |
| `src/components/chess/MoveHistory.jsx` | Move list | Keep | Add collapsed default | useChessGame |
| `src/components/chess/LiveEvaluationBar.jsx` | Eval bar | Move | Hide during game, show in review | useChessGame |
| `src/components/chess/GameControls.jsx` | Action buttons | Rename | Professional labels | useChessGame |
| `src/components/chess/BotSettings.jsx` | Settings | Rename | Professional labels | useChessGame |
| `src/components/chess/BotInfoPanel.jsx` | Bot info | Keep | Already clean | useChessGame |
| `src/components/chess/PostGameReview.jsx` | Review modal | Enhance | Add practice recommendations | useChessGame |
| `src/components/AICoachPanel.tsx` | AI Coach | Redesign | Collapsed by default, slide-in | aiCoachApiService |
| `src/components/analysis/EngineAnalysisPanel.jsx` | Analysis | Keep | Post-game focus | stockfishService |
| `src/components/chess/GameStatusBanner.jsx` | Status badges | Delete | Merge into PlayerBar | useChessGame |
| `src/components/chess/AnalysisControls.jsx` | (unused) | Delete | Remove dead code | - |
| `src/components/chess/StartNotice.jsx` | Start notice | Keep | Already minimal | - |
| `src/hooks/useBotMove.ts` | Bot move logic | Keep | Already fixed | botService |
| `src/contexts/ChessGameContext.tsx` | Game state | Keep | Add playState transitions | chess.js |
| `src/services/botService.ts` | Bot calculation | Keep | Already clean | stockfishService |

### Components to DELETE
- `src/components/chess/PlayerInfoBar.jsx` (duplicate)
- `src/components/chess/AnalysisControls.jsx` (unused)
- `src/components/chess/GameStatusBanner.jsx` (merge into PlayerBar)
- `src/components/chess/CheckWarning.jsx` (unused)
- `src/components/chess/ResultModal.jsx` (merge into PostGameReview)
- `src/components/StatusBadge.jsx` (unused)
- `src/hooks/useStockfishWorker.js` (unused)
- `src/utils/randomBot.js` (unused)

---

## 8. Implementation Phases

### Phase 0: Security Containment ⏱️ S (Critical)

**Goal:** Remove compromised JWT from repository and ensure no service_role exposure

**Tasks:**
1. Document the compromised token incident
2. Add to `.env.example` comment: "NEVER commit actual keys"
3. Replace `VITE_SUPABASE_ANON_KEY` placeholder with format description
4. Add `.env.example` to git diff check in CI
5. Create `SECURITY_CHECKLIST.md` for future reference

**Files:**
- `.env.example`

**Dependency:** None
**Risk:** None
**Definition of Done:** No actual JWT in repository history

---

### Phase 1: Clean /play Flow ⏱️ M

**Goal:** Fix bugs, remove dead code, establish clean baseline

**Tasks:**
1. Fix `triggerBotMove` bug in `ChessGameBoard.jsx`
2. Delete unused components (see Component Impact Map)
3. Run existing tests, fix any regressions
4. Verify lint passes

**Files:**
- `src/components/ChessGameBoard.jsx`
- `src/components/chess/PlayerInfoBar.jsx`
- `src/components/chess/AnalysisControls.jsx`
- `src/components/chess/GameStatusBanner.jsx`
- `src/components/chess/CheckWarning.jsx`
- `src/components/chess/ResultModal.jsx`
- `src/components/StatusBadge.jsx`
- `src/hooks/useStockfishWorker.js`
- `src/utils/randomBot.js`

**Dependency:** Phase 0
**Risk:** Low (cleanup only)
**Definition of Done:** All tests pass, no dead code

---

### Phase 2: Redesign Lobby & In-Game Layout ⏱️ L

**Goal:** Board-first design, professional naming, simplified lobby

**Tasks:**
2.1 **Lobby Redesign**
- Simplify `PreGameLobby.jsx` to 3 choices: Elo, Color, Start
- Remove non-functional time controls
- Professional labels (no "gáy", "quay xe")
- Add bot preview/info card

2.2 **Layout Restructure**
- Update `GameLayout.jsx` with board-first grid
- Add responsive breakpoints
- Ensure board is min-width: 0, aspect-ratio: 1
- Sidebar width: 320px desktop, full-width mobile

2.3 **Control Bar Redesign**
- Rename in `GameControls.jsx`:
  - "Gáy" → Remove (or "Xem thêm")
  - "Quay xe" → "Đổi phe"
  - "Tự hủy" → "Chấp nhận thua"
- Add tooltips in Vietnamese

2.4 **AI Coach Default State**
- Change `AICoachPanel.tsx` default to collapsed
- Add icon-only toggle in sidebar
- Slide-in animation when activated

**Files:**
- `src/components/chess/PreGameLobby.jsx`
- `src/components/chess/GameLayout.jsx`
- `src/components/chess/GameControls.jsx`
- `src/components/AICoachPanel.tsx`
- `src/index.css` (responsive utilities)

**Dependency:** Phase 1
**Risk:** Medium (layout changes)
**Definition of Done:**
- Board is 60%+ of viewport
- Lobby starts game in ≤3 clicks
- No horizontal overflow on 360px/768px/1024px

---

### Phase 3: Post-Game Review & AI Coach ⏱️ M

**Goal:** Clear post-game summary with actionable next steps

**Tasks:**
3.1 **Post-Game Review Enhancement**
- Add practice recommendations in `PostGameReview.jsx`
- Connect to `recommendationService.js`
- Show "Nên luyện:" section

3.2 **Move Quality Summary**
- Ensure `moveQuality.js` classification works
- Display: Brilliant/Good/Mistake/Blunder counts
- Highlight worst move with best alternative

3.3 **Evaluation Bar Relocation**
- Hide `LiveEvaluationBar.jsx` during game
- Show in post-game review
- Add perspective-aware display

**Files:**
- `src/components/chess/PostGameReview.jsx`
- `src/components/chess/LiveEvaluationBar.jsx`
- `src/utils/moveQuality.js`

**Dependency:** Phase 2
**Risk:** Low
**Definition of Done:**
- Post-game shows clear move quality breakdown
- "Luyện tập" button leads to relevant exercises

---

### Phase 4: Responsive, Accessibility, Polish ⏱️ M

**Goal:** Mobile-first responsive, WCAG AA compliance, smooth interactions

**Tasks:**
4.1 **Responsive Verification**
- Test at 360px, 390px, 768px, 1024px
- Fix any overflow issues
- Ensure touch targets ≥44px

4.2 **Accessibility**
- Add focus states to all interactive elements
- Ensure keyboard navigation works
- Color contrast ≥4.5:1 for text
- ARIA labels where needed

4.3 **Polish**
- Smooth transitions for panel open/close
- Loading skeletons during async operations
- Error states with retry options
- Empty states with guidance

**Files:**
- All components touched in Phases 1-3
- `src/index.css`

**Dependency:** Phase 3
**Risk:** Low
**Definition of Done:**
- No horizontal scroll at any breakpoint
- All interactive elements keyboard-accessible
- Focus states visible

---

### Phase 5: Test, Performance, Release Verification ⏱️ S

**Goal:** Verify all acceptance criteria, optimize bundle

**Tasks:**
5.1 **Test Coverage**
- Run full test suite
- Add Play-specific tests if missing
- Verify e2e flows work

5.2 **Performance**
- Check bundle size
- Verify Stockfish loads async
- Ensure no blocking renders

5.3 **Final QA**
- Manual chess regression checklist
- Responsive visual check
- Accessibility audit

5.4 **Documentation**
- Update README if needed
- Document any breaking changes

**Files:**
- Test files as needed
- `README.md`

**Dependency:** Phase 4
**Risk:** Low
**Definition of Done:**
- All tests pass
- Build succeeds
- No console errors in production

---

## 9. Acceptance Criteria

### Must Pass (Non-Negotiable)

- [ ] **Security:** No JWT/service_role token in repository or git history
- [ ] **Start Game:** User can start a game in ≤3 clicks from landing on /play
- [ ] **Board Focus:** Board is the dominant visual element (≥60% viewport on desktop)
- [ ] **No Overflow:** No horizontal scroll at 360px, 390px, 768px, 1024px
- [ ] **Click/Drag:** User can play moves via click and drag
- [ ] **Chess Rules:** No regression in chess rules, bot, Stockfish, move history
- [ ] **AI Coach Visibility:** AI Coach does not block or disrupt the board during play
- [ ] **Post-Game Review:** Clear move quality summary after game ends
- [ ] **Error States:** Graceful handling when Stockfish or AI service is unavailable
- [ ] **Keyboard Navigation:** Tab, Enter, Escape work for all interactions
- [ ] **Focus States:** Visible focus indicator on all interactive elements
- [ ] **Color Contrast:** Primary content meets WCAG AA (≥4.5:1)
- [ ] **Lint:** `npm run lint` passes with 0 errors
- [ ] **Tests:** `npm test` passes with ≥current coverage
- [ ] **Build:** `npm run build` succeeds

### Should Pass (Important)

- [ ] **Performance:** First Contentful Paint <2s on 3G
- [ ] **Professional Naming:** No meme terms in feature labels
- [ ] **Mascot:** Mascot usage limited to empty states/onboarding
- [ ] **Touch Targets:** All buttons ≥44px on mobile

---

## 10. Verification Plan

### Unit Tests (existing + new)
```bash
npm test -- --run
```

**Focus areas:**
- ChessGameContext state transitions
- Move validation
- Bot calculation
- Stockfish fallback

### Integration Tests
```bash
npm test -- src/contexts/ChessGameContext.test.jsx
npm test -- src/hooks/useBotMove.test.ts
```

### End-to-End Flows
Manual verification:
1. Start game → Play move → Game over → Review
2. Undo move → Continue playing
3. Flip board → Continue playing
4. Collapse/expand move history
5. Open/close AI Coach

### Responsive Verification
- [ ] 360px (iPhone SE)
- [ ] 390px (iPhone 14)
- [ ] 768px (iPad)
- [ ] 1024px (desktop small)
- [ ] 1440px (desktop large)

### Accessibility Checks
- [ ] Keyboard-only navigation
- [ ] Screen reader compatibility (basic)
- [ ] Color contrast checker
- [ ] Focus indicator visibility

### Manual Chess Regression Checklist
- [ ] All special moves work: castling, en passant, promotion
- [ ] Bot responds correctly
- [ ] Undo works in bot mode
- [ ] Stockfish analysis shows correct evaluation
- [ ] Move history is accurate

### CI Commands (from repository)
```bash
npm run lint    # ESLint
npm run test   # Vitest
npm run build  # Vite production build
```

---

## 11. Open Questions

### 1. Service Role Token Impact Assessment
**Question:** Has the compromised service_role JWT actually been used to access Supabase data?

**Options:**
- A) Yes, check Supabase logs for unauthorized access
- B) No, token was only in example and never deployed

**Assumption:** Treat as if potentially exposed. Recommend revoke regardless.

---

### 2. Anonymous Supabase Key
**Question:** Should the anonymous key be public (safe for frontend) or kept private?

**Assumption:** Anon key is safe for frontend bundle. RLS protects data. Continue current approach.

---

### 3. Time Controls
**Question:** Should we implement real time controls, or keep as "coming soon" with current placeholder?

**Options:**
- A) Implement real countdown timer
- B) Remove from lobby entirely for now
- C) Keep disabled placeholder

**Assumption:** Remove non-functional time controls from lobby in Phase 2. Implement later if requested.

---

### 4. AI Coach Feature Flag
**Question:** Should AI Coach be behind a feature flag (disabled by default)?

**Options:**
- A) Yes, hidden until user enables
- B) No, visible but collapsible

**Assumption:** Keep visible but collapsed by default (current collapsible approach is fine).

---

### 5. Opening Training Integration
**Question:** Should post-game review link to opening training if player made opening mistakes?

**Options:**
- A) Yes, recommend opening practice based on mistakes
- B) No, keep generic "practice" link

**Assumption:** Implement smart recommendations in Phase 3 if `recommendationService.js` can handle it.

---

## Appendix: Security Remediation Steps (Reference)

> **Note:** These steps should be executed by the repository owner. Not automated in this plan.

1. **Supabase Dashboard → Settings → API**
   - Revoke the compromised service_role key
   - Generate new service_role key (for server-side only)
   - Copy new anon key (for frontend)

2. **Update `.env.example`**
   ```env
   # Replace with your project's anon key from:
   # Supabase Dashboard → Settings → API → Project API keys → anon key
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Verify frontend usage**
   - Confirm `src/lib/supabaseClient.js` uses `VITE_SUPABASE_ANON_KEY`
   - Confirm no `SERVICE_ROLE_KEY` or `service_role` in frontend code

4. **Git history cleanup** (optional but recommended)
   - Use `git filter-repo` to remove the compromised commit
   - Force push to update remote history
   - Notify team to re-clone

---

*Plan created: 2026-08-11*
*Last updated: 2026-08-11*
