import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4193';
const output = 'artifacts/tech-verification/PHASE_2/P2-T03/verifier/browser-contract.json';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => { if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`); });

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const result = await page.evaluate(async () => {
    const module = await import('/src/services/puzzleRecord.ts');
    const input = {
      schemaVersion: 'puzzle-record.v1', puzzleId: 'lichess-fixture-001', sourceId: 'lichess-puzzles',
      sourcePuzzleId: 'fixture-001', sourceUrl: 'https://database.lichess.org/lichess_db_puzzle.csv.zst',
      sourceVersion: '2026-08', sourcePublishedAt: '2026-08-02T00:00:00.000Z',
      retrievedAt: '2026-09-06T00:00:00.000Z', licenseId: 'CC0-1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', rawSha256: 'a'.repeat(64),
      fen: '7k/6Q1/6K1/8/8/8/8/8 w - - 0 1', moves: ['g6f7'], rating: 1200, themes: ['mateIn1'],
    };
    const sha256 = await module.calculatePuzzleRecordSha256(input);
    const reversed = Object.fromEntries(Object.entries(input).reverse());
    const reorderedSha256 = await module.calculatePuzzleRecordSha256(reversed);
    const valid = await module.validatePuzzleRecord({ ...input, recordSha256: sha256 });
    const tampered = await module.validatePuzzleRecord({ ...input, rating: 1201, recordSha256: sha256 });
    return {
      webCryptoSubtle: Boolean(globalThis.crypto?.subtle),
      sha256,
      reorderedSha256,
      deterministic: sha256 === reorderedSha256,
      validAccepted: valid.valid,
      tamperedRejected: !tampered.valid && tampered.errors.some((error) => error.code === 'mismatch'),
    };
  });
  const evidence = { verdict: 'PASS', target: 'Chromium/Vite browser transform', ...result, consoleErrors, pageErrors, networkErrors };
  if (!result.webCryptoSubtle || result.sha256 !== 'b29075acbedc3d20dbb3c3e77672c10f8bb2d86b387c28ea0e641a8cefd751db' ||
      !result.deterministic || !result.validAccepted || !result.tamperedRejected || consoleErrors.length || pageErrors.length || networkErrors.length) {
    evidence.verdict = 'FAIL';
  }
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  if (evidence.verdict !== 'PASS') process.exitCode = 1;
} finally {
  await browser.close();
}
