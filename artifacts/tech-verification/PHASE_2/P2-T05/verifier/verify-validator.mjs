import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline';
import { Chess } from 'chess.js';
import { calculatePuzzleRecordSha256, validatePuzzleRecord } from '../../../../../src/services/puzzleRecord.ts';
import { LICHESS_PUZZLE_THEMES, validateCorpus } from '../../../../../scripts/validate-puzzle-corpus.mjs';
import { sha256File } from '../../../../../scripts/import-lichess-puzzles.mjs';

const repo = path.resolve(import.meta.dirname, '../../../../..');
const target = path.join(tmpdir(), 'chess-p2t04', 'mini-import-final-1');
const runRoot = path.join(tmpdir(), `chess-p2t05-verifier-${Date.now()}`);
const resultsPath = path.join(import.meta.dirname, 'validator-audit.json');
const officialSourceSha256 = 'a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const normalize = (record) => hash(`${record.fen.split(' ').slice(0, 4).join(' ')}\n${record.moves.join(' ')}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function resign(record) {
  const copy = structuredClone(record);
  delete copy.recordSha256;
  copy.recordSha256 = await calculatePuzzleRecordSha256(copy);
  return copy;
}

async function writeCase(name, recordsOrText, baseManifest, manifestPatch = {}) {
  const dir = path.join(runRoot, name);
  await mkdir(dir, { recursive: true });
  const input = path.join(dir, 'accepted.jsonl');
  const body = typeof recordsOrText === 'string'
    ? recordsOrText
    : `${recordsOrText.map((record) => JSON.stringify(record)).join('\n')}\n`;
  await writeFile(input, body);
  const manifest = {
    ...baseManifest,
    acceptedCount: typeof recordsOrText === 'string' ? body.split('\n').filter(Boolean).length : recordsOrText.length,
    outputSha256: hash(body),
    ...manifestPatch,
  };
  const manifestPath = path.join(dir, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return {
    input,
    manifest: manifestPath,
    quarantineOutput: path.join(dir, 'quarantine.jsonl'),
    reportOutput: path.join(dir, 'report.json'),
  };
}

function runCli(script, paths, extra = []) {
  return spawnSync(process.execPath, [script,
    '--input', paths.input, '--manifest', paths.manifest,
    '--quarantine-output', `${paths.quarantineOutput}.cli`,
    '--report-output', `${paths.reportOutput}.cli`, ...extra],
  { cwd: repo, encoding: 'utf8' });
}

async function independentRealAudit(inputPath, manifest) {
  const sourceIds = new Set();
  const normalizedKeys = new Set();
  const contentParts = [];
  let records = 0;
  let solutionMoves = 0;
  const themes = new Set(LICHESS_PUZZLE_THEMES);
  const inputStream = createReadStream(inputPath);
  const lines = readline.createInterface({ input: inputStream, crlfDelay: Infinity });
  for await (const line of lines) {
    records += 1;
    const record = JSON.parse(line);
    const contract = await validatePuzzleRecord(record);
    assert(contract.valid, `record ${records} contract failure: ${JSON.stringify(contract.errors)}`);
    assert(record.rawSha256 === officialSourceSha256, `record ${records} source digest`);
    assert(record.source === 'lichess' && record.sourceId === record.sourcePuzzleId, `record ${records} source identity`);
    assert(record.puzzleId === `lichess-${record.sourceId}`, `record ${records} internal identity`);
    assert(record.sourceUrl === `https://lichess.org/training/${record.sourceId}`, `record ${records} source URL`);
    assert(record.licenseId === 'CC0-1.0' && record.licenseUrl === 'https://creativecommons.org/publicdomain/zero/1.0/', `record ${records} license`);
    assert(record.sourceVersion === manifest.datasetVersion && record.sourcePublishedAt === manifest.sourcePublishedAt
      && record.retrievedAt === manifest.retrievedAt && record.importRunId === manifest.importRunId
      && record.parserVersion === manifest.parserVersion && record.validatorVersion === manifest.validatorVersion,
    `record ${records} manifest metadata`);
    assert(record.themes.every((theme) => themes.has(theme)), `record ${records} theme taxonomy`);
    assert(record.normalizedPuzzleSha256 === normalize(record), `record ${records} normalized checksum`);
    assert(!sourceIds.has(record.sourceId), `record ${records} duplicate source ID`);
    assert(!normalizedKeys.has(record.normalizedPuzzleSha256), `record ${records} duplicate normalized key`);
    sourceIds.add(record.sourceId);
    normalizedKeys.add(record.normalizedPuzzleSha256);
    contentParts.push(`${record.sourceId}:${record.normalizedPuzzleSha256}`);
    const source = new Chess(record.sourceFen);
    assert(source.move({ from: record.precedingMove.slice(0, 2), to: record.precedingMove.slice(2, 4), promotion: record.precedingMove[4] }), `record ${records} preceding move`);
    assert(source.fen() === record.fen, `record ${records} preceding-move FEN`);
    const game = new Chess(record.fen);
    assert(game.turn() === record.sideToMove, `record ${records} side to move`);
    for (const uci of record.moves) {
      assert(game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }), `record ${records} illegal ${uci}`);
      solutionMoves += 1;
    }
  }
  const config = {
    sourceUrl: manifest.officialSourceUrl,
    datasetVersion: manifest.datasetVersion,
    sourcePublishedAt: manifest.sourcePublishedAt,
    rawSha256: manifest.sourceSha256,
    ratingMin: manifest.filters.ratingMin,
    ratingMax: manifest.filters.ratingMax,
    themes: [...manifest.filters.themes].sort(),
    excludedThemes: [...manifest.filters.excludedThemes].sort(),
    popularityMin: manifest.filters.popularityMin,
    limit: manifest.filters.limit,
    importerVersion: manifest.importerVersion,
    parserVersion: manifest.parserVersion,
    validatorVersion: manifest.validatorVersion,
  };
  return {
    records,
    solutionMoves,
    uniqueSourceIds: sourceIds.size,
    uniqueNormalizedKeys: normalizedKeys.size,
    inputSha256: await sha256File(inputPath),
    contentIdentitySha256: hash(JSON.stringify({ config, records: contentParts })),
  };
}

async function main() {
  await mkdir(runRoot, { recursive: true });
  const inputPath = path.join(target, 'accepted.jsonl');
  const manifestPath = path.join(target, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const firstTwo = (await readFile(inputPath, 'utf8')).split(/\r?\n/).filter(Boolean).slice(0, 2).map(JSON.parse);
  const [base, other] = firstTwo;
  const cases = [];

  async function check(name, recordsOrText, expectedReasons = [], manifestPatch = {}, expectedGate = []) {
    const paths = await writeCase(name, recordsOrText, manifest, manifestPatch);
    const report = await validateCorpus(paths);
    const actualReasons = Object.keys(report.quarantineReasons).sort();
    const actualGate = report.gateErrors.map(({ code }) => code).sort();
    assert(JSON.stringify(actualReasons) === JSON.stringify([...expectedReasons].sort()), `${name} reasons ${JSON.stringify(actualReasons)}`);
    assert(JSON.stringify(actualGate) === JSON.stringify([...expectedGate].sort()), `${name} gates ${JSON.stringify(actualGate)}`);
    cases.push({ name, verdict: report.verdict, exitCode: report.exitCode, reasons: actualReasons, gateErrors: actualGate });
    return paths;
  }

  await check('valid', [base]);
  await check('malformed-json', '{bad json}\n', ['malformed_json']);
  await check('illegal-fen', [await resign({ ...base, fen: 'not a fen' })], ['contract_violation']);
  const illegalSolution = { ...base, moves: ['a1a2'] };
  illegalSolution.normalizedPuzzleSha256 = normalize(illegalSolution);
  await check('illegal-solution', [await resign(illegalSolution)], ['illegal_solution']);
  await check('side-mismatch', [await resign({ ...base, sideToMove: base.sideToMove === 'w' ? 'b' : 'w' })], ['side_to_move_mismatch']);
  await check('unknown-theme', [await resign({ ...base, themes: ['notOfficial'] })], ['unknown_theme']);
  await check('rating-contract', [await resign({ ...base, rating: -1 })], ['contract_violation']);
  await check('provenance', [await resign({ ...base, sourceUrl: 'https://lichess.org/training/other' })], ['provenance_mismatch']);
  await check('license', [await resign({ ...base, licenseId: 'MIT' })], ['license_mismatch']);
  await check('source-checksum', [await resign({ ...base, rawSha256: 'b'.repeat(64) })], ['source_checksum_mismatch']);
  await check('output-checksum', [base], [], { outputSha256: 'b'.repeat(64) }, ['manifest_output_checksum_mismatch']);
  await check('record-checksum', [{ ...base, rating: base.rating + 1 }], ['contract_violation']);
  await check('normalized-checksum', [await resign({ ...base, normalizedPuzzleSha256: 'b'.repeat(64) })], ['normalized_checksum_mismatch']);
  const duplicateId = await resign({ ...other, sourceId: base.sourceId, sourcePuzzleId: base.sourceId, puzzleId: base.puzzleId, sourceUrl: base.sourceUrl });
  await check('duplicate-source-id', [base, duplicateId], ['duplicate_source_id']);
  const duplicateNormalized = await resign({ ...base, sourceId: other.sourceId, sourcePuzzleId: other.sourceId, puzzleId: other.puzzleId, sourceUrl: other.sourceUrl });
  await check('duplicate-normalized', [base, duplicateNormalized], ['duplicate_normalized_puzzle']);
  await check('count-mismatch', [base], [], { acceptedCount: 2 }, ['manifest_accepted_count_mismatch']);
  await check('manifest-source-url', [base], [], { officialSourceUrl: 'https://example.invalid/data' }, ['manifest_officialSourceUrl_mismatch']);
  await check('manifest-source-sha-format', [await resign({ ...base, rawSha256: 'invalid' })], ['contract_violation'], { sourceSha256: 'invalid' }, ['manifest_source_checksum_invalid']);

  const invalidUtf8 = await writeCase('invalid-utf8', [base], manifest);
  await writeFile(invalidUtf8.input, Buffer.from([0xc3, 0x28]));
  let utf8Fatal = null;
  try { await validateCorpus(invalidUtf8); } catch (error) { utf8Fatal = String(error); }
  assert(utf8Fatal, 'invalid UTF-8 did not fail fatally');

  const validator = path.join(repo, 'scripts', 'validate-puzzle-corpus.mjs');
  const wrapper = path.join(repo, 'scripts', 'verify-corpus.cjs');
  const validPaths = await writeCase('cli-valid', [base], manifest);
  const invalidPaths = await writeCase('cli-invalid', '{bad json}\n', manifest);
  const fatalPaths = await writeCase('cli-fatal', [base], manifest);
  await writeFile(fatalPaths.manifest, '{bad');
  const cli = {
    pass: runCli(validator, validPaths).status,
    validationFail: runCli(validator, invalidPaths).status,
    fatal: runCli(validator, fatalPaths).status,
    unknownFlag: spawnSync(process.execPath, [validator, '--sample', '1'], { cwd: repo }).status,
    wrapperPass: runCli(wrapper, validPaths).status,
    wrapperValidationFail: runCli(wrapper, invalidPaths).status,
    wrapperFatal: runCli(wrapper, fatalPaths).status,
  };
  assert(JSON.stringify(cli) === JSON.stringify({ pass: 0, validationFail: 2, fatal: 1, unknownFlag: 1, wrapperPass: 0, wrapperValidationFail: 2, wrapperFatal: 1 }), `CLI exits ${JSON.stringify(cli)}`);

  const productionPaths = {
    input: inputPath,
    manifest: manifestPath,
    quarantineOutput: path.join(runRoot, 'actual-quarantine.jsonl'),
    reportOutput: path.join(runRoot, 'actual-report.json'),
  };
  const productionReport = await validateCorpus(productionPaths);
  const independent = await independentRealAudit(inputPath, manifest);
  assert(productionReport.verdict === 'PASS' && productionReport.counts.valid === 1000 && productionReport.counts.quarantined === 0, 'actual validator verdict/counts');
  assert(productionReport.counts.solutionMovesReplayed === 3732, 'actual validator move count');
  assert(productionReport.uniqueSourceIds === 1000 && productionReport.uniqueNormalizedKeys === 1000, 'actual validator uniqueness');
  assert(manifest.sourceSha256 === officialSourceSha256, 'official source SHA mismatch');
  assert(independent.records === 1000 && independent.solutionMoves === 3732, 'independent record/move count');
  assert(independent.uniqueSourceIds === 1000 && independent.uniqueNormalizedKeys === 1000, 'independent uniqueness');
  assert(independent.inputSha256 === manifest.outputSha256, 'independent output hash');
  assert(independent.contentIdentitySha256 === manifest.contentIdentitySha256, 'independent content identity');

  const result = {
    verdict: 'PASS',
    generatedAt: new Date().toISOString(),
    runRoot,
    taxonomy: { count: LICHESS_PUZZLE_THEMES.length, source: 'https://github.com/lichess-org/lila/blob/50139702e66d67747e5ac0a6482b275f348f0dcd/modules/puzzle/src/main/PuzzleTheme.scala' },
    cases,
    invalidUtf8: { fatal: true, error: utf8Fatal },
    cli,
    actual: { report: productionReport, independent, manifest },
  };
  await writeFile(resultsPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch(async (error) => {
  const failure = { verdict: 'FAIL', generatedAt: new Date().toISOString(), runRoot, error: error instanceof Error ? error.stack : String(error) };
  await mkdir(path.dirname(resultsPath), { recursive: true });
  await writeFile(resultsPath, `${JSON.stringify(failure, null, 2)}\n`);
  process.stderr.write(`${failure.error}\n`);
  process.exitCode = 1;
});
