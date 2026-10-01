import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Chess } from 'chess.js';
import { sha256File } from './import-lichess-puzzles.mjs';
import { validatePuzzleRecord } from '../src/services/puzzleRecord.ts';

export const CORPUS_VALIDATOR_VERSION = 'lichess-corpus-validator.v1';
export const LICHESS_THEME_TAXONOMY_SOURCE = 'https://github.com/lichess-org/lila/blob/50139702e66d67747e5ac0a6482b275f348f0dcd/modules/puzzle/src/main/PuzzleTheme.scala';
export const LICHESS_PUZZLE_THEMES = [
  'mix', 'advancedPawn', 'advantage', 'anastasiaMate', 'arabianMate', 'attackingF2F7',
  'attraction', 'backRankMate', 'balestraMate', 'blindSwineMate', 'triangleMate',
  'bishopEndgame', 'bodenMate', 'capturingDefender', 'collinearMove', 'castling',
  'clearance', 'cornerMate', 'crushing', 'defensiveMove', 'deflection', 'discoveredAttack',
  'discoveredCheck', 'doubleBishopMate', 'doubleCheck', 'dovetailMate', 'equality',
  'endgame', 'epauletteMate', 'enPassant', 'exposedKing', 'fork', 'hangingPiece',
  'hookMate', 'interference', 'intermezzo', 'kingsideAttack', 'killBoxMate',
  'pillsburysMate', 'morphysMate', 'vukovicMate', 'knightEndgame', 'long', 'master',
  'masterVsMaster', 'mate', 'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5',
  'smotheredMate', 'middlegame', 'oneMove', 'opening', 'operaMate', 'pawnEndgame',
  'pin', 'promotion', 'queenEndgame', 'queenRookEndgame', 'queensideAttack', 'quietMove',
  'rookEndgame', 'sacrifice', 'short', 'skewer', 'superGM', 'swallowstailMate',
  'trappedPiece', 'underPromotion', 'veryLong', 'xRayAttack', 'zugzwang', 'checkFirst',
];
const themeSet = new Set(LICHESS_PUZZLE_THEMES);
const optionsByName = {
  '--input': 'input',
  '--manifest': 'manifest',
  '--quarantine-output': 'quarantineOutput',
  '--report-output': 'reportOutput',
};

export function parseValidatorArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = optionsByName[argv[index]];
    if (!key) throw new Error(`Unknown option: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argv[index]}`);
    options[key] = value;
  }
  return options;
}

function requireOptions(options) {
  for (const field of ['input', 'manifest', 'quarantineOutput', 'reportOutput']) {
    if (!options[field]) throw new Error(`${field} is required`);
  }
  const paths = [options.input, options.manifest, options.quarantineOutput, options.reportOutput].map((value) => path.resolve(value));
  if (new Set(paths).size !== paths.length) throw new Error('Input, manifest, quarantine, and report paths must be distinct');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeFen(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

async function* linesFrom(filePath) {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  for await (const chunk of createReadStream(filePath)) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      yield buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);
    }
  }
  buffer += decoder.decode();
  if (buffer) yield buffer.replace(/\r$/, '');
}

async function atomicWriteJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, filePath);
}

function manifestGateErrors(manifest) {
  const expected = {
    manifestSchemaVersion: 'lichess-import-manifest.v1',
    corpusSchemaVersion: 'puzzle-record.v1',
    officialSourceUrl: 'https://database.lichess.org/lichess_db_puzzle.csv.zst',
    licenseId: 'CC0-1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    completionStatus: 'completed',
  };
  const errors = Object.entries(expected).flatMap(([field, value]) => manifest[field] === value ? [] : [{
    code: `manifest_${field}_mismatch`, detail: `Expected ${field}=${value}`,
  }]);
  if (!/^[a-f0-9]{64}$/i.test(manifest.sourceSha256 ?? '')) errors.push({
    code: 'manifest_source_checksum_invalid', detail: 'Expected sourceSha256 to be a SHA-256 digest',
  });
  return errors;
}

function validateLichessRecord(record, manifest, seenSourceIds, seenNormalizedKeys) {
  const reasons = [];
  const add = (code, detail) => reasons.push({ code, detail });
  if (record.source !== 'lichess' || !/^[A-Za-z0-9]{5}$/.test(record.sourceId)
      || record.sourcePuzzleId !== record.sourceId || record.puzzleId !== `lichess-${record.sourceId}`
      || record.sourceUrl !== `https://lichess.org/training/${record.sourceId}`) {
    add('provenance_mismatch', 'Lichess source ID and canonical URLs must agree');
  }
  if (record.licenseId !== 'CC0-1.0' || record.licenseUrl !== 'https://creativecommons.org/publicdomain/zero/1.0/') {
    add('license_mismatch', 'Expected official Lichess CC0-1.0 provenance');
  }
  if (record.rawSha256 !== manifest.sourceSha256) add('source_checksum_mismatch', 'Record source checksum differs from manifest');
  if (!/^[a-f0-9]{64}$/i.test(record.rawRecordSha256 ?? '')) add('raw_record_checksum_missing', 'Expected a per-source-row SHA-256');
  if (record.sourceVersion !== manifest.datasetVersion || record.sourcePublishedAt !== manifest.sourcePublishedAt
      || record.retrievedAt !== manifest.retrievedAt || record.importRunId !== manifest.importRunId
      || record.parserVersion !== manifest.parserVersion || record.validatorVersion !== manifest.validatorVersion) {
    add('manifest_record_mismatch', 'Record import metadata differs from manifest');
  }
  for (const theme of record.themes) {
    if (!themeSet.has(theme)) add('unknown_theme', theme);
  }
  const normalized = sha256(`${normalizeFen(record.fen)}\n${record.moves.join(' ')}`);
  if (record.normalizedPuzzleSha256 !== normalized) add('normalized_checksum_mismatch', `Expected ${normalized}`);
  if (seenSourceIds.has(record.sourceId)) add('duplicate_source_id', record.sourceId);
  if (seenNormalizedKeys.has(record.normalizedPuzzleSha256)) add('duplicate_normalized_puzzle', record.normalizedPuzzleSha256);
  seenSourceIds.add(record.sourceId);
  seenNormalizedKeys.add(record.normalizedPuzzleSha256);

  try {
    const sourceGame = new Chess(record.sourceFen);
    const preceding = sourceGame.move({
      from: record.precedingMove.slice(0, 2), to: record.precedingMove.slice(2, 4), promotion: record.precedingMove[4],
    });
    if (!preceding || sourceGame.fen() !== record.fen) add('source_replay_mismatch', 'Source FEN plus preceding move does not produce puzzle FEN');
  } catch (error) {
    add('source_replay_mismatch', error instanceof Error ? error.message : String(error));
  }

  let solutionMovesReplayed = 0;
  try {
    const game = new Chess(record.fen);
    if (record.sideToMove !== game.turn()) add('side_to_move_mismatch', `Expected ${game.turn()}`);
    for (const uci of record.moves) {
      const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (!move) throw new Error(`Illegal move ${uci}`);
      solutionMovesReplayed += 1;
    }
  } catch (error) {
    add('illegal_solution', error instanceof Error ? error.message : String(error));
  }
  return { reasons, solutionMovesReplayed };
}

export async function validateCorpus(options) {
  requireOptions(options);
  const manifest = JSON.parse(await readFile(options.manifest, 'utf8'));
  const gateErrors = manifestGateErrors(manifest);
  const actualOutputSha256 = await sha256File(options.input);
  if (manifest.outputSha256 !== actualOutputSha256) gateErrors.push({
    code: 'manifest_output_checksum_mismatch', detail: `Expected ${manifest.outputSha256}, received ${actualOutputSha256}`,
  });

  await mkdir(path.dirname(options.quarantineOutput), { recursive: true });
  const quarantine = await open(options.quarantineOutput, 'w');
  const counts = { lines: 0, valid: 0, quarantined: 0, totalReasons: 0, solutionMovesReplayed: 0 };
  const quarantineReasons = {};
  const themeDistribution = {};
  const seenSourceIds = new Set();
  const seenNormalizedKeys = new Set();
  try {
    for await (const line of linesFrom(options.input)) {
      counts.lines += 1;
      let record;
      let reasons = [];
      let solutionMovesReplayed = 0;
      try {
        record = JSON.parse(line);
        const contract = await validatePuzzleRecord(record);
        if (!contract.valid) {
          reasons.push({ code: 'contract_violation', detail: contract.errors.map(({ field, code }) => `${field}:${code}`).join(', ') });
        } else {
          ({ reasons, solutionMovesReplayed } = validateLichessRecord(record, manifest, seenSourceIds, seenNormalizedKeys));
        }
      } catch (error) {
        reasons.push({ code: 'malformed_json', detail: error instanceof Error ? error.message : String(error) });
      }
      counts.solutionMovesReplayed += solutionMovesReplayed;
      if (reasons.length) {
        counts.quarantined += 1;
        counts.totalReasons += reasons.length;
        for (const { code } of reasons) quarantineReasons[code] = (quarantineReasons[code] ?? 0) + 1;
        await quarantine.write(`${JSON.stringify({ line: counts.lines, sourceId: record?.sourceId ?? null, reasons })}\n`);
      } else {
        counts.valid += 1;
        for (const theme of record.themes) themeDistribution[theme] = (themeDistribution[theme] ?? 0) + 1;
      }
    }
  } finally {
    await quarantine.sync();
    await quarantine.close();
  }
  if (manifest.acceptedCount !== counts.lines) gateErrors.push({
    code: 'manifest_accepted_count_mismatch', detail: `Expected ${manifest.acceptedCount}, received ${counts.lines}`,
  });
  if (manifest.quarantinedCount !== 0 || manifest.duplicateCount !== 0) gateErrors.push({
    code: 'manifest_accepted_output_not_clean', detail: 'Accepted output manifest must report zero quarantine and duplicates',
  });
  const verdict = counts.quarantined === 0 && gateErrors.length === 0 ? 'PASS' : 'FAIL';
  const report = {
    reportSchemaVersion: 'lichess-corpus-validation-report.v1',
    validatorVersion: CORPUS_VALIDATOR_VERSION,
    themeTaxonomySource: LICHESS_THEME_TAXONOMY_SOURCE,
    verdict,
    exitCode: verdict === 'PASS' ? 0 : 2,
    input: path.basename(options.input),
    manifest: path.basename(options.manifest),
    inputSha256: actualOutputSha256,
    sourceSha256: manifest.sourceSha256,
    counts,
    uniqueSourceIds: seenSourceIds.size,
    uniqueNormalizedKeys: seenNormalizedKeys.size,
    quarantineReasons,
    themeDistribution,
    gateErrors,
  };
  await atomicWriteJson(options.reportOutput, report);
  return report;
}

async function main() {
  const report = await validateCorpus(parseValidatorArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
