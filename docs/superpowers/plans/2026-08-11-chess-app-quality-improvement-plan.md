# Chess App Quality Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve code quality: TypeScript enforcement, real AI integration, Stockfish simplification, and race condition fixes.

**Architecture:** Incremental migration by module (services → hooks → components). Each module converted to TypeScript with proper types. Stockfish service simplified from 570 to ~200 lines. Bot service uses state machine pattern for race conditions.

**Tech Stack:** TypeScript 6.0.3, Vite, React 19, Vitest

## Global Constraints

- TypeScript strict mode: disabled initially, enabled after migration
- Target lines for stockfishService: <250 lines
- AI fallback: silent (user doesn't see errors)
- Commit strategy: one commit per task (many commits)

---

## Task 1: TypeScript Setup

**Files:**
- Create: `tsconfig.json`
- Modify: `vite.config.js` (if needed for TypeScript)

**Interfaces:**
- Produces: TypeScript configuration for the project

- [ ] **Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "checkJs": false,
    "strict": false,
    "noImplicitAny": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Run TypeScript check to verify no errors**

Run: `npx tsc --noEmit`
Expected: Should complete without errors (or show current JS errors)

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add tsconfig.json with permissive settings for incremental migration

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create Shared Chess Types

**Files:**
- Create: `src/types/ChessTypes.ts`

**Interfaces:**
- Produces: Shared type definitions used across services

```typescript
// Evaluation types
export interface Evaluation {
  type: 'cp' | 'mate';
  value: number;
  display: string;
}

// Engine result types
export interface AnalysisResult {
  success: boolean;
  source: 'stockfish_wasm' | 'stockfish_wasm_partial' | 'fallback';
  fen: string;
  bestMove: string | null;
  evaluation: Evaluation | null;
  depth: number;
  pv: string[];
  raw: string[];
  warning?: string;
}

// Engine config types
export interface EngineConfig {
  fen: string;
  depth?: number;
  movetime?: number | null;
  elo?: number | null;
  skillLevel?: number | null;
  useSkillLevelOnly?: boolean;
  purpose?: string;
}

// Bot types
export interface BotConfig {
  elo: number;
  depth: number;
  movetime: number;
  skillLevel: number;
  randomChance: number;
  useSkillLevelOnly: boolean;
}

export interface BotMoveResult {
  move: string | null;
  source: string;
  elo: number;
  depth: number;
  movetime: number;
  skillLevel: number;
  evaluation?: Evaluation;
  warning?: string;
}

// Coach types
export type CoachLevel = 'noob' | 'beginner' | 'intermediate' | 'advanced';
export type CoachMode = 'hint' | 'explain_position' | 'review_game' | 'chat';

export interface CoachPayload {
  message: string;
  fen?: string;
  history?: string[];
  pgn?: string;
  level: CoachLevel;
  mode: CoachMode;
  userProfile?: Record<string, unknown>;
  recommendations?: Record<string, unknown>;
  stockfish?: {
    evaluation: Evaluation | null;
    bestMove: string | null;
  };
}

export interface CoachResponse {
  reply: string;
  source: 'ai' | 'fallback';
  suggestedActions: string[];
}

// User profile types
export interface UserProfile {
  currentLevel: CoachLevel;
  gamesPlayed?: number;
  exerciseStats?: {
    total?: number;
    accuracy?: number;
  };
  commonMistakes?: string[];
  weaknesses?: string[];
  strengths?: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/ChessTypes.ts
git commit -m "types: add shared ChessTypes for services and components

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Refactor stockfishService.js to TypeScript

**Files:**
- Create: `src/services/stockfishService.ts`
- Delete: `src/services/stockfishService.js`

**Interfaces:**
- Consumes: `src/types/ChessTypes.ts`
- Produces: `analyzeFen()`, `getBestMove()`, `configureEngine()`, `initEngine()`, `stopEngine()`, `disposeEngine()`, `getEngineState()`, `cancelPendingAnalysis()`

**Simplifications to implement:**
1. Remove `engineInitPromise`, `analysisQueue`, `analysisSeq`
2. Use simple `AbortController` pattern instead
3. Remove scattered debug flags → single env-based toggle
4. Document public API with JSDoc
5. Target: <250 lines

- [ ] **Step 1: Create new stockfishService.ts with TypeScript**

```typescript
import { analyzeFenFallback, getBestMoveFallback } from './fallbackChessEngine';
import { isLegalUciMove } from '../utils/chessMoveValidation';
import type { AnalysisResult, EngineConfig, Evaluation, BotConfig } from '../types/ChessTypes';

const ENGINE_VERSION = '2026-05-30-simplified';
const ENGINE_CRASH_BASE_COOLDOWN_MS = 60000;
const ENGINE_CRASH_MAX_COOLDOWN_MS = 300000;

let worker: Worker | null = null;
let engineReady = false;
let engineState: 'idle' | 'loading' | 'ready' | 'analyzing' | 'error' = 'idle';
let engineDisabledUntil = 0;
let engineFailureCount = 0;
let hasLoggedWorkerUnavailable = false;
let currentAnalysis: { stopped: boolean; fen: string } | null = null;

// Simple abort controller for request cancellation
let currentRequestId = 0;

function debug(...args: unknown[]) {
  if (import.meta.env.DEV && localStorage.getItem('debugStockfish') === '1') {
    console.log('[Stockfish]', ...args);
  }
}

/**
 * Initialize the Stockfish engine
 */
export async function initEngine(): Promise<boolean> {
  if (Date.now() < engineDisabledUntil) {
    engineState = 'error';
    return false;
  }

  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    engineState = 'error';
    return false;
  }

  if (engineReady && worker) {
    debug('Engine already ready');
    return true;
  }

  if (engineState === 'loading') {
    return false;
  }

  engineState = 'loading';

  try {
    if (worker) {
      worker.terminate();
    }

    worker = new Worker(`/stockfish-worker.js?v=${ENGINE_VERSION}`);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        disableEngine('Init timeout');
        resolve(false);
      }, 10000);

      worker!.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'ready') {
          clearTimeout(timeout);
          if (event.data.success) {
            engineReady = true;
            engineState = 'ready';
            engineFailureCount = 0;
            hasLoggedWorkerUnavailable = false;
            debug('Engine ready!');
            resolve(true);
          } else {
            disableEngine(event.data.error || 'Init failed');
            resolve(false);
          }
        }
      };

      worker!.onerror = () => {
        clearTimeout(timeout);
        disableEngine('Worker error');
        resolve(false);
      };

      worker!.postMessage('init');
    });
  } catch (error) {
    disableEngine(String(error));
    return false;
  }
}

function disableEngine(reason: string) {
  engineFailureCount++;
  const cooldownMs = Math.min(
    ENGINE_CRASH_BASE_COOLDOWN_MS * (2 ** Math.max(engineFailureCount - 1, 0)),
    ENGINE_CRASH_MAX_COOLDOWN_MS
  );

  engineDisabledUntil = Date.now() + cooldownMs;
  engineState = 'error';
  engineReady = false;

  if (worker) {
    worker.terminate();
    worker = null;
  }

  if (!hasLoggedWorkerUnavailable) {
    debug('Worker unavailable, using fallback temporarily:', reason);
    hasLoggedWorkerUnavailable = true;
  }
}

export function isEngineReady(): boolean {
  return engineReady && worker !== null;
}

export function getEngineState() {
  return engineState;
}

export async function configureEngine(elo: number): Promise<boolean> {
  if (!isEngineReady()) return false;

  try {
    if (elo < 1200) {
      // Use Skill Level for low ELO
      const skillLevel = Math.max(0, Math.floor((1200 - elo) / 50));
      worker!.postMessage('setoption name UCI_LimitStrength value false');
      worker!.postMessage(`setoption name Skill Level value ${skillLevel}`);
    } else {
      // Use UCI_Elo for mid-high ELO
      worker!.postMessage('setoption name UCI_LimitStrength value true');
      worker!.postMessage(`setoption name UCI_Elo value ${elo}`);
    }
    return true;
  } catch {
    return false;
  }
}

export function stopEngine() {
  if (currentAnalysis) {
    currentAnalysis.stopped = true;
  }
  if (worker) {
    worker.postMessage('stop');
  }
}

export function disposeEngine() {
  stopEngine();
  if (worker) {
    worker.terminate();
    worker = null;
  }
  engineReady = false;
  engineState = 'idle';
}

export function cancelPendingAnalysis() {
  stopEngine();
  currentAnalysis = null;
}

/**
 * Analyze FEN position and return best move with evaluation
 */
export async function analyzeFen(config: EngineConfig): Promise<AnalysisResult> {
  const { fen, depth = 10, movetime = null, elo = 1200, skillLevel = null } = config;

  if (!fen) {
    throw new Error('FEN is required');
  }

  // Init engine if needed
  if (!isEngineReady()) {
    const initialized = await initEngine();
    if (!initialized) {
      return fallbackAnalysis(fen, depth, elo);
    }
  }

  // Configure ELO
  if (elo || skillLevel !== null) {
    await configureEngine(elo);
  }

  const requestId = ++currentRequestId;
  const timeoutMs = depth <= 12 ? 1500 : depth <= 18 ? 3000 : 6000;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (currentAnalysis?.stopped || !currentAnalysis) return;
      // Timeout - use partial result or fallback
      const partial = getPartialResult(fen);
      if (partial) {
        resolve({ ...partial, source: 'stockfish_wasm_partial' });
      } else {
        resolve(fallbackAnalysis(fen, depth, elo, 'Stockfish timeout'));
      }
    }, timeoutMs);

    currentAnalysis = { stopped: false, fen };
    let bestMove: string | null = null;
    let evaluation: Evaluation | null = null;
    let lastDepth = 0;
    const pv: string[] = [];

    function cleanup() {
      clearTimeout(timeout);
      if (worker) {
        worker.onmessage = null;
      }
    }

    function finish(result: AnalysisResult) {
      cleanup();
      currentAnalysis = null;
      engineState = 'ready';
      resolve(result);
    }

    worker!.onmessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'error') {
        disableEngine(message.error);
        finish(fallbackAnalysis(fen, depth, elo, 'Stockfish error'));
        return;
      }

      if (message.type !== 'output') return;

      const line: string = message.data;

      // Parse depth
      const depthMatch = line.match(/depth (\d+)/);
      if (depthMatch) {
        lastDepth = parseInt(depthMatch[1], 10);
      }

      // Parse evaluation
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);

      if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10);
        evaluation = { type: 'mate', value: mateIn, display: `Mate in ${Math.abs(mateIn)}` };
      } else if (cpMatch) {
        const cp = parseInt(cpMatch[1], 10);
        evaluation = { type: 'cp', value: cp, display: `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}` };
      }

      // Parse PV
      const pvMatch = line.match(/(?:^|\s)pv\s+(.+)/);
      if (pvMatch) {
        pv.push(...pvMatch[1].split(' ').filter((m) => m.length >= 4));
      }

      // Best move
      if (line.startsWith('bestmove')) {
        const match = line.match(/bestmove (\S+)/);
        if (match) {
          bestMove = match[1];
        }

        const candidate = bestMove || pv[0] || null;
        if (candidate && isLegalUciMove(fen, candidate)) {
          finish({
            success: true,
            source: 'stockfish_wasm',
            fen,
            bestMove: candidate,
            evaluation: evaluation || { type: 'cp', value: 0, display: '0.00' },
            depth: lastDepth || depth,
            pv,
            raw: [],
          });
        } else {
          const partial = getPartialResult(fen);
          finish(partial || fallbackAnalysis(fen, depth, elo, 'Invalid bestmove'));
        }
      }
    };

    worker!.onerror = () => {
      disableEngine('Worker error');
      finish(fallbackAnalysis(fen, depth, elo, 'Worker error'));
    };

    try {
      worker!.postMessage('ucinewgame');
      worker!.postMessage(`position fen ${fen}`);
      worker!.postMessage(movetime ? `go movetime ${movetime}` : `go depth ${depth}`);
      engineState = 'analyzing';
    } catch {
      disableEngine('Command error');
      finish(fallbackAnalysis(fen, depth, elo, 'Command error'));
    }
  });
}

function getPartialResult(fen: string): AnalysisResult | null {
  // Return null - simplified, no partial results
  return null;
}

function fallbackAnalysis(fen: string, depth: number, elo: number, warning = 'Stockfish unavailable'): AnalysisResult {
  try {
    const fallback = analyzeFenFallback({ fen, depth, elo });
    return {
      success: !!fallback?.bestMove,
      source: 'fallback',
      fen,
      bestMove: fallback?.bestMove || null,
      evaluation: fallback?.evaluation || null,
      depth: fallback?.depth || 0,
      pv: [],
      raw: [],
      warning,
    };
  } catch {
    return {
      success: false,
      source: 'fallback',
      fen,
      bestMove: null,
      evaluation: null,
      depth: 0,
      pv: [],
      raw: [],
      warning: 'No legal moves',
    };
  }
}

/**
 * Get best move only (convenience function)
 */
export async function getBestMove(config: Omit<EngineConfig, 'purpose'>): Promise<string | null> {
  try {
    const result = await analyzeFen(config);
    return result.bestMove;
  } catch {
    return getBestMoveFallback(config);
  }
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit src/services/stockfishService.ts`
Expected: No errors

- [ ] **Step 3: Run existing tests**

Run: `npm test -- --run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/services/stockfishService.ts src/services/stockfishService.js
git rm src/services/stockfishService.js
git add src/services/stockfishService.ts
git commit -m "refactor: convert stockfishService.js to TypeScript with simplified architecture

- Remove over-engineered state (engineInitPromise, analysisQueue)
- Single abort controller pattern for request cancellation
- Reduce from 570 lines to ~200 lines
- Add JSDoc documentation

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Refactor botService.js to TypeScript with Race Condition Fix

**Files:**
- Create: `src/services/botService.ts`
- Delete: `src/services/botService.js`

**Interfaces:**
- Consumes: `src/types/ChessTypes.ts`, `analyzeFen()` from stockfishService
- Produces: `getBotMove()`, `uciToMoveObject()`

**Race condition fix pattern:**
```typescript
interface BotState {
  status: 'idle' | 'thinking' | 'cancelled';
  currentFen: string | null;
  requestId: number;
}
```

- [ ] **Step 1: Create new botService.ts**

```typescript
import { analyzeFen } from './stockfishService';
import { getSafeFallbackMove } from './heuristicBotEngine';
import { getBotLevelByElo } from '../data/botLevels';
import { isLegalUciMove, parseUciMove } from '../utils/chessMoveValidation';
import type { AnalysisResult, BotConfig, BotMoveResult, EngineConfig } from '../types/ChessTypes';

// Simple state machine
let state: {
  status: 'idle' | 'thinking' | 'cancelled';
  currentFen: string | null;
  requestId: number;
} = {
  status: 'idle',
  currentFen: null,
  requestId: 0,
};

function getFallbackSource(botElo: number): string {
  return botElo <= 800 ? 'fallback_random_weak' : 'fallback_heuristic';
}

/**
 * Get bot's move for given FEN position
 * Uses state machine pattern to prevent race conditions
 */
export async function getBotMove(fen: string, botElo: number = 1200): Promise<BotMoveResult> {
  const config = getBotLevelByElo(botElo);

  if (!config) {
    throw new Error(`Invalid bot ELO: ${botElo}`);
  }

  // Cancel any pending request
  state.status = 'cancelled';
  state.requestId++;
  const thisRequestId = state.requestId;

  // Start new request
  state.status = 'thinking';
  state.currentFen = fen;

  try {
    // Random weak move chance (for low ELO bots)
    if (config.randomChance > 0 && Math.random() < config.randomChance) {
      const weakMove = getSafeFallbackMove(fen, 800);
      return validateAndReturn(fen, weakMove, 'fallback_random_weak', config, thisRequestId);
    }

    // Analyze with Stockfish
    const engineConfig: EngineConfig = {
      fen,
      depth: config.depth,
      movetime: config.movetime,
      elo: config.elo,
      skillLevel: config.skillLevel,
      useSkillLevelOnly: config.useSkillLevelOnly,
      purpose: 'bot_move',
    };

    const analysis: AnalysisResult = await analyzeFen(engineConfig);

    // Check staleness
    if (state.status === 'cancelled' || state.currentFen !== fen || state.requestId !== thisRequestId) {
      return {
        move: null,
        source: 'stale',
        ...config,
      };
    }

    if (analysis.success && analysis.bestMove && isLegalUciMove(fen, analysis.bestMove)) {
      return {
        move: analysis.bestMove,
        source: analysis.source,
        elo: config.elo,
        depth: analysis.depth,
        movetime: config.movetime,
        skillLevel: config.skillLevel,
        evaluation: analysis.evaluation,
      };
    }

    // Invalid move or failed - use fallback
    return getFallbackBotMove(fen, botElo, config, 'Stockfish unavailable or invalid move');
  } catch (error) {
    console.error('[Bot] Error getting move:', error);
    return getFallbackBotMove(fen, botElo, config, 'Bot engine error');
  } finally {
    if (state.requestId === thisRequestId) {
      state.status = 'idle';
    }
  }
}

function validateAndReturn(
  fen: string,
  move: string | null,
  source: string,
  config: BotConfig,
  requestId: number
): BotMoveResult {
  // Check if this request is still current
  if (state.requestId !== requestId) {
    return { move: null, source: 'stale', ...config };
  }

  if (!move || !isLegalUciMove(fen, move)) {
    return getFallbackBotMove(fen, config.elo, config, 'Invalid move');
  }

  return {
    move,
    source,
    elo: config.elo,
    depth: config.depth,
    movetime: config.movetime,
    skillLevel: config.skillLevel,
  };
}

function getFallbackBotMove(fen: string, botElo: number, config: BotConfig, warning: string): BotMoveResult {
  const fallbackMove = getSafeFallbackMove(fen, botElo);

  if (!fallbackMove || !isLegalUciMove(fen, fallbackMove)) {
    return {
      move: null,
      source: 'none',
      ...config,
      warning: 'No legal moves',
    };
  }

  return {
    move: fallbackMove,
    source: getFallbackSource(botElo),
    ...config,
    warning,
  };
}

export function uciToMoveObject(uci: string) {
  return parseUciMove(uci);
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit src/services/botService.ts`
Expected: No errors

- [ ] **Step 3: Run tests**

Run: `npm test -- --run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/services/botService.ts
git rm src/services/botService.js
git commit -m "refactor: convert botService.js to TypeScript with state machine pattern

Fix race conditions:
- Simple state machine tracks idle/thinking/cancelled status
- Request ID prevents stale results
- Clear validation flow for moves

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Refactor aiCoachApiService.js to TypeScript

**Files:**
- Create: `src/services/aiCoachApiService.ts`
- Delete: `src/services/aiCoachApiService.js`

**Interfaces:**
- Consumes: `src/types/ChessTypes.ts`
- Produces: `askAICoach()`

- [ ] **Step 1: Create new aiCoachApiService.ts**

```typescript
import { askMockCoach, explainMockPosition, getMockHint, reviewMockGame } from './mockCoachService';
import { getEmbeddingCached } from './embeddingService.js';
import { searchAll } from './vectorSearchService.js';
import type { CoachPayload, CoachResponse, CoachLevel } from '../types/ChessTypes';

/**
 * Fallback to mock coach when AI is unavailable
 */
function fallbackMock(payload: CoachPayload): string {
  const mockPayload = {
    question: payload.message,
    fen: payload.fen,
    history: payload.history,
    level: payload.level,
  };

  switch (payload.mode) {
    case 'hint':
      return getMockHint(mockPayload);
    case 'explain_position':
      return explainMockPosition(mockPayload);
    case 'review_game':
      return reviewMockGame(mockPayload);
    default:
      return askMockCoach(mockPayload);
  }
}

/**
 * Compact payload to reduce token usage
 */
function compactPayload(payload: CoachPayload): Record<string, unknown> {
  return {
    message: payload.message,
    fen: payload.fen || '',
    history: Array.isArray(payload.history) ? payload.history.slice(-20) : [],
    pgn: payload.pgn ? String(payload.pgn).slice(-2500) : '',
    userProfile: payload.userProfile || {},
    recommendations: payload.recommendations || {},
    stockfish: payload.stockfish || null,
    openingContext: null,
    responseStyle: 'very_short',
    level: payload.level,
    mode: payload.mode,
  };
}

/**
 * Map user level to ELO range for RAG search
 */
function eloFromLevel(level: CoachLevel): [number, number] {
  const map: Record<CoachLevel, [number, number]> = {
    noob: [400, 800],
    beginner: [800, 1200],
    intermediate: [1200, 1800],
    advanced: [1800, 2400],
  };
  return map[level] || [400, 2400];
}

/**
 * Enhance payload with RAG context from chess knowledge base
 */
async function enhanceWithRAG(payload: CoachPayload): Promise<CoachPayload & { contextPrompt: string }> {
  const { message, userProfile } = payload;

  const embedding = await getEmbeddingCached(message || '');
  if (!embedding) {
    return { ...payload, contextPrompt: '' };
  }

  const searchResults = await searchAll(embedding, {
    limit: 3,
    eloRange: userProfile?.currentLevel ? eloFromLevel(userProfile.currentLevel as CoachLevel) : undefined,
  });

  const citations: { category: string; text: string }[] = [];
  for (const [category, chunks] of Object.entries(searchResults)) {
    for (const chunk of chunks || []) {
      citations.push({
        category,
        text: chunk.chunk_text.substring(0, 300),
      });
    }
  }

  const contextPrompt = buildContextPrompt(citations);
  return { ...payload, contextPrompt };
}

function buildContextPrompt(citations: { category: string; text: string }[]): string {
  if (!citations.length) return '';

  const grouped = citations.reduce(
    (acc, c) => {
      if (!acc[c.category]) acc[c.category] = [];
      acc[c.category].push(c.text);
      return acc;
    },
    {} as Record<string, string[]>
  );

  const labels: Record<string, string> = {
    opening: 'Khai cuộc liên quan',
    tactic: 'Chiến thuật liên quan',
    principle: 'Nguyên tắc liên quan',
    endgame: 'Tàn cuộc liên quan',
  };

  const sections = Object.entries(grouped)
    .map(([category, texts]) => {
      const label = labels[category] || category;
      return `${label}:\n${texts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`;
    })
    .join('\n\n');

  return `\n\nKiến thức tham khảo (RAG):\n${sections}`;
}

/**
 * Ask the AI Coach with RAG enhancement and fallback
 * Silent fallback: if AI fails, use mock without showing error
 */
export async function askAICoach(payload: CoachPayload): Promise<CoachResponse> {
  // Step 1: Enhance with RAG context
  const enhanced = await enhanceWithRAG(payload);

  // Step 2: Call Claude API
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(compactPayload(enhanced)),
    });

    window.clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Coach API error');
    }

    const data = await response.json();

    if (data.success && data.reply) {
      return {
        reply: data.reply,
        source: 'ai',
        suggestedActions: data.suggestedActions || [],
      };
    }

    // API returned but no reply - use fallback
    return {
      reply: fallbackMock(payload),
      source: 'fallback',
      suggestedActions: [],
    };
  } catch {
    window.clearTimeout(timeoutId);
    // Silent fallback - user doesn't see error
    return {
      reply: fallbackMock(payload),
      source: 'fallback',
      suggestedActions: [],
    };
  }
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit src/services/aiCoachApiService.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/services/aiCoachApiService.ts
git rm src/services/aiCoachApiService.js
git commit -m "refactor: convert aiCoachApiService.js to TypeScript

- Add proper CoachPayload and CoachResponse types
- Document fallback behavior (silent fallback)
- Keep RAG enhancement for better responses

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Convert useBotMove Hook to TypeScript

**Files:**
- Create: `src/hooks/useBotMove.ts`
- Delete: `src/hooks/useBotMove.js`

**Interfaces:**
- Consumes: `getBotMove()` from botService, `src/types/ChessTypes.ts`
- Produces: `useBotMove` hook

- [ ] **Step 1: Read current useBotMove.js**

Read `src/hooks/useBotMove.js` to understand current implementation

- [ ] **Step 2: Create useBotMove.ts with types**

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { getBotMove } from '../services/botService';
import type { BotMoveResult } from '../types/ChessTypes';

interface UseBotMoveOptions {
  botElo?: number;
  onMoveStart?: () => void;
  onMoveComplete?: (move: BotMoveResult) => void;
}

interface UseBotMoveReturn {
  isThinking: boolean;
  lastMove: BotMoveResult | null;
  getMove: (fen: string) => Promise<BotMoveResult>;
  cancelMove: () => void;
}

export function useBotMove(options: UseBotMoveOptions = {}): UseBotMoveReturn {
  const { botElo = 1200, onMoveStart, onMoveComplete } = options;

  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<BotMoveResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelMove = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
  }, []);

  const getMove = useCallback(
    async (fen: string): Promise<BotMoveResult> => {
      // Cancel any pending move
      cancelMove();

      abortControllerRef.current = new AbortController();
      setIsThinking(true);
      onMoveStart?.();

      try {
        const result = await getBotMove(fen, botElo);
        setLastMove(result);
        onMoveComplete?.(result);
        return result;
      } finally {
        setIsThinking(false);
      }
    },
    [botElo, onMoveStart, onMoveComplete, cancelMove]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelMove();
    };
  }, [cancelMove]);

  return {
    isThinking,
    lastMove,
    getMove,
    cancelMove,
  };
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit src/hooks/useBotMove.ts`
Expected: No errors

- [ ] **Step 3: Run tests**

Run: `npm test -- --run src/hooks/useBotMove.test.js`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useBotMove.ts
git rm src/hooks/useBotMove.js
git commit -m "refactor: convert useBotMove hook to TypeScript

- Add proper types for options and return value
- Keep existing behavior with better type safety

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Convert AICoachPanel to TypeScript

**Files:**
- Create: `src/components/AICoachPanel.tsx`
- Delete: `src/components/AICoachPanel.jsx`

**Interfaces:**
- Consumes: `askAICoach()` from aiCoachApiService, `src/types/ChessTypes.ts`
- Produces: `AICoachPanel` component

- [ ] **Step 1: Read current AICoachPanel.jsx**

Read `src/components/AICoachPanel.jsx` to understand current implementation

- [ ] **Step 2: Create AICoachPanel.tsx with types**

Convert the component, adding types for:
- Props interface
- State types
- Event handler types

```typescript
import { useState, useCallback } from 'react';
import { askAICoach } from '../services/aiCoachApiService';
import type { CoachPayload, CoachResponse, CoachLevel, CoachMode } from '../types/ChessTypes';

interface AICoachPanelProps {
  fen?: string;
  history?: string[];
  level?: CoachLevel;
  onClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

export function AICoachPanel({ fen, history = [], level = 'beginner', onClose }: AICoachPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ... rest of implementation with proper types
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit src/components/AICoachPanel.tsx`
Expected: No errors

- [ ] **Step 4: Test in browser**

Run: `npm run dev` and verify AICoachPanel works

- [ ] **Step 5: Commit**

```bash
git add src/components/AICoachPanel.tsx
git rm src/components/AICoachPanel.jsx
git commit -m "refactor: convert AICoachPanel to TypeScript

- Add proper types for props and state
- Type-safe message handling

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Enable Strict TypeScript

**Files:**
- Modify: `tsconfig.json`

**Goal:** Enable stricter TypeScript checking and fix any resulting errors

- [ ] **Step 1: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

- [ ] **Step 2: Run TypeScript check and fix errors**

Run: `npx tsc --noEmit`
Expected: May have errors - fix them

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable strict TypeScript mode

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npm test -- --run`
Expected: All tests pass

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: final verification - all tests pass

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Lines Changed |
|------|-------------|---------------|
| 1 | TypeScript setup | +50 |
| 2 | Shared types | +100 |
| 3 | Stockfish refactor | -370 (570→200) |
| 4 | Bot service fix | -50 (cleaner) |
| 5 | AI Coach types | ~same |
| 6 | useBotMove hook | +30 |
| 7 | AICoachPanel | +20 |
| 8 | Strict mode | varies |
| 9 | Verification | - |

**Total: ~9 commits, ~100 net lines added (but much cleaner code)**
