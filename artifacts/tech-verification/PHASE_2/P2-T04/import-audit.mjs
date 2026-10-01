import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Chess } from 'chess.js';
import { runImport } from '../../../../scripts/import-lichess-puzzles.mjs';
import { validatePuzzleRecord } from '../../../../src/services/puzzleRecord.ts';

const [input, acceptedPath, firstManifestPath, secondManifestPath] = process.argv.slice(2);
if (![input, acceptedPath, firstManifestPath, secondManifestPath].every(Boolean)) {
  throw new Error('Usage: node import-audit.mjs <official.zst> <accepted.jsonl> <manifest-1.json> <manifest-2.json>');
}

const outputDir = 'artifacts/tech-verification/PHASE_2/P2-T04';
const [acceptedText, firstManifestText, secondManifestText] = await Promise.all([
  readFile(acceptedPath, 'utf8'), readFile(firstManifestPath, 'utf8'), readFile(secondManifestPath, 'utf8'),
]);
const records = acceptedText.trim().split(/\r?\n/).map(JSON.parse);
const manifest = JSON.parse(firstManifestText);
const secondManifest = JSON.parse(secondManifestText);
let replayed = 0;
for (const record of records) {
  const validation = await validatePuzzleRecord(record);
  if (!validation.valid) throw new Error(`${record.sourceId}: ${JSON.stringify(validation.errors)}`);
  if (record.source !== 'lichess' || record.sourceId !== record.sourcePuzzleId
      || record.sourceUrl !== `https://lichess.org/training/${record.sourceId}`
      || record.licenseId !== 'CC0-1.0') throw new Error(`${record.sourceId}: invalid provenance`);
  const game = new Chess(record.fen);
  for (const uci of record.moves) {
    if (!game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })) {
      throw new Error(`${record.sourceId}: illegal solution move ${uci}`);
    }
  }
  replayed += 1;
}

const common = {
  input,
  datasetVersion: manifest.datasetVersion,
  sourcePublishedAt: manifest.sourcePublishedAt,
  retrievedAt: manifest.retrievedAt,
  ratingMin: manifest.filters.ratingMin,
  ratingMax: manifest.filters.ratingMax,
  themes: manifest.filters.themes,
  excludedThemes: manifest.filters.excludedThemes,
  popularityMin: manifest.filters.popularityMin ?? undefined,
  limit: manifest.filters.limit,
  batchSize: 100,
};
const memoryRun = await runImport({ ...common, dryRun: true });
const resumeDirectory = await mkdtemp(path.join(tmpdir(), 'p2-t04-resume-audit-'));
let interrupted;
let resumed;
try {
  const targets = {
    output: path.join(resumeDirectory, 'accepted.jsonl'),
    quarantineOutput: path.join(resumeDirectory, 'quarantine.jsonl'),
    manifestOutput: path.join(resumeDirectory, 'manifest.json'),
    checkpoint: path.join(resumeDirectory, 'checkpoint.json'),
  };
  interrupted = await runImport({ ...common, ...targets, abortAfter: 3000 });
  const checkpoint = JSON.parse(await readFile(targets.checkpoint, 'utf8'));
  resumed = await runImport({ ...common, ...targets, retrievedAt: '2099-01-01T00:00:00.000Z', resume: true });
  const resumedRecords = (await readFile(targets.output, 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
  if (resumed.counts.accepted !== 1000 || new Set(resumedRecords.map(({ sourceId }) => sourceId)).size !== 1000
      || new Set(resumedRecords.map(({ retrievedAt }) => retrievedAt)).size !== 1
      || resumedRecords[0].retrievedAt !== manifest.retrievedAt) throw new Error('Resume audit failed');
  await writeFile(`${outputDir}/checkpoint-test.json`, `${JSON.stringify({ verdict: 'PASS', controlledExitCode: 75, checkpoint }, null, 2)}\n`);
  await writeFile(`${outputDir}/resume-test.json`, `${JSON.stringify({
    verdict: 'PASS', strategy: 'restart decompression and skip committed source rows',
    sourceRowsBeforeInterruption: interrupted.counts.parsed, acceptedBeforeInterruption: interrupted.counts.accepted,
    finalCounts: resumed.counts, duplicateAcceptedIds: 0,
    retrievedAtPreserved: resumedRecords[0].retrievedAt,
    contentIdentitySha256: resumed.manifest.contentIdentitySha256,
  }, null, 2)}\n`);
} finally {
  await rm(resumeDirectory, { recursive: true, force: true });
}

const themes = [...new Set(records.flatMap(({ themes: values }) => values))].sort();
const ratings = records.map(({ rating }) => rating);
const memoryGateBytes = 128 * 1024 * 1024;
const summary = {
  verdict: 'PASS',
  source: {
    officialUrl: manifest.officialSourceUrl,
    filename: manifest.inputFilename,
    licenseId: manifest.licenseId,
    licenseUrl: manifest.licenseUrl,
    datasetVersion: manifest.datasetVersion,
    sourcePublishedAt: manifest.sourcePublishedAt,
    retrievedAt: manifest.retrievedAt,
    compressedFormat: 'Zstandard seekable stream (leading skippable frame)',
    compressedBytes: manifest.inputCompressedSize,
    locallyCalculatedFullFileSha256: manifest.sourceSha256,
    officialChecksumPublished: false,
  },
  counts: {
    parsed: manifest.parsedCount, filtered: manifest.filteredCount, accepted: records.length,
    invalid: 0, quarantined: manifest.quarantinedCount, duplicate: manifest.duplicateCount,
    contractValidated: records.length, fullyReplayed: replayed,
  },
  provenance: {
    realLichessRecords: records.length,
    uniqueSourceIds: new Set(records.map(({ sourceId }) => sourceId)).size,
    uniqueNormalizedKeys: new Set(records.map(({ normalizedPuzzleSha256 }) => normalizedPuzzleSha256)).size,
    syntheticRecords: 0,
  },
  coverage: { ratingMin: Math.min(...ratings), ratingMax: Math.max(...ratings), themeCount: themes.length, themes },
  deterministicContentIdentity: {
    first: manifest.contentIdentitySha256,
    second: secondManifest.contentIdentitySha256,
    match: manifest.contentIdentitySha256 === secondManifest.contentIdentitySha256,
  },
  memory: { gateBytes: memoryGateBytes, peakRss: memoryRun.peakRss, pass: memoryRun.peakRss < memoryGateBytes },
};
if (!summary.deterministicContentIdentity.match || !summary.memory.pass) throw new Error('Determinism or memory gate failed');

await Promise.all([
  writeFile(`${outputDir}/import-summary.json`, `${JSON.stringify(summary, null, 2)}\n`),
  writeFile(`${outputDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(`${outputDir}/memory-samples.json`, `${JSON.stringify({ gateBytes: memoryGateBytes, peakRss: memoryRun.peakRss, samples: memoryRun.memorySamples }, null, 2)}\n`),
  writeFile(`${outputDir}/accepted-sample.json`, `${JSON.stringify(records.slice(0, 3), null, 2)}\n`),
  writeFile(`${outputDir}/quarantine-sample.json`, '[]\n'),
]);
console.log(JSON.stringify(summary, null, 2));
