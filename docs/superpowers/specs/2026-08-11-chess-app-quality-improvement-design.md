# Chess App Quality Improvement Design

**Date:** 2026-08-11
**Status:** Approved
**Author:** Claude

## Overview

Improvements to address 4 code quality issues:
1. TypeScript not enforced (`.js` files instead of `.ts/.tsx`)
2. AI Coach is fake (mock instead of real AI)
3. Stockfish Service over-engineered (570 lines for simple work)
4. Bot move logic has race conditions

## Design Decisions

### 1. TypeScript Migration Strategy

**Approach:** Incremental by module with intermix allowed

**Phase 1: Setup**
- Create `tsconfig.json` with permissive settings
- Configure Vite for TypeScript
- Enable intermix (JS + TS files can coexist)

**Phase 2: Incremental Migration Order**
1. `src/types/ChessTypes.ts` — Shared types first
2. `src/services/*.js` → `.ts` — Business logic
3. `src/hooks/*.js` → `.ts` — React hooks
4. `src/components/*.jsx` → `.tsx` — React components

**TypeScript Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "strict": false,
    "noImplicitAny": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

### 2. Stockfish Service Simplification

**Current Problems:**
- Too many global state variables (`engineInitPromise`, `analysisQueue`, `analysisSeq`)
- Debug flags scattered everywhere
- Over-engineered error recovery

**Simplified Design:**
```typescript
interface EngineConfig {
  depth: number;
  movetime: number | null;
  elo: number | null;
  skillLevel: number | null;
}

interface AnalysisResult {
  success: boolean;
  source: 'stockfish_wasm' | 'stockfish_wasm_partial' | 'fallback';
  bestMove: string | null;
  evaluation: Evaluation | null;
  depth: number;
  pv: string[];
}

export async function analyzeFen(config: EngineConfig): Promise<AnalysisResult>
export async function getBestMove(config: EngineConfig): Promise<string | null>
export function configureEngine(elo: number): Promise<void>
```

**Changes:**
- Remove: `engineInitPromise`, `analysisQueue`, `analysisSeq`
- Remove: Multiple debug flags → single env-based toggle
- Document: Public API with JSDoc
- Target: 570 lines → ~200 lines

### 3. Bot Service Race Condition Fix

**Current Problem:** `botRequestIdRef` scattered, hard to track state

**New Design:**
```typescript
interface BotState {
  status: 'idle' | 'thinking' | 'cancelled';
  currentFen: string | null;
  requestId: number;
}

export async function getBotMove(fen: string, config: BotConfig): Promise<BotMove> {
  // Simple state machine pattern
  // Cancel previous → Set thinking → Analyze → Validate → Return
}
```

### 4. AI Coach Integration

**Architecture:**
```
User → AICoachPanel → aiCoachApiService → /api/coach → Claude API
                                       ↓ (on error)
                                    mockCoachService (silent fallback)
```

**Behavior:**
- Primary: Call `/api/coach` which uses Claude API + RAG
- Fallback: Silent fallback to mock (user doesn't see error)
- Timeout: 20 seconds

**Types:**
```typescript
interface CoachPayload {
  message: string;
  fen?: string;
  history?: string[];
  pgn?: string;
  level: 'noob' | 'beginner' | 'intermediate' | 'advanced';
  mode: 'hint' | 'explain_position' | 'review_game' | 'chat';
  userProfile: UserProfile;
  recommendations: Recommendations;
  stockfish?: StockfishContext;
}

interface CoachResponse {
  reply: string;
  source: 'ai' | 'fallback';
  suggestedActions: string[];
}
```

## Commit Plan

### Phase 1: TypeScript Setup
- `chore: add tsconfig.json and configure Vite for TypeScript`

### Phase 2: Types & Services
- `types: add Chess types (ChessTypes.ts)`
- `refactor: convert stockfishService.js to TypeScript`
- `fix: simplify stockfishService - reduce complexity`
- `refactor: convert botService.js to TypeScript`
- `fix: botService race condition with state machine pattern`
- `refactor: convert aiCoachApiService.js to TypeScript`

### Phase 3: Hooks & Components
- `types: add useBotMove types`
- `refactor: convert useBotMove hook to TypeScript`
- `refactor: convert AICoachPanel to TypeScript`

### Phase 4: Polish
- `docs: add JSDoc to service APIs`
- `fix: remove scattered debug flags`

## Success Criteria

1. All `.js` service files converted to `.ts`
2. Stockfish service reduced to <250 lines
3. Bot service uses clear state machine pattern
4. AI Coach calls real API with silent fallback
5. TypeScript compiles without errors
6. Tests pass after migration
