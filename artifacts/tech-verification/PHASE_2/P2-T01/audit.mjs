import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const generatedPath = 'src/data/generated/generatedPuzzles.json';
const manifestPath = 'src/data/generated/corpusManifest.json';
const generatedRaw = readFileSync(generatedPath);
const generated = JSON.parse(generatedRaw);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const normalized = new Set(generated.map(({ fen }) => fen.split(' ').slice(0, 4).join(' ')));
const fullFen = new Set(generated.map(({ fen }) => fen));
const requiredExternalFields = ['sourceId', 'sourcePuzzleId', 'licenseId', 'rawSha256', 'recordSha256', 'rating'];
const missing = Object.fromEntries(requiredExternalFields.map((field) => [field, generated.filter((row) => row[field] == null).length]));
const corpusPuzzlesSource = readFileSync('src/data/corpusPuzzles.ts', 'utf8');
const bundledExercisesSource = readFileSync('src/data/exercises.js', 'utf8');
const productionLoaderSource = readFileSync('src/services/corpusLoader.ts', 'utf8');

const result = {
  productionExternalCorpus: {
    classification: 'unavailable',
    records: 0,
    truthfulContract: productionLoaderSource.includes('available: false') && productionLoaderSource.includes('puzzleCount: 0'),
  },
  bundledExercises: {
    classification: 'local-seed-drills',
    records: [...bundledExercisesSource.matchAll(/\{ id:/g)].length,
    externalCorpus: false,
  },
  dormantLegacySeed: {
    classification: 'synthetic-seed',
    records: [...corpusPuzzlesSource.matchAll(/^    id:/gm)].length,
    externalCorpus: false,
    placeholderSource: corpusPuzzlesSource.includes("sourceUrl: 'internal://seed-corpus'"),
    placeholderChecksum: corpusPuzzlesSource.includes("rawSha256: 'seed-corpus-v1-sha256'"),
  },
  ignoredGeneratedArtifact: {
    classification: 'synthetic-generated',
    bytes: generatedRaw.length,
    sha256: createHash('sha256').update(generatedRaw).digest('hex'),
    records: generated.length,
    uniqueIds: new Set(generated.map(({ id }) => id)).size,
    uniqueFullFen: fullFen.size,
    uniqueNormalizedFen: normalized.size,
    normalizedDuplicates: generated.length - normalized.size,
    missing,
    selfAssignedSource: manifest.source,
    externalCorpus: false,
  },
};

if (
  !result.productionExternalCorpus.truthfulContract
  || result.bundledExercises.records !== 5
  || result.dormantLegacySeed.records !== 28
  || result.ignoredGeneratedArtifact.records !== 40000
  || result.ignoredGeneratedArtifact.uniqueNormalizedFen !== 23
  || Object.values(missing).some((count) => count !== 40000)
) {
  throw new Error(JSON.stringify(result));
}

console.log(JSON.stringify(result, null, 2));
