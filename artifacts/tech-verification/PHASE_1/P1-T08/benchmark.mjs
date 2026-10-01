import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.BENCHMARK_BASE_URL || 'http://127.0.0.1:4188';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T08';
const previousMedianMs = 5365;
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = { console: [], page: [], network: [] };

page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', error => errors.page.push(error.message));
page.on('requestfailed', request => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', response => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });

await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__benchmarkTrace = { searches: [], workerUrls: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      window.__benchmarkTrace.workerUrls.push(String(url));
      this.addEventListener('message', event => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
        const search = window.__benchmarkTrace.searches.findLast(item => !item.bestmove);
        if (search) search.bestmove = line.split(/\s+/)[1];
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        if (message.startsWith('position fen ')) this.__fen = message.slice(13);
        if (message.startsWith('go ')) window.__benchmarkTrace.searches.push({
          fen: this.__fen,
          command: message,
          bestmove: null,
        });
      }
      return super.postMessage(message, ...rest);
    }
  };
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const benchmark = await page.evaluate(async previousMedian => {
    const [{ analyzeGame }, { RKLPC7MK_FIRST_40_PGN }, { parsePgn, replayPgn }] = await Promise.all([
      import('/src/services/analysis/gameAnalyzer.ts'),
      import('/src/services/analysis/pgnFixtures.ts'),
      import('/src/services/analysis/pgnParser.ts'),
    ]);

    const parsed = parsePgn(RKLPC7MK_FIRST_40_PGN);
    const replay = replayPgn(RKLPC7MK_FIRST_40_PGN);
    if (!parsed.success || !replay || parsed.moves.length !== 80 || replay.moves.length !== 80) {
      throw new Error('The fixed rklpc7mk prefix is not exactly 80 legal plies');
    }

    const runs = [];
    for (const label of ['cold', 'warm-1', 'warm-2']) {
      const searchStart = window.__benchmarkTrace.searches.length;
      const started = performance.now();
      const result = await analyzeGame({
        gameId: `p1-t08-${label}`,
        pgn: RKLPC7MK_FIRST_40_PGN,
        playerSide: 'w',
        options: { maxDepth: 10, movetimeMs: 500, multiPv: 1, analyzeTopMistakes: 2 },
      });
      const durationMs = Math.round(performance.now() - started);
      const searches = window.__benchmarkTrace.searches.slice(searchStart);
      const incompleteSearches = searches.filter(search => !search.bestmove).length;
      const sourceViolations = result.analysis.filter(fact => fact.engine.source !== 'stockfish_wasm').length;
      const expectedPlies = Array.from({ length: 80 }, (_, index) => index + 1);
      if (JSON.stringify(result.analysis.map(fact => fact.ply)) !== JSON.stringify(expectedPlies)
        || result.analysis.length !== 80
        || result.summary.totalMoves !== 80
        || result.analysis.at(-1)?.fenAfter !== replay.finalFen
        || sourceViolations
        || incompleteSearches
        || searches.length !== 83
        || result.topMistakes.length !== 2) {
        throw new Error(`Benchmark contract failed: ${JSON.stringify({
          label,
          facts: result.analysis.length,
          totalMoves: result.summary.totalMoves,
          sourceViolations,
          incompleteSearches,
          searches: searches.length,
          topMistakes: result.topMistakes,
        })}`);
      }
      runs.push({
        label,
        durationMs,
        analyzerDurationMs: result.durationMs,
        fullMoves: 40,
        plies: parsed.moves.length,
        facts: result.analysis.length,
        finalFen: replay.finalFen,
        topMistakes: result.topMistakes,
        pass1Positions: 81,
        pass2Positions: result.topMistakes.length,
        workerSearches: searches.length,
        completedWorkerSearches: searches.length - incompleteSearches,
        engineSource: result.engine.source,
        sourceViolations,
        illegalMoves: 0,
        errors: 0,
        timeouts: 0,
      });
    }

    const durations = runs.map(run => run.durationMs).sort((a, b) => a - b);
    const medianMs = durations[1];
    return {
      gameId: 'rklpc7mk',
      fixture: 'deliberately fixed first-40/full-move prefix',
      pgnParse: 'PASS',
      legalReplay: 'PASS',
      finalFen: replay.finalFen,
      runs,
      medianMs,
      maxMs: Math.max(...durations),
      previousMedianMs: previousMedian,
      changePercent: Number((((medianMs - previousMedian) / previousMedian) * 100).toFixed(1)),
      workerUrls: [...new Set(window.__benchmarkTrace.workerUrls)],
    };
  }, previousMedianMs);

  if (errors.console.length || errors.page.length || errors.network.length) {
    throw new Error(JSON.stringify(errors));
  }

  const result = {
    verdict: 'PASS',
    harness: 'Vite browser module graph with real Worker; no mocks',
    baseUrl,
    ...benchmark,
    errors,
  };
  await writeFile(`${outputDir}/benchmark.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(errors.console, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(errors.page, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(errors.network, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
