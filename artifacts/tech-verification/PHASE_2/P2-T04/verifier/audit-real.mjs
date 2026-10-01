import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Chess } from 'chess.js';
import { createZstdCsvLineStream, parseCsvLine, sha256File } from '../../../../../scripts/import-lichess-puzzles.mjs';
import { calculatePuzzleRecordSha256, validatePuzzleRecord } from '../../../../../src/services/puzzleRecord.ts';

const [input, freshDir, repeatDir, resumeDir] = process.argv.slice(2);
if (![input, freshDir, repeatDir, resumeDir].every(Boolean)) {
  throw new Error('Usage: node audit-real.mjs <official.zst> <fresh-dir> <repeat-dir> <resume-dir>');
}

const evidenceDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)));
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const readJsonl = async (file) => (await readFile(file, 'utf8')).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const normalizeFen = (fen) => fen.split(' ').slice(0, 4).join(' ');

const [records, manifest, repeatManifest, resumeRecords, resumeManifest] = await Promise.all([
  readJsonl(path.join(freshDir, 'accepted.jsonl')),
  readJson(path.join(freshDir, 'manifest.json')),
  readJson(path.join(repeatDir, 'manifest.json')),
  readJsonl(path.join(resumeDir, 'accepted.jsonl')),
  readJson(path.join(resumeDir, 'manifest.json')),
]);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const wanted = new Map(records.map((record) => [record.sourceId, record]));
const rawMatches = new Map();
let sourceRowsRead = 0;
for await (const line of createZstdCsvLineStream(createReadStream(input))) {
  sourceRowsRead += 1;
  const columns = parseCsvLine(line);
  const record = wanted.get(columns[0]);
  if (record) rawMatches.set(columns[0], { line, columns });
  if (rawMatches.size === wanted.size) break;
}

let replayed = 0;
let contractValidated = 0;
let rawRowsValidated = 0;
for (const record of records) {
  const validation = await validatePuzzleRecord(record);
  check(validation.valid, `${record.sourceId}: PuzzleRecord rejected ${JSON.stringify(validation.errors)}`);
  if (validation.valid) contractValidated += 1;
  const canonical = await calculatePuzzleRecordSha256(record);
  check(canonical === record.recordSha256, `${record.sourceId}: canonical checksum mismatch`);
  check(record.source === 'lichess', `${record.sourceId}: source is not lichess`);
  check(record.sourceId === record.sourcePuzzleId && record.puzzleId === `lichess-${record.sourceId}`, `${record.sourceId}: identity mismatch`);
  check(record.sourceUrl === `https://lichess.org/training/${record.sourceId}`, `${record.sourceId}: source URL mismatch`);
  check(record.licenseId === 'CC0-1.0' && record.licenseUrl === 'https://creativecommons.org/publicdomain/zero/1.0/', `${record.sourceId}: license mismatch`);
  check(record.rawSha256 === 'a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073', `${record.sourceId}: dataset checksum mismatch`);

  const raw = rawMatches.get(record.sourceId);
  check(Boolean(raw), `${record.sourceId}: source row not found`);
  if (raw) {
    const [id, sourceFen, sourceMoves, rating, ratingDeviation, popularity, plays, themes, gameUrl, openingTags, dailyDate] = raw.columns;
    check(raw.columns.length === 11 && id === record.sourceId, `${record.sourceId}: source schema mismatch`);
    check(digest(raw.line) === record.rawRecordSha256, `${record.sourceId}: raw-row checksum mismatch`);
    check(record.sourceFen === sourceFen, `${record.sourceId}: source FEN mismatch`);
    const moves = sourceMoves.trim().split(/\s+/);
    const sourceGame = new Chess(sourceFen);
    const preceding = moves[0];
    const applied = sourceGame.move({ from: preceding.slice(0, 2), to: preceding.slice(2, 4), promotion: preceding[4] });
    check(Boolean(applied), `${record.sourceId}: preceding move illegal`);
    check(record.precedingMove === preceding && record.fen === sourceGame.fen(), `${record.sourceId}: derived puzzle position mismatch`);
    check(JSON.stringify(record.moves) === JSON.stringify(moves.slice(1)), `${record.sourceId}: solution sequence mismatch`);
    check(Number(rating) === record.rating && Number(ratingDeviation) === record.ratingDeviation, `${record.sourceId}: rating fields mismatch`);
    check(Number(popularity) === record.popularity && Number(plays) === record.plays, `${record.sourceId}: numeric metadata mismatch`);
    check(JSON.stringify(themes.split(/\s+/)) === JSON.stringify(record.themes), `${record.sourceId}: themes mismatch`);
    check(record.gameUrl === gameUrl && JSON.stringify((openingTags || '').split(/\s+/).filter(Boolean)) === JSON.stringify(record.openingTags), `${record.sourceId}: URL/opening mismatch`);
    check((dailyDate || null) === record.dailyDate, `${record.sourceId}: daily date mismatch`);
    check(digest(`${normalizeFen(record.fen)}\n${record.moves.join(' ')}`) === record.normalizedPuzzleSha256, `${record.sourceId}: normalized checksum mismatch`);
    rawRowsValidated += 1;
  }

  const game = new Chess(record.fen);
  for (const uci of record.moves) {
    const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    check(Boolean(move), `${record.sourceId}: illegal replay move ${uci}`);
  }
  replayed += 1;
}

const sourceIds = records.map(({ sourceId }) => sourceId);
const normalizedKeys = records.map(({ normalizedPuzzleSha256 }) => normalizedPuzzleSha256);
const resumedIds = resumeRecords.map(({ sourceId }) => sourceId);
const resumedKeys = resumeRecords.map(({ normalizedPuzzleSha256 }) => normalizedPuzzleSha256);
const freshOutputSha = await sha256File(path.join(freshDir, 'accepted.jsonl'));
const freshQuarantineSha = await sha256File(path.join(freshDir, 'quarantine.jsonl'));
const inputSha = await sha256File(input);

check(records.length >= 500 && records.length <= 1000, `accepted count outside 500-1000: ${records.length}`);
check(manifest.parsedCount >= 3000, `parsed fewer than several thousand: ${manifest.parsedCount}`);
check(manifest.acceptedCount === records.length, 'manifest accepted count mismatch');
check(manifest.duplicateCount === 0 && manifest.quarantinedCount === 0, 'fresh import reported duplicates/quarantine');
check(new Set(sourceIds).size === records.length, 'accepted source IDs are not unique');
check(new Set(normalizedKeys).size === records.length, 'accepted normalized keys are not unique');
check(resumeRecords.length === records.length, 'resumed accepted count mismatch');
check(new Set(resumedIds).size === resumeRecords.length, 'resumed source IDs are not unique');
check(new Set(resumedKeys).size === resumeRecords.length, 'resumed normalized keys are not unique');
check(resumeManifest.checkpointResumeStatus === 'resumed', 'resume manifest not marked resumed');
check(manifest.contentIdentitySha256 === repeatManifest.contentIdentitySha256, 'repeat-run content identity mismatch');
check(manifest.contentIdentitySha256 === resumeManifest.contentIdentitySha256, 'resume content identity mismatch');
check(manifest.outputSha256 === freshOutputSha && manifest.quarantineSha256 === freshQuarantineSha, 'output hash mismatch');
check(inputSha === manifest.sourceSha256 && inputSha === 'a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073', 'official input hash mismatch');
check(manifest.inputCompressedSize === 304384407, 'official input byte size mismatch');
check(manifest.peakRss < 128 * 1024 * 1024 && repeatManifest.peakRss < 128 * 1024 * 1024 && resumeManifest.peakRss < 128 * 1024 * 1024, '128 MiB memory gate exceeded');

const result = {
  verdict: failures.length ? 'FAIL' : 'PASS',
  failures,
  source: { input, bytes: manifest.inputCompressedSize, sha256: inputSha, sourceRowsRead },
  fresh: { counts: { parsed: manifest.parsedCount, filtered: manifest.filteredCount, accepted: records.length, duplicate: manifest.duplicateCount, quarantined: manifest.quarantinedCount }, peakRss: manifest.peakRss },
  repeat: { contentIdentitySha256: repeatManifest.contentIdentitySha256, peakRss: repeatManifest.peakRss },
  resume: { records: resumeRecords.length, contentIdentitySha256: resumeManifest.contentIdentitySha256, peakRss: resumeManifest.peakRss, checkpointResumeStatus: resumeManifest.checkpointResumeStatus },
  validations: { contractValidated, canonicalChecksums: records.length, rawRowsValidated, solutionsReplayed: replayed, uniqueSourceIds: new Set(sourceIds).size, uniqueNormalizedKeys: new Set(normalizedKeys).size },
  hashes: { contentIdentitySha256: manifest.contentIdentitySha256, outputSha256: freshOutputSha, quarantineSha256: freshQuarantineSha },
};
await writeFile(path.join(evidenceDir, 'real-import-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
