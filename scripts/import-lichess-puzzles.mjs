import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  stat,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough, Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import { createZstdDecompress } from 'node:zlib';
import { Chess } from 'chess.js';
import {
  calculatePuzzleRecordSha256,
  validatePuzzleRecord,
} from '../src/services/puzzleRecord.ts';

export const APPROVED_SOURCE_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
export const LICHESS_LICENSE = {
  id: 'CC0-1.0',
  url: 'https://creativecommons.org/publicdomain/zero/1.0/',
};
export const IMPORTER_VERSION = 'lichess-importer.v1';
export const PARSER_VERSION = 'lichess-csv.v1';
export const VALIDATOR_VERSION = 'puzzle-record.v1';
const EXPECTED_HEADER = 'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate';
const booleanOptions = new Set(['resume', 'dryRun', 'validationOnly']);
const optionNames = {
  '--source-url': 'sourceUrl',
  '--input': 'input',
  '--output': 'output',
  '--quarantine-output': 'quarantineOutput',
  '--manifest-output': 'manifestOutput',
  '--checkpoint': 'checkpoint',
  '--resume': 'resume',
  '--limit': 'limit',
  '--rating-min': 'ratingMin',
  '--rating-max': 'ratingMax',
  '--themes': 'themes',
  '--exclude-themes': 'excludedThemes',
  '--popularity-min': 'popularityMin',
  '--batch-size': 'batchSize',
  '--dry-run': 'dryRun',
  '--validation-only': 'validationOnly',
  '--abort-after': 'abortAfter',
  '--dataset-version': 'datasetVersion',
  '--source-published-at': 'sourcePublishedAt',
};

export function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = optionNames[argv[index]];
    if (!key) throw new Error(`Unknown option: ${argv[index]}`);
    if (booleanOptions.has(key)) {
      options[key] = true;
      continue;
    }
    const value = argv[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${argv[index - 1]}`);
    if (['limit', 'ratingMin', 'ratingMax', 'popularityMin', 'batchSize', 'abortAfter'].includes(key)) {
      options[key] = Number(value);
    } else if (['themes', 'excludedThemes'].includes(key)) {
      options[key] = value.split(',').map((item) => item.trim()).filter(Boolean);
    } else {
      options[key] = value;
    }
  }
  return options;
}

export function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('Malformed CSV quoting');
  fields.push(field);
  return fields;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function splitSpace(value) {
  return value.trim() ? value.trim().split(/\s+/) : [];
}

function applyUci(game, uci) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error(`Invalid UCI move: ${uci}`);
  const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  if (!move) throw new Error(`Illegal UCI move: ${uci}`);
}

function normalizeFen(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

export async function mapLichessRow(line, context) {
  const fields = parseCsvLine(line);
  if (fields.length !== 11) throw new Error(`Malformed row: expected 11 fields, received ${fields.length}`);
  const [sourceId, sourceFen, moveText, ratingText, deviationText, popularityText, playsText, themeText, gameUrl, openingText, dailyText] = fields;
  if (!sourceId || !/^[A-Za-z0-9]+$/.test(sourceId)) throw new Error('Malformed source puzzle ID');
  const rating = Number(ratingText);
  const ratingDeviation = Number(deviationText);
  const popularity = Number(popularityText);
  const plays = Number(playsText);
  if (![rating, ratingDeviation, popularity, plays].every(Number.isInteger)) throw new Error('Malformed numeric field');
  const sourceMoves = splitSpace(moveText);
  if (sourceMoves.length < 2) throw new Error('Lichess row must contain a preceding move and a solution');

  const game = new Chess(sourceFen);
  const precedingMove = sourceMoves[0];
  applyUci(game, precedingMove);
  const fen = game.fen();
  const sideToMove = game.turn();
  const moves = sourceMoves.slice(1);
  for (const move of moves) applyUci(game, move);

  const rawRecordSha256 = sha256(line);
  const normalizedPuzzleSha256 = sha256(`${normalizeFen(fen)}\n${moves.join(' ')}`);
  const input = {
    schemaVersion: 'puzzle-record.v1',
    puzzleId: `lichess-${sourceId}`,
    sourceId,
    sourcePuzzleId: sourceId,
    sourceUrl: `https://lichess.org/training/${sourceId}`,
    sourceVersion: context.datasetVersion,
    sourcePublishedAt: context.sourcePublishedAt,
    retrievedAt: context.retrievedAt,
    licenseId: LICHESS_LICENSE.id,
    licenseUrl: LICHESS_LICENSE.url,
    rawSha256: context.rawSha256,
    fen,
    moves,
    rating,
    themes: splitSpace(themeText),
    source: 'lichess',
    sourceFen,
    precedingMove,
    sideToMove,
    ratingDeviation,
    popularity,
    plays,
    openingTags: splitSpace(openingText),
    gameUrl,
    dailyDate: dailyText ? Number(dailyText) : null,
    importRunId: context.importRunId,
    rawRecordSha256,
    normalizedPuzzleSha256,
    parserVersion: PARSER_VERSION,
    validatorVersion: VALIDATOR_VERSION,
    validationStatus: 'validated',
  };
  const record = { ...input, recordSha256: await calculatePuzzleRecordSha256(input) };
  const validation = await validatePuzzleRecord(record);
  if (!validation.valid) throw new Error(`PuzzleRecord validation failed: ${validation.errors.map(({ field, code }) => `${field}:${code}`).join(', ')}`);
  return record;
}

class StripLeadingSkippableFrames extends Transform {
  #buffer = Buffer.alloc(0);
  #ready = false;

  _transform(chunk, _encoding, callback) {
    if (this.#ready) return callback(null, chunk);
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    while (this.#buffer.length >= 8) {
      const magic = this.#buffer.readUInt32LE(0);
      if (magic < 0x184d2a50 || magic > 0x184d2a5f) {
        this.#ready = true;
        const output = this.#buffer;
        this.#buffer = Buffer.alloc(0);
        return callback(null, output);
      }
      const frameLength = 8 + this.#buffer.readUInt32LE(4);
      if (this.#buffer.length < frameLength) return callback();
      this.#buffer = this.#buffer.subarray(frameLength);
    }
    callback();
  }

  _flush(callback) {
    if (!this.#ready && this.#buffer.length) callback(new Error('Truncated Zstandard frame header'));
    else callback();
  }
}

class Utf8DecodeTransform extends Transform {
  #decoder = new TextDecoder('utf-8', { fatal: true });

  _transform(chunk, _encoding, callback) {
    try {
      callback(null, this.#decoder.decode(chunk, { stream: true }));
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    try {
      callback(null, this.#decoder.decode());
    } catch (error) {
      callback(error);
    }
  }
}

export async function* createZstdCsvLineStream(input) {
  if (typeof createZstdDecompress !== 'function') throw new Error('Node Zstandard streaming API is unavailable');
  const output = new PassThrough();
  const completion = pipeline(input, new StripLeadingSkippableFrames(), createZstdDecompress(), new Utf8DecodeTransform(), output);
  let buffer = '';
  let completed = false;
  try {
    for await (const chunk of output) {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        yield buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
      }
    }
    if (buffer) yield buffer.replace(/\r$/, '');
    await completion;
    completed = true;
  } finally {
    if (!completed) {
      input.destroy();
      output.destroy();
      await completion.catch(() => {});
    }
  }
}

export async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function stableConfig(options, rawSha256) {
  return {
    sourceUrl: APPROVED_SOURCE_URL,
    datasetVersion: options.datasetVersion,
    sourcePublishedAt: options.sourcePublishedAt,
    rawSha256,
    ratingMin: options.ratingMin,
    ratingMax: options.ratingMax,
    themes: [...options.themes].sort(),
    excludedThemes: [...options.excludedThemes].sort(),
    popularityMin: options.popularityMin ?? null,
    limit: options.limit,
    importerVersion: IMPORTER_VERSION,
    parserVersion: PARSER_VERSION,
    validatorVersion: VALIDATOR_VERSION,
  };
}

function passesFilters(fields, options) {
  const rating = Number(fields[3]);
  const popularity = Number(fields[5]);
  const themes = new Set(splitSpace(fields[7]));
  if (rating < options.ratingMin || rating > options.ratingMax) return false;
  if (options.popularityMin !== undefined && popularity < options.popularityMin) return false;
  if (options.themes.length && !options.themes.some((theme) => themes.has(theme))) return false;
  if (options.excludedThemes.some((theme) => themes.has(theme))) return false;
  return true;
}

async function atomicWriteJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, filePath);
}

async function loadCheckpoint(filePath) {
  let value;
  try {
    value = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid checkpoint: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (value?.checkpointSchemaVersion !== 'lichess-import-checkpoint.v1') throw new Error('Invalid checkpoint schema');
  return value;
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function rebuildResumeState(filePath, sourceIds, normalizedKeys, contentParts) {
  if (!await pathExists(filePath)) return;
  let buffer = '';
  for await (const chunk of createReadStream(filePath, { encoding: 'utf8' })) {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const record = JSON.parse(line);
      sourceIds.add(record.sourceId);
      normalizedKeys.add(record.normalizedPuzzleSha256);
      contentParts.push(`${record.sourceId}:${record.normalizedPuzzleSha256}`);
    }
  }
  if (buffer.trim()) throw new Error('Accepted partial output ends with an incomplete record');
}

function validateOptions(options) {
  if (!options.input) throw new Error('runImport requires a local official .zst input');
  for (const field of ['datasetVersion', 'sourcePublishedAt', 'retrievedAt']) {
    if (!options[field]) throw new Error(`${field} is required`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.datasetVersion) || Number.isNaN(Date.parse(`${options.datasetVersion}T00:00:00Z`))) {
    throw new Error('datasetVersion must be a valid YYYY-MM-DD date');
  }
  for (const field of ['sourcePublishedAt', 'retrievedAt']) {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(options[field]) || Number.isNaN(Date.parse(options[field]))) {
      throw new Error(`${field} must be a valid ISO 8601 timestamp`);
    }
  }
  for (const field of ['ratingMin', 'ratingMax', 'limit', 'batchSize']) {
    if (!Number.isInteger(options[field]) || options[field] < 0) throw new Error(`${field} must be a non-negative integer`);
  }
  if (options.limit === 0 || options.batchSize === 0) throw new Error('limit and batchSize must be positive');
  if (options.ratingMin > options.ratingMax) throw new Error('ratingMin cannot exceed ratingMax');
  for (const field of ['output', 'quarantineOutput', 'manifestOutput', 'checkpoint']) {
    if (!options.dryRun && !options.validationOnly && !options[field]) throw new Error(`${field} is required`);
  }
}

export async function runImport(rawOptions) {
  const options = {
    ratingMin: 0,
    ratingMax: 4000,
    themes: [],
    excludedThemes: [],
    limit: 1000,
    batchSize: 100,
    resume: false,
    dryRun: false,
    validationOnly: false,
    ...rawOptions,
  };
  validateOptions(options);
  const inputStats = await stat(options.input);
  const rawSha256 = options.rawSha256 ?? await sha256File(options.input);
  const config = stableConfig(options, rawSha256);
  const configSha256 = sha256(JSON.stringify(config));
  const importRunId = `lichess-${sha256(`${rawSha256}:${configSha256}`).slice(0, 24)}`;
  const context = {
    datasetVersion: options.datasetVersion,
    sourcePublishedAt: options.sourcePublishedAt,
    retrievedAt: options.retrievedAt,
    rawSha256,
    importRunId,
  };
  const mutating = !options.dryRun && !options.validationOnly;
  const acceptedPartial = options.output ? `${options.output}.partial` : undefined;
  const quarantinePartial = options.quarantineOutput ? `${options.quarantineOutput}.partial` : undefined;
  const counts = { parsed: 0, filtered: 0, accepted: 0, invalid: 0, quarantined: 0, duplicate: 0 };
  const sourceIds = new Set();
  const normalizedKeys = new Set();
  const contentParts = [];
  const memorySamples = [];
  let peakRss = process.memoryUsage().rss;
  let sourceRowsCommitted = 0;
  let acceptedBytes = 0;
  let quarantineBytes = 0;
  let checkpointResumeStatus = options.resume ? 'resumed' : 'fresh';
  let checkpointData;

  if (mutating) {
    for (const target of [options.output, options.quarantineOutput, options.manifestOutput, options.checkpoint]) {
      await mkdir(path.dirname(target), { recursive: true });
    }
    if (options.resume) {
      checkpointData = await loadCheckpoint(options.checkpoint);
      if (checkpointData.configSha256 !== configSha256 || checkpointData.rawSha256 !== rawSha256 || checkpointData.datasetVersion !== options.datasetVersion) {
        throw new Error('Checkpoint does not match dataset or importer configuration');
      }
      if (!checkpointData.retrievedAt) throw new Error('Checkpoint is missing retrievedAt provenance');
      const expectedPaths = Object.fromEntries(['output', 'quarantineOutput', 'manifestOutput'].map((field) => [field, path.resolve(options[field])]));
      if (JSON.stringify(checkpointData.paths) !== JSON.stringify(expectedPaths)) throw new Error('Checkpoint output paths do not match resume paths');
      options.retrievedAt = checkpointData.retrievedAt;
      context.retrievedAt = checkpointData.retrievedAt;
      Object.assign(counts, checkpointData.counts);
      sourceRowsCommitted = checkpointData.sourceRowsCommitted;
      acceptedBytes = checkpointData.acceptedBytes;
      quarantineBytes = checkpointData.quarantineBytes;
      await truncate(acceptedPartial, acceptedBytes);
      await truncate(quarantinePartial, quarantineBytes);
      await rebuildResumeState(acceptedPartial, sourceIds, normalizedKeys, contentParts);
    } else {
      for (const target of [options.output, options.quarantineOutput, options.manifestOutput, options.checkpoint, acceptedPartial, quarantinePartial]) {
        if (await pathExists(target)) throw new Error(`Refusing to overwrite existing output: ${target}`);
      }
      await writeFile(acceptedPartial, '');
      await writeFile(quarantinePartial, '');
    }
  }

  const acceptedHandle = mutating ? await open(acceptedPartial, 'a') : null;
  const quarantineHandle = mutating ? await open(quarantinePartial, 'a') : null;
  let acceptedBatch = [];
  let quarantineBatch = [];
  let abortRequested = false;
  let signalName = null;
  const requestAbort = (signal) => {
    abortRequested = true;
    signalName = signal;
  };
  const onSigint = () => requestAbort('SIGINT');
  const onSigterm = () => requestAbort('SIGTERM');
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  const flush = async () => {
    if (!mutating || (!acceptedBatch.length && !quarantineBatch.length)) return;
    const acceptedText = acceptedBatch.join('');
    const quarantineText = quarantineBatch.join('');
    if (acceptedText) {
      await acceptedHandle.write(acceptedText);
      acceptedBytes += Buffer.byteLength(acceptedText);
    }
    if (quarantineText) {
      await quarantineHandle.write(quarantineText);
      quarantineBytes += Buffer.byteLength(quarantineText);
    }
    await Promise.all([acceptedHandle.sync(), quarantineHandle.sync()]);
    acceptedBatch = [];
    quarantineBatch = [];
    await atomicWriteJson(options.checkpoint, {
      checkpointSchemaVersion: 'lichess-import-checkpoint.v1',
      datasetVersion: options.datasetVersion,
      sourceUrl: APPROVED_SOURCE_URL,
      rawSha256,
      importerVersion: IMPORTER_VERSION,
      parserVersion: PARSER_VERSION,
      validatorVersion: VALIDATOR_VERSION,
      configSha256,
      importRunId,
      retrievedAt: context.retrievedAt,
      paths: Object.fromEntries(['output', 'quarantineOutput', 'manifestOutput'].map((field) => [field, path.resolve(options[field])])),
      sourceRowsCommitted,
      counts,
      parsedCount: counts.parsed,
      filteredCount: counts.filtered,
      acceptedCount: counts.accepted,
      quarantineCount: counts.quarantined,
      duplicateCount: counts.duplicate,
      acceptedBytes,
      quarantineBytes,
      updatedAt: new Date().toISOString(),
      status: abortRequested ? 'interrupted' : 'running',
    });
  };

  const startedAt = Date.now();
  try {
    let rowNumber = 0;
    let headerSeen = false;
    for await (const line of createZstdCsvLineStream(createReadStream(options.input))) {
      if (!headerSeen) {
        if (line.replace(/^\uFEFF/, '') !== EXPECTED_HEADER) throw new Error('Unexpected Lichess CSV header');
        headerSeen = true;
        continue;
      }
      rowNumber += 1;
      if (rowNumber <= sourceRowsCommitted) continue;
      counts.parsed += 1;
      sourceRowsCommitted = rowNumber;
      const rss = process.memoryUsage().rss;
      peakRss = Math.max(peakRss, rss);
      if (counts.parsed === 1 || counts.parsed % 100 === 0) memorySamples.push({ parsed: counts.parsed, rss });

      let attemptedSourceId = null;
      try {
        const fields = parseCsvLine(line);
        attemptedSourceId = fields[0] || null;
        if (fields.length !== 11) throw new Error(`expected 11 fields, received ${fields.length}`);
        if (!passesFilters(fields, options)) {
          counts.filtered += 1;
        } else {
          const record = await mapLichessRow(line, context);
          let duplicateReason;
          if (sourceIds.has(record.sourceId)) duplicateReason = 'duplicate_source_id';
          else if (normalizedKeys.has(record.normalizedPuzzleSha256)) duplicateReason = 'duplicate_normalized_puzzle';
          if (duplicateReason) {
            counts.duplicate += 1;
            counts.quarantined += 1;
            quarantineBatch.push(`${JSON.stringify({ rowNumber, sourceId: record.sourceId, reason: duplicateReason, rawRecordSha256: record.rawRecordSha256 })}\n`);
          } else {
            sourceIds.add(record.sourceId);
            normalizedKeys.add(record.normalizedPuzzleSha256);
            contentParts.push(`${record.sourceId}:${record.normalizedPuzzleSha256}`);
            counts.accepted += 1;
            acceptedBatch.push(`${JSON.stringify(record)}\n`);
          }
        }
      } catch (error) {
        counts.invalid += 1;
        counts.quarantined += 1;
        quarantineBatch.push(`${JSON.stringify({ rowNumber, sourceId: attemptedSourceId, reason: 'malformed_row', detail: error instanceof Error ? error.message : String(error), rawRecordSha256: sha256(line) })}\n`);
      }

      if (acceptedBatch.length + quarantineBatch.length >= options.batchSize) await flush();
      if (options.abortAfter && counts.parsed >= options.abortAfter) abortRequested = true;
      if (abortRequested || counts.accepted >= options.limit) break;
    }
    if (!headerSeen) throw new Error('Truncated or invalid Zstandard stream: Lichess CSV header was not found');
    await flush();
  } finally {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
    await Promise.all([acceptedHandle?.close(), quarantineHandle?.close()]);
  }

  const status = abortRequested ? 'interrupted' : 'completed';
  if (status === 'interrupted') {
    checkpointResumeStatus = signalName ? `interrupted:${signalName}` : 'interrupted:abort-after';
    if (mutating) {
      const checkpoint = await loadCheckpoint(options.checkpoint);
      await atomicWriteJson(options.checkpoint, {
        ...checkpoint,
        parsedCount: counts.parsed,
        filteredCount: counts.filtered,
        acceptedCount: counts.accepted,
        quarantineCount: counts.quarantined,
        duplicateCount: counts.duplicate,
        updatedAt: new Date().toISOString(),
        status: 'interrupted',
      });
    }
    return { status, signal: signalName, counts, rawSha256, importRunId, peakRss, memorySamples, checkpointResumeStatus };
  }

  let outputSha256 = null;
  let quarantineSha256 = null;
  if (mutating) {
    await rename(acceptedPartial, options.output);
    await rename(quarantinePartial, options.quarantineOutput);
    outputSha256 = await sha256File(options.output);
    quarantineSha256 = await sha256File(options.quarantineOutput);
  }
  const contentIdentitySha256 = sha256(JSON.stringify({ config, records: contentParts }));
  const elapsedMs = Date.now() - startedAt;
  const manifest = {
    manifestSchemaVersion: 'lichess-import-manifest.v1',
    corpusSchemaVersion: 'puzzle-record.v1',
    sourceName: 'Lichess puzzle database',
    officialSourceUrl: APPROVED_SOURCE_URL,
    licenseId: LICHESS_LICENSE.id,
    licenseUrl: LICHESS_LICENSE.url,
    datasetVersion: options.datasetVersion,
    sourcePublishedAt: options.sourcePublishedAt,
    retrievedAt: options.retrievedAt,
    importerVersion: IMPORTER_VERSION,
    parserVersion: PARSER_VERSION,
    validatorVersion: VALIDATOR_VERSION,
    importRunId,
    inputFilename: path.basename(options.input),
    inputCompressedSize: inputStats.size,
    sourceSha256: rawSha256,
    filters: {
      ratingMin: options.ratingMin,
      ratingMax: options.ratingMax,
      themes: options.themes,
      excludedThemes: options.excludedThemes,
      popularityMin: options.popularityMin ?? null,
      limit: options.limit,
    },
    parsedCount: counts.parsed,
    filteredCount: counts.filtered,
    acceptedCount: counts.accepted,
    rejectedCount: counts.invalid + counts.duplicate,
    quarantinedCount: counts.quarantined,
    duplicateCount: counts.duplicate,
    elapsedMs,
    peakRss,
    outputSha256,
    quarantineSha256,
    contentIdentitySha256,
    checkpointResumeStatus,
    completionStatus: status,
  };
  if (mutating) {
    await atomicWriteJson(options.manifestOutput, manifest);
    await atomicWriteJson(options.checkpoint, {
      ...checkpointData,
      checkpointSchemaVersion: 'lichess-import-checkpoint.v1',
      datasetVersion: options.datasetVersion,
      sourceUrl: APPROVED_SOURCE_URL,
      rawSha256,
      importerVersion: IMPORTER_VERSION,
      parserVersion: PARSER_VERSION,
      validatorVersion: VALIDATOR_VERSION,
      configSha256,
      importRunId,
      retrievedAt: context.retrievedAt,
      paths: Object.fromEntries(['output', 'quarantineOutput', 'manifestOutput'].map((field) => [field, path.resolve(options[field])])),
      sourceRowsCommitted,
      counts,
      parsedCount: counts.parsed,
      filteredCount: counts.filtered,
      acceptedCount: counts.accepted,
      quarantineCount: counts.quarantined,
      duplicateCount: counts.duplicate,
      acceptedBytes,
      quarantineBytes,
      updatedAt: new Date().toISOString(),
      status: 'completed',
      contentIdentitySha256,
    });
  }
  return { status, counts, rawSha256, importRunId, peakRss, memorySamples, manifest, checkpointResumeStatus };
}

function assertApprovedSourceUrl(sourceUrl) {
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'database.lichess.org' || url.pathname !== '/lichess_db_puzzle.csv.zst') {
    throw new Error(`Unapproved source URL: ${sourceUrl}`);
  }
}

export async function persistOfficialSourceResponse(response, destination) {
  if (!response.ok || !response.body) throw new Error(`Official source download failed with HTTP ${response.status}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const hash = createHash('sha256');
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  const handle = await open(destination, 'wx');
  try {
    await pipeline(Readable.fromWeb(response.body), meter, handle.createWriteStream());
    return {
      rawSha256: hash.digest('hex'),
      size: (await stat(destination)).size,
      lastModified: response.headers.get('last-modified'),
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    await handle.close().catch(() => {});
    await rm(destination, { force: true });
    throw error;
  }
}

export async function downloadOfficialSource(sourceUrl, destination) {
  assertApprovedSourceUrl(sourceUrl);
  return persistOfficialSourceResponse(await fetch(sourceUrl), destination);
}

function validateCliOptions(options) {
  if (Boolean(options.sourceUrl) === Boolean(options.input)) throw new Error('Provide exactly one of --source-url or --input');
  for (const field of ['output', 'quarantineOutput', 'manifestOutput', 'checkpoint', 'datasetVersion']) {
    if (!options[field]) throw new Error(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required`);
  }
  if (options.sourceUrl) assertApprovedSourceUrl(options.sourceUrl);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateCliOptions(options);
  let temporaryDirectory;
  try {
    if (options.sourceUrl) {
      temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'lichess-official-'));
      options.input = path.join(temporaryDirectory, 'lichess_db_puzzle.csv.zst');
      const download = await downloadOfficialSource(options.sourceUrl, options.input);
      options.rawSha256 = download.rawSha256;
      options.retrievedAt = download.retrievedAt;
      options.sourcePublishedAt = options.sourcePublishedAt ?? new Date(download.lastModified).toISOString();
    } else {
      options.retrievedAt = new Date().toISOString();
      options.sourcePublishedAt = options.sourcePublishedAt ?? new Date(`${options.datasetVersion}T00:00:00.000Z`).toISOString();
    }
    const result = await runImport(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status === 'interrupted') process.exitCode = result.signal === 'SIGINT' ? 130 : 75;
  } finally {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
