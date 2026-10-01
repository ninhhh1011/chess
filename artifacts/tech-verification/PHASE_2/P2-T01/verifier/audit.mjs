import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const output = 'artifacts/tech-verification/PHASE_2/P2-T01/verifier/audit.json';
const read = (path) => readFileSync(path, 'utf8');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function importers(pattern) {
  return sourceFiles('src').filter((path) => read(path).includes(pattern)).map((path) => relative('.', path).replaceAll('\\', '/'));
}

function arrayRecordCounts(source, declaration) {
  const counts = [];
  let cursor = 0;
  while ((cursor = source.indexOf(declaration, cursor)) >= 0) {
    const start = source.indexOf('[', cursor);
    let depth = 0;
    let end = start;
    for (; end < source.length; end++) {
      if (source[end] === '[') depth++;
      if (source[end] === ']' && --depth === 0) break;
    }
    counts.push((source.slice(start, end + 1).match(/\bid:\s*['"]/g) || []).length);
    cursor = end + 1;
  }
  return counts;
}

const generatedRaw = readFileSync('src/data/generated/generatedPuzzles.json');
const generated = JSON.parse(generatedRaw);
const manifestRaw = readFileSync('src/data/generated/corpusManifest.json');
const manifest = JSON.parse(manifestRaw);
const generator = read('scripts/ingest-corpus.cjs');
const loader = read('src/services/corpusLoader.ts');
const service = read('src/services/corpusService.ts');
const legacySeed = read('src/data/corpusPuzzles.ts');
const exercises = read('src/data/exercises.js');
const corpusTests = read('src/test/corpus.test.ts');
const ignoredGenerated = spawnSync('git', ['check-ignore', '-v', 'src/data/generated/generatedPuzzles.json', 'src/data/generated/corpusManifest.json'], { encoding: 'utf8' });
const normalized = new Set(generated.map(({ fen }) => fen.split(' ').slice(0, 4).join(' ')));
const fullFen = new Set(generated.map(({ fen }) => fen));
const requiredExternalFields = ['sourceId', 'sourcePuzzleId', 'licenseId', 'rawSha256', 'recordSha256', 'rating'];

const pageResponse = await fetch('https://database.lichess.org/');
const page = await pageResponse.text();
const downloadResponse = await fetch('https://database.lichess.org/lichess_db_puzzle.csv.zst', { method: 'HEAD' });
const schema = 'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate';

const legacyValidator = spawnSync(process.execPath, ['scripts/verify-corpus.cjs'], { encoding: 'utf8' });
const legacyOutput = `${legacyValidator.stdout}${legacyValidator.stderr}`;

const result = {
  verdict: 'PASS',
  productionExternalCorpus: {
    classification: 'unavailable',
    records: 0,
    contract: {
      availableFalse: loader.includes('available: false'),
      puzzleCountZero: loader.includes('puzzleCount: 0'),
      resetsRuntimeStore: loader.includes('resetCorpus();'),
      generatedArtifactImported: loader.includes('generatedPuzzles'),
    },
  },
  paths: [
    { path: 'src/data/generated/generatedPuzzles.json', classification: 'synthetic-generated', productionImported: false },
    { path: 'src/data/generated/corpusManifest.json', classification: 'synthetic-generated', productionImported: false },
    { path: 'scripts/ingest-corpus.cjs', classification: 'synthetic-generated', productionImported: false },
    { path: 'src/data/corpusPuzzles.ts', classification: 'synthetic-seed', productionImported: false },
    { path: 'src/data/exercises.js', classification: 'local-bundled-drill', productionImported: true },
    { path: 'src/services/corpusService.ts#initializeCorpus', classification: 'synthetic-seed-adapter', productionImported: false },
    { path: 'src/test/corpus.test.ts', classification: 'test-fixture', productionImported: false },
    { path: 'src/test/benchmarkCorpus.ts', classification: 'test-fixture', productionImported: false },
    { path: 'src/services/analysis/pgnFixtures.ts', classification: 'test-fixture', sourceReexportedByProductionParser: true, productionBundled: false },
    { path: 'src/services/corpusLoader.ts', classification: 'unavailable', productionImported: true },
    { path: 'https://database.lichess.org/lichess_db_puzzle.csv.zst', classification: 'external-real', productionImported: false },
  ],
  importGraph: {
    generatedPuzzles: importers('generatedPuzzles'),
    corpusPuzzles: importers('corpusPuzzles'),
    bundledExercises: importers("../data/exercises"),
    corpusLoader: importers('services/corpusLoader').concat(importers('./corpusLoader')),
    initializeCorpus: importers('initializeCorpus'),
    pgnFixtures: importers('analysis/pgnFixtures').concat(importers('./pgnFixtures')),
    benchmarkCorpus: importers('benchmarkCorpus'),
  },
  ignoredGeneratedArtifact: {
    gitCheckIgnoreExitCode: ignoredGenerated.status,
    gitIgnoreEvidence: ignoredGenerated.stdout.trim().split(/\r?\n/),
    records: generated.length,
    uniqueIds: new Set(generated.map(({ id }) => id)).size,
    uniqueFullFen: fullFen.size,
    uniqueNormalizedFen: normalized.size,
    normalizedDuplicates: generated.length - normalized.size,
    bytes: generatedRaw.length,
    sha256: sha256(generatedRaw),
    missingExternalFields: Object.fromEntries(requiredExternalFields.map((field) => [field, generated.filter((row) => row[field] == null).length])),
    manifestBytes: manifestRaw.length,
    manifestSha256: sha256(manifestRaw),
    manifestSource: manifest.source,
    manifestHasRawChecksum: Boolean(manifest.rawSha256 || manifest.checksum),
    generatorChangesOnlyFullmoveClock: generator.includes("parts[5] = String(variationNum)"),
    generatorSelfAssignsSourceAndLicense: generator.includes("sourceId: 'generated-corpus-v2'") && generator.includes("id: 'cc0'"),
  },
  dormantLegacySeed: {
    records: (legacySeed.match(/^    id:/gm) || []).length,
    placeholderSource: legacySeed.includes("sourceUrl: 'internal://seed-corpus'"),
    placeholderChecksum: legacySeed.includes("rawSha256: 'seed-corpus-v1-sha256'"),
  },
  bundledExercises: {
    records: (exercises.match(/\{ id:/g) || []).length,
    productionRoute: 'src/pages/Exercises.jsx',
    externalCorpus: false,
  },
  corpusServiceTestSeeds: {
    recordCounts: arrayRecordCounts(corpusTests, 'const seedExercises ='),
    placeholderFields: {
      source: service.includes("sourceUrl: 'internal://seed'"),
      rawChecksum: service.includes("rawSha256: 'seed-exercises-v1'"),
      recordChecksum: service.includes('record-sha256`'),
    },
  },
  legacyValidator: {
    exitCode: legacyValidator.status,
    saysAllPassed: legacyOutput.includes('All validations passed'),
    warnsMissingChecksum: legacyOutput.includes('No checksum in manifest'),
    sampledProvenance: legacyOutput.match(/Sample provenance:\s*(\d+)\s*\/\s*(\d+)/)?.slice(1).map(Number),
    duplicateCount: Number(legacyOutput.match(/Duplicates:\s*(\d+)/)?.[1]),
    solutionCheck: 'string length only on first 100 records',
  },
  approvedSource: {
    pageUrl: 'https://database.lichess.org/',
    pageStatus: pageResponse.status,
    downloadUrl: downloadResponse.url,
    downloadHeadStatus: downloadResponse.status,
    contentType: downloadResponse.headers.get('content-type'),
    contentLength: Number(downloadResponse.headers.get('content-length')),
    lastModified: downloadResponse.headers.get('last-modified'),
    license: 'Creative Commons CC0',
    licenseStatementPresent: page.includes('Creative Commons CC0 license'),
    publishedPuzzleCount: Number(page.match(/<strong>([\d,]+)<\/strong> chess puzzles/)?.[1].replaceAll(',', '')),
    schema,
    schemaPresent: page.includes(schema),
  },
};

const failures = [
  result.productionExternalCorpus.contract.availableFalse,
  result.productionExternalCorpus.contract.puzzleCountZero,
  result.productionExternalCorpus.contract.resetsRuntimeStore,
  !result.productionExternalCorpus.contract.generatedArtifactImported,
  result.importGraph.generatedPuzzles.length === 0,
  result.importGraph.corpusPuzzles.length === 0,
  result.ignoredGeneratedArtifact.records === 40000,
  result.ignoredGeneratedArtifact.gitCheckIgnoreExitCode === 0,
  result.ignoredGeneratedArtifact.uniqueNormalizedFen === 23,
  result.ignoredGeneratedArtifact.normalizedDuplicates === 39977,
  Object.values(result.ignoredGeneratedArtifact.missingExternalFields).every((count) => count === 40000),
  result.dormantLegacySeed.records === 28,
  result.bundledExercises.records === 5,
  JSON.stringify(result.corpusServiceTestSeeds.recordCounts) === JSON.stringify([3, 12]),
  result.legacyValidator.exitCode === 0,
  result.legacyValidator.saysAllPassed,
  result.legacyValidator.warnsMissingChecksum,
  JSON.stringify(result.legacyValidator.sampledProvenance) === JSON.stringify([0, 10]),
  result.legacyValidator.duplicateCount === 39977,
  result.approvedSource.pageStatus === 200,
  result.approvedSource.downloadHeadStatus === 200,
  result.approvedSource.licenseStatementPresent,
  result.approvedSource.publishedPuzzleCount === 6057356,
  result.approvedSource.schemaPresent,
];

if (failures.some((check) => !check)) {
  result.verdict = 'FAIL';
  throw new Error(JSON.stringify(result, null, 2));
}

writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
