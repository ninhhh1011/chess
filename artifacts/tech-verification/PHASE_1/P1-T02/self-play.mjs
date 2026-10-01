import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { BOT_ELO_LEVELS } from '../../../../src/data/botLevels.js';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4177';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T02';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const runs = [];
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];

try {
  for (const [index, level] of BOT_ELO_LEVELS.entries()) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`${level.elo}: ${message.text()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(`${level.elo}: ${error.message}`));
    page.on('requestfailed', (request) => networkErrors.push(`${level.elo}: ${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', (response) => {
      if (response.status() >= 400) networkErrors.push(`${level.elo}: ${response.status()} ${response.url()}`);
    });

    await page.addInitScript(() => {
      localStorage.setItem('chess-app-onboarding', 'true');
      const NativeWorker = window.Worker;
      window.__difficultyEvidence = { commands: [], ready: [], searches: [], uciOptions: [] };
      window.Worker = class extends NativeWorker {
        constructor(workerUrl, options) {
          super(workerUrl, options);
          this.__isStockfish = String(workerUrl).includes('stockfish-worker.js');
          if (this.__isStockfish) {
            this.addEventListener('message', (event) => {
              const message = event.data;
              if (message?.type === 'ready') window.__difficultyEvidence.ready.push(message);
              if (message?.type !== 'output' || typeof message.data !== 'string') return;
              if (message.data.startsWith('option name ')) window.__difficultyEvidence.uciOptions.push(message.data);
              const search = window.__difficultyEvidence.searches.findLast((item) => !item.bestmove);
              if (!search) return;
              const depth = message.data.match(/\bdepth (\d+)/);
              const time = message.data.match(/\btime (\d+)/);
              if (depth) search.depth = Math.max(search.depth, Number(depth[1]));
              if (time) search.engineTimeMs = Number(time[1]);
              if (message.data.startsWith('bestmove')) {
                search.bestmove = message.data.split(/\s+/)[1];
                search.wallTimeMs = Math.round(performance.now() - search.startedAt);
                search.source = 'stockfish_wasm';
              }
            });
          }
        }

        postMessage(message, ...rest) {
          if (this.__isStockfish && typeof message === 'string') {
            window.__difficultyEvidence.commands.push(message);
            if (message.startsWith('go ')) {
              window.__difficultyEvidence.searches.push({
                command: message,
                startedAt: performance.now(),
                depth: 0,
                engineTimeMs: null,
                wallTimeMs: null,
                bestmove: null,
                source: null,
              });
            }
          }
          return super.postMessage(message, ...rest);
        }
      };
    });

    await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
    const difficultyButtons = page.locator('div[aria-label] button');
    if (await difficultyButtons.count() !== 4) throw new Error('Expected four displayed difficulty buttons');
    const displayedLabel = await difficultyButtons.nth(index).getAttribute('aria-label');
    await difficultyButtons.nth(index).click();
    await page.locator('button[aria-label]').last().click();
    const searchStart = await page.evaluate(() => window.__difficultyEvidence.searches.length);
    const expectedGo = `go movetime ${level.movetime}`;
    await page.locator('.pt-2 button').click();
    await page.locator('.chess-board-container').waitFor({ state: 'visible' });
    await page.waitForFunction(
      ({ start, command }) => window.__difficultyEvidence.searches
        .slice(start)
        .some((search) => search.command === command && search.bestmove),
      { start: searchStart, command: expectedGo },
      { timeout: 30000 }
    );

    const evidence = await page.evaluate(({ searchStart, expectedGo }) => ({
      commands: window.__difficultyEvidence.commands,
      search: window.__difficultyEvidence.searches
        .slice(searchStart)
        .find((item) => item.command === expectedGo && item.bestmove),
      ready: window.__difficultyEvidence.ready,
      uciOptions: window.__difficultyEvidence.uciOptions,
    }), { searchStart, expectedGo });
    const targetGoIndex = evidence.commands.indexOf(expectedGo);
    const previousGoIndex = evidence.commands.findLastIndex(
      (command, commandIndex) => commandIndex < targetGoIndex && command.startsWith('go ')
    );
    evidence.allCommands = evidence.commands;
    evidence.commands = evidence.commands.slice(previousGoIndex + 1, targetGoIndex + 1);
    const eloOption = evidence.uciOptions.find((line) => line.startsWith('option name UCI_Elo '));
    const eloRange = eloOption?.match(/min (\d+) max (\d+)/)?.slice(1).map(Number);
    if (!eloRange) throw new Error('Stockfish did not advertise its UCI_Elo range');
    const invalidEloCommand = evidence.allCommands.find((command) => {
      if (!command.startsWith('setoption name UCI_Elo value ')) return false;
      const value = Number(command.split(' ').at(-1));
      return value < eloRange[0] || value > eloRange[1];
    });
    if (invalidEloCommand) throw new Error(`Out-of-range engine command: ${invalidEloCommand}`);
    const move = evidence.search.bestmove;
    const game = new Chess();
    const legal = Boolean(game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] }));
    const expectedMode = `setoption name UCI_LimitStrength value ${!level.useSkillLevelOnly}`;
    const expectedStrength = level.useSkillLevelOnly
      ? `setoption name Skill Level value ${level.skillLevel}`
      : `setoption name UCI_Elo value ${level.elo}`;

    if (!legal || evidence.search.source !== 'stockfish_wasm') throw new Error(`Invalid engine move at ${level.elo}`);
    for (const command of [expectedMode, expectedStrength, expectedGo]) {
      if (!evidence.commands.includes(command)) throw new Error(`Missing ${command} at ${level.elo}: ${JSON.stringify(evidence.commands)}`);
    }
    if (level.useSkillLevelOnly && evidence.commands.some((command) => command.startsWith('setoption name UCI_Elo value'))) {
      throw new Error(`Unexpected UCI_Elo at ${level.elo}`);
    }

    await page.screenshot({ path: `${outputDir}/${level.elo}.png`, fullPage: true });
    runs.push({ displayedLabel, config: level, legal, ...evidence });
    await page.close();
  }

  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }
  const result = { verdict: 'PASS', browser: 'Chromium', buildUrl: baseUrl, runs, consoleErrors, pageErrors, networkErrors };
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
