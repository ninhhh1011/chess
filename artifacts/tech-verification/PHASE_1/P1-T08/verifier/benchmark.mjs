import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VERIFIER_BENCHMARK_URL || 'http://127.0.0.1:4219';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T08/verifier';
const previousMedianMs = 5365;
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = { console: [], page: [], network: [] };
const stockfishResponses = [];

page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', error => errors.page.push(error.message));
page.on('requestfailed', request => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
context.on('response', response => {
  if (/stockfish(?:-worker|\.js|\.wasm)/.test(response.url())) {
    stockfishResponses.push({ url: response.url(), status: response.status() });
  }
  if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`);
});

await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__p1t08Benchmark = { workers: [], searches: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      this.__workerId = window.__p1t08Benchmark.workers.length + 1;
      window.__p1t08Benchmark.workers.push({ id: this.__workerId, url: String(url) });
      this.addEventListener('message', event => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string') return;
        const search = window.__p1t08Benchmark.searches.findLast(item => item.workerId === this.__workerId && !item.bestmove);
        if (!search) return;
        if (line.startsWith('info ')) search.infoLines += 1;
        if (line.startsWith('bestmove ')) search.bestmove = line.split(/\s+/)[1];
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        if (message.startsWith('position fen ')) this.__fen = message.slice(13);
        if (message.startsWith('go ')) window.__p1t08Benchmark.searches.push({
          workerId: this.__workerId,
          fen: this.__fen,
          command: message,
          bestmove: null,
          infoLines: 0,
        });
      }
      return super.postMessage(message, ...rest);
    }
  };
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const benchmark = await page.evaluate(async previousMedian => {
    const [{ analyzeGame }, { RKLPC7MK_FIRST_40_PGN }, { parsePgn, replayPgn }, { isLegalUciMove }] = await Promise.all([
      import('/src/services/analysis/gameAnalyzer.ts'),
      import('/src/services/analysis/pgnFixtures.ts'),
      import('/src/services/analysis/pgnParser.ts'),
      import('/src/utils/chessMoveValidation.js'),
    ]);
    const parsed = parsePgn(RKLPC7MK_FIRST_40_PGN);
    const replay = replayPgn(RKLPC7MK_FIRST_40_PGN);
    if (!parsed.success || !replay || parsed.moves.length !== 80 || replay.moves.length !== 80) {
      throw new Error('rklpc7mk prefix is not exactly 40 full moves / 80 legal plies');
    }

    const runs = [];
    for (const label of ['cold', 'warm-1', 'warm-2']) {
      const searchStart = window.__p1t08Benchmark.searches.length;
      const workerStart = window.__p1t08Benchmark.workers.length;
      const started = performance.now();
      const result = await analyzeGame({
        gameId: `verifier-${label}`,
        pgn: RKLPC7MK_FIRST_40_PGN,
        playerSide: 'w',
        options: { maxDepth: 10, movetimeMs: 500, multiPv: 1, analyzeTopMistakes: 2 },
      });
      const durationMs = Math.round(performance.now() - started);
      const searches = window.__p1t08Benchmark.searches.slice(searchStart);
      const illegalSearches = searches.filter(search => !search.bestmove || !isLegalUciMove(search.fen, search.bestmove));
      const sourceViolations = result.analysis.filter(fact => fact.engine.source !== 'stockfish_wasm').length;
      const orderedPlies = result.analysis.every((fact, index) => fact.ply === index + 1);
      const exactCommands = searches.every(search => search.command === 'go movetime 500');
      if (!orderedPlies || result.analysis.length !== 80 || result.summary.totalMoves !== 80
        || result.analysis.at(-1)?.fenAfter !== replay.finalFen || result.topMistakes.length !== 2
        || searches.length !== 83 || illegalSearches.length || sourceViolations || !exactCommands) {
        throw new Error(`Benchmark contract failed: ${JSON.stringify({ label, facts: result.analysis.length,
          sourceViolations, searches: searches.length, illegalSearches: illegalSearches.length, exactCommands })}`);
      }
      runs.push({
        label,
        durationMs,
        analyzerDurationMs: result.durationMs,
        fullMoves: 40,
        plies: 80,
        facts: result.analysis.length,
        orderedFacts: orderedPlies,
        finalFen: replay.finalFen,
        topMistakes: result.topMistakes,
        pass1Positions: 81,
        pass2Positions: 2,
        workerSearches: searches.length,
        completedWorkerSearches: searches.filter(search => search.bestmove).length,
        searchesWithInfo: searches.filter(search => search.infoLines > 0).length,
        legalBestmoves: searches.length - illegalSearches.length,
        newWorkers: window.__p1t08Benchmark.workers.length - workerStart,
        sourceViolations,
        illegalMoves: illegalSearches.length,
        errors: 0,
        timeouts: 0,
        engineSource: result.engine.source,
      });
    }

    const durations = runs.map(run => run.durationMs).sort((a, b) => a - b);
    return {
      gameId: 'rklpc7mk',
      fixture: 'deliberately fixed first-40/full-move prefix of official 47-move game',
      pgnParse: 'PASS',
      legalReplay: 'PASS',
      finalFen: replay.finalFen,
      runs,
      medianMs: durations[1],
      maxMs: Math.max(...durations),
      previousMedianMs: previousMedian,
      changePercent: Number((((durations[1] - previousMedian) / previousMedian) * 100).toFixed(1)),
      workers: window.__p1t08Benchmark.workers,
    };
  }, previousMedianMs);

  const successfulAssets = stockfishResponses.filter(item => item.status < 400);
  if (Object.values(errors).some(items => items.length) || !benchmark.workers.length
    || !successfulAssets.some(item => item.url.includes('/stockfish-worker.js'))
    || !successfulAssets.some(item => item.url.includes('/stockfish/stockfish.js'))
    || !successfulAssets.some(item => item.url.includes('/stockfish/stockfish.wasm'))) {
    throw new Error(`Worker/network proof failed: ${JSON.stringify({ errors, stockfishResponses })}`);
  }

  const result = {
    verdict: 'PASS',
    harness: 'Vite browser module graph; native Chromium Worker; no mocks',
    baseUrl,
    ...benchmark,
    stockfishResponses,
    noFallbackProof: '83 legal worker bestmoves/run + 80/80 stockfish_wasm facts + worker/JS/WASM HTTP 200',
    errors,
  };
  await writeFile(`${outputDir}/benchmark.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(`${outputDir}/benchmark-failure.json`, `${JSON.stringify({
    error: error instanceof Error ? error.stack : String(error),
    trace: await page.evaluate(() => window.__p1t08Benchmark).catch(() => null),
    stockfishResponses,
    errors,
  }, null, 2)}\n`);
  throw error;
} finally {
  await context.close();
  await browser.close();
}
