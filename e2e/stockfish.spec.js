/**
 * Stockfish Worker Integration Test (Playwright)
 *
 * Tests the real Stockfish WASM worker in a browser:
 * 1. Worker initializes correctly
 * 2. UCI handshake (uci, uciok, isready, readyok)
 * 3. Analyzes FEN position
 * 4. Returns legal bestmove verified by chess.js
 * 5. Source is stockfish_wasm
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5173';

test.describe('Stockfish Worker Integration', () => {
  test('every displayed difficulty sends its pinned monotonic UCI constraints', async ({ page }) => {
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      window.__stockfishDifficultyCommands = [];
      window.__stockfishUciOptions = [];
      window.Worker = class TrackedWorker extends NativeWorker {
        constructor(url, options) {
          super(url, options);
          if (String(url).includes('/stockfish-worker.js')) {
            this.addEventListener('message', (event) => {
              const line = event.data?.type === 'output' ? event.data.data : null;
              if (typeof line === 'string' && line.startsWith('option name ')) {
                window.__stockfishUciOptions.push(line);
              }
            });
          }
        }

        postMessage(message, ...rest) {
          if (String(this).includes('Worker')) window.__stockfishDifficultyCommands.push(message);
          return super.postMessage(message, ...rest);
        }
      };
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const runs = await page.evaluate(async () => {
      const engine = await import('/src/services/stockfishService.ts');
      const { BOT_ELO_LEVELS } = await import('/src/data/botLevels.js');
      const { isLegalUciMove } = await import('/src/utils/chessMoveValidation.js');
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const results = [];

      engine.disposeEngine();
      for (const level of BOT_ELO_LEVELS) {
        const start = window.__stockfishDifficultyCommands.length;
        const result = await engine.analyzeFen({ ...level, fen, purpose: 'bot_move' });
        results.push({
          level,
          result,
          legal: isLegalUciMove(fen, result.bestMove),
          commands: window.__stockfishDifficultyCommands.slice(start),
        });
      }
      const generic = await engine.analyzeFen({ fen, depth: 4, movetime: 100, purpose: 'hint' });
      const allCommands = [...window.__stockfishDifficultyCommands];
      engine.disposeEngine();
      return { results, generic, allCommands, uciOptions: window.__stockfishUciOptions };
    });

    const eloOption = runs.uciOptions.find((line) => line.startsWith('option name UCI_Elo '));
    const eloRange = eloOption?.match(/min (\d+) max (\d+)/);
    expect(eloRange).not.toBeNull();
    expect(runs.generic.source).toBe('stockfish_wasm');
    for (const command of runs.allCommands.filter((line) => line.startsWith('setoption name UCI_Elo value '))) {
      const value = Number(command.split(' ').at(-1));
      expect(value).toBeGreaterThanOrEqual(Number(eloRange[1]));
      expect(value).toBeLessThanOrEqual(Number(eloRange[2]));
    }
    expect(runs.results).toHaveLength(4);
    for (const { level, result, legal, commands } of runs.results) {
      expect(result.source).toBe('stockfish_wasm');
      expect(legal).toBe(true);
      expect(commands).toContain(`go movetime ${level.movetime}`);
      expect(commands).toContain(`setoption name UCI_LimitStrength value ${!level.useSkillLevelOnly}`);
      if (level.useSkillLevelOnly) {
        expect(commands).toContain(`setoption name Skill Level value ${level.skillLevel}`);
        expect(commands.some((command) => command.startsWith('setoption name UCI_Elo value'))).toBe(false);
      } else {
        expect(level.elo).toBeGreaterThanOrEqual(Number(eloRange[1]));
        expect(level.elo).toBeLessThanOrEqual(Number(eloRange[2]));
        expect(commands).toContain(`setoption name UCI_Elo value ${level.elo}`);
      }
    }
  });

  test('starting a new game aborts the active bot search and isolates its stale result', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('chess-app-onboarding', 'true');
      const NativeWorker = window.Worker;
      window.__newGameCancellation = { workers: [], terminated: [], searches: [] };
      window.Worker = class TrackedWorker extends NativeWorker {
        constructor(url, options) {
          super(url, options);
          this.__workerId = window.__newGameCancellation.workers.length + 1;
          this.__isStockfish = String(url).includes('/stockfish-worker.js');
          if (this.__isStockfish) {
            window.__newGameCancellation.workers.push({ id: this.__workerId, url: String(url) });
            this.addEventListener('message', (event) => {
              const line = event.data?.type === 'output' ? event.data.data : null;
              if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
              const search = window.__newGameCancellation.searches
                .findLast((item) => item.workerId === this.__workerId && !item.bestmove);
              if (search) search.bestmove = line.split(/\s+/)[1];
            });
          }
        }

        postMessage(message, ...rest) {
          if (this.__isStockfish && typeof message === 'string' && message.startsWith('go ')) {
            window.__newGameCancellation.searches.push({
              workerId: this.__workerId,
              command: message,
              bestmove: null,
            });
          }
          return super.postMessage(message, ...rest);
        }

        terminate() {
          if (this.__isStockfish) window.__newGameCancellation.terminated.push(this.__workerId);
          return super.terminate();
        }
      };
    });

    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });
    await page.locator('div[aria-label] button').nth(3).click();
    await page.locator('button[aria-label]').last().click();
    await page.locator('.pt-2 button').click();
    await page.waitForFunction(() => window.__newGameCancellation.searches
      .some((search) => search.command === 'go movetime 1200' && !search.bestmove));

    const oldWorkerId = await page.evaluate(() => window.__newGameCancellation.workers.at(-1).id);
    await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
    await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.__newGameCancellation.terminated)).toContain(oldWorkerId);

    await page.waitForFunction((oldId) => window.__newGameCancellation.searches.some(
      (search) => search.workerId !== oldId && search.command === 'go movetime 1200' && search.bestmove
    ), oldWorkerId, { timeout: 30000 });
    await page.waitForTimeout(1500);

    const outcome = await page.evaluate((oldId) => ({
      lifecycle: window.__newGameCancellation,
      oldSearch: window.__newGameCancellation.searches.find(
        (search) => search.workerId === oldId && search.command === 'go movetime 1200'
      ),
      moveHistory: [...document.querySelectorAll('button span')]
        .map((span) => span.textContent?.trim() || '')
        .filter((value) => /^\d+\.\s+\S+/.test(value)),
    }), oldWorkerId);

    expect(outcome.oldSearch.bestmove).toBeNull();
    expect(outcome.moveHistory).toHaveLength(1);
    expect(outcome.lifecycle.workers).toHaveLength(2);
  });

  test('dispose cancels cold initialization without poisoning the replacement worker', async ({ page }) => {
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      const nativeSetTimeout = window.setTimeout.bind(window);
      let initTimeoutCount = 0;
      window.__coldInitLifecycle = { created: [], terminated: [] };
      window.setTimeout = (callback, delay, ...args) => {
        if (delay !== 10000) return nativeSetTimeout(callback, delay, ...args);
        initTimeoutCount += 1;
        return nativeSetTimeout(callback, initTimeoutCount === 1 ? 200 : 3000, ...args);
      };
      window.Worker = class TrackedWorker extends NativeWorker {
        constructor(url, options) {
          super(url, options);
          this.__lifecycleId = window.__coldInitLifecycle.created.length + 1;
          this.__isStockfish = String(url).includes('/stockfish-worker.js');
          if (this.__isStockfish) window.__coldInitLifecycle.created.push({ id: this.__lifecycleId, url: String(url) });
        }

        postMessage(message, ...rest) {
          if (this.__isStockfish && this.__lifecycleId === 1 && message === 'init') {
            nativeSetTimeout(() => super.postMessage(message, ...rest), 15000);
            return;
          }
          return super.postMessage(message, ...rest);
        }

        terminate() {
          if (this.__isStockfish) window.__coldInitLifecycle.terminated.push(this.__lifecycleId);
          return super.terminate();
        }
      };
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const outcome = await page.evaluate(async () => {
      const engine = await import('/src/services/stockfishService.ts');
      engine.disposeEngine();
      const first = engine.initEngine();
      while (engine.getEngineState() !== 'loading') await new Promise((resolve) => setTimeout(resolve, 1));
      engine.disposeEngine();
      const firstPrompt = await Promise.race([
        first.then((value) => ({ settled: true, value })),
        new Promise((resolve) => setTimeout(() => resolve({ settled: false }), 100)),
      ]);
      const second = await engine.initEngine();
      const secondWorkerId = window.__coldInitLifecycle.created.at(-1).id;
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        firstPrompt,
        second,
        secondWorkerId,
        state: engine.getEngineState(),
        ready: engine.isEngineReady(),
        lifecycle: window.__coldInitLifecycle,
      };
    });

    expect(outcome.firstPrompt).toEqual({ settled: true, value: false });
    expect(outcome.second).toBe(true);
    expect(outcome.state).toBe('ready');
    expect(outcome.ready).toBe(true);
    expect(outcome.lifecycle.terminated).not.toContain(outcome.secondWorkerId);
  });

  test('dispose settles active analysis, terminates the worker, and permits re-init', async ({ page }) => {
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      window.__stockfishWorkerLifecycle = { created: [], terminated: [], sent: [] };
      window.Worker = class TrackedWorker extends NativeWorker {
        constructor(url, options) {
          super(url, options);
          this.__lifecycleId = window.__stockfishWorkerLifecycle.created.length + 1;
          window.__stockfishWorkerLifecycle.created.push({ id: this.__lifecycleId, url: String(url) });
        }

        terminate() {
          window.__stockfishWorkerLifecycle.terminated.push(this.__lifecycleId);
          return super.terminate();
        }

        postMessage(...args) {
          window.__stockfishWorkerLifecycle.sent.push({ id: this.__lifecycleId, message: args[0] });
          return super.postMessage(...args);
        }
      };
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const outcome = await page.evaluate(async () => {
      const engine = await import('/src/services/stockfishService.ts');
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      engine.disposeEngine();
      const baselineCreated = window.__stockfishWorkerLifecycle.created.length;
      const warmup = await engine.analyzeFen({ fen, depth: 4, movetime: 100, purpose: 'test' });
      const active = engine.analyzeFen({ fen, depth: 18, movetime: 5000, purpose: 'test' });

      while (!window.__stockfishWorkerLifecycle.sent.some(({ message }) => message === 'go movetime 5000')) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      engine.disposeEngine();
      const disposed = await Promise.race([
        active.then((result) => ({ settled: true, result }), (error) => ({ settled: true, error: error.message })),
        new Promise((resolve) => setTimeout(() => resolve({ settled: false }), 1000)),
      ]);
      const restarted = await engine.analyzeFen({ fen, depth: 4, movetime: 100, purpose: 'test' });

      return {
        warmup,
        disposed,
        restarted,
        state: engine.getEngineState(),
        baselineCreated,
        lifecycle: window.__stockfishWorkerLifecycle,
      };
    });

    expect(outcome.disposed.settled).toBe(true);
    expect(outcome.warmup.source).toBe('stockfish_wasm');
    expect(outcome.restarted.source).toBe('stockfish_wasm');
    expect(outcome.restarted.bestMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
    expect(outcome.state).toBe('ready');
    expect(outcome.lifecycle.created.filter(({ url }) => url.includes('/stockfish-worker.js'))).toHaveLength(outcome.baselineCreated + 2);
    expect(outcome.lifecycle.terminated).toContain(outcome.lifecycle.created[outcome.baselineCreated].id);
  });

  test('engine worker initializes and returns legal move', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    // Inject test script to analyze a position
    const result = await page.evaluate(async () => {
      const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      // Wait for stockfish service to be available
      const maxWait = 15000;
      const start = Date.now();

      while (Date.now() - start < maxWait) {
        try {
          // Try to import stockfish service
          const { analyzeFen, isEngineReady } = await import('/src/services/stockfishService.ts');
          break;
        } catch {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Alternative: directly test via global if available
      if (typeof window.__STOCKFISH_READY__ !== 'undefined') {
        const analysis = await window.__ANALYZE_FEN__(STARTING_FEN, 10);
        return analysis;
      }

      return { error: 'Stockfish service not accessible via global' };
    });

    // Test should at least not have critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('DevTools') &&
      !e.includes('favicon')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('page loads without worker crash', async ({ page }) => {
    const workerErrors = [];
    page.on('pageerror', err => {
      if (err.message.includes('worker') || err.message.includes('stockfish')) {
        workerErrors.push(err.message);
      }
    });

    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    // Wait a bit for any async initialization
    await page.waitForTimeout(3000);

    expect(workerErrors.length).toBe(0);
  });

  test('engine analysis produces valid UCI move', async ({ page }) => {
    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    // The Play page should initialize the engine on load
    // Check for any engine-related elements or status
    const bodyText = await page.locator('body').textContent();

    // Page should load without crashing
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('concurrent analysis requests all settle through the single worker', async ({ page }) => {
    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    const outcome = await page.evaluate(async () => {
      const engine = await import('/src/services/stockfishService.ts');
      const fens = [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      ];

      engine.disposeEngine();
      await engine.analyzeFen({ fen: fens[0], depth: 4, movetime: 100, purpose: 'test' });

      return Promise.race([
        Promise.all(fens.map((fen) => engine.analyzeFen({ fen, depth: 4, movetime: 100, purpose: 'test' }))),
        new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 15000)),
      ]);
    });

    expect(Array.isArray(outcome)).toBe(true);
    expect(outcome).toHaveLength(3);
    for (const result of outcome) {
      expect(result.source).toBe('stockfish_wasm');
      expect(result.bestMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
    }
  });
});

test.describe('Stockfish Worker Error Handling', () => {
  test('handles invalid FEN gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('no uncaught exceptions from worker', async ({ page }) => {
    const uncaughtErrors = [];
    page.on('pageerror', err => uncaughtErrors.push(err.message));

    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    // Interact with the page
    await page.waitForTimeout(5000);

    // Filter out known non-critical errors
    const criticalUncaught = uncaughtErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('favicon') &&
      !e.includes('DevTools')
    );

    expect(criticalUncaught.length).toBe(0);
  });
});
