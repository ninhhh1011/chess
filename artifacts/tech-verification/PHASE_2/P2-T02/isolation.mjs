import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const distRoot = path.join(root, 'dist', 'assets');
const fixtureIds = ['mate_one_queen', 'knight_capture', 'promotion_queen', 'back_rank_mate', 'bishop_diagonal'];
const forbiddenMarkers = ['corpusPuzzles', 'generatedPuzzles', 'generated-corpus-v2', 'seed-corpus-v1-sha256'];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  }))).flat();
}

const sourceFiles = (await filesUnder(sourceRoot)).filter((file) =>
  /\.(?:[jt]sx?)$/.test(file)
  && !file.includes(`${path.sep}test${path.sep}`)
  && !file.includes(`${path.sep}data${path.sep}generated${path.sep}`)
  && !file.endsWith(`${path.sep}data${path.sep}corpusPuzzles.ts`));
const productionSource = await Promise.all(sourceFiles.map(async (file) => [file, await readFile(file, 'utf8')]));
const markerHits = forbiddenMarkers.flatMap((marker) => productionSource
  .filter(([, content]) => content.includes(marker))
  .map(([file]) => `${marker}:${path.relative(root, file)}`));
assert.deepEqual(markerHits, [], `Synthetic corpus marker reached production source: ${markerHits.join(', ')}`);

const initializationCalls = productionSource.flatMap(([file, content]) =>
  [...content.matchAll(/initializeCorpus\s*\(/g)]
    .filter(({ index }) => !content.slice(Math.max(0, index - 25), index).includes('function '))
    .map(() => path.relative(root, file)));
assert.deepEqual(initializationCalls, [], `Production corpus initialization found in ${initializationCalls.join(', ')}`);

const loader = await readFile(path.join(sourceRoot, 'services', 'corpusLoader.ts'), 'utf8');
for (const contract of ["available: false", "source: 'unavailable'", 'puzzleCount: 0', 'resetCorpus();']) {
  assert.ok(loader.includes(contract), `Missing unavailable-state contract: ${contract}`);
}

const distFiles = (await filesUnder(distRoot)).filter((file) => file.endsWith('.js'));
const distText = (await Promise.all(distFiles.map((file) => readFile(file, 'utf8')))).join('\n');
const distMarkerHits = forbiddenMarkers.filter((marker) => distText.includes(marker));
assert.deepEqual(distMarkerHits, [], `Synthetic marker found in production bundle: ${distMarkerHits.join(', ')}`);
for (const id of fixtureIds) assert.ok(distText.includes(id), `Bundled local drill missing: ${id}`);
assert.ok(distText.includes('không phải corpus bên ngoài'), 'Truthful unavailable notice missing from production bundle');

console.log(JSON.stringify({
  verdict: 'PASS',
  productionSourceFilesScanned: productionSource.length,
  productionInitializationCalls: initializationCalls.length,
  syntheticMarkerHits: markerHits,
  productionBundleFilesScanned: distFiles.length,
  productionBundleSyntheticMarkerHits: distMarkerHits,
  localIntegratedDrills: fixtureIds,
  externalCorpusAvailable: false,
  unavailableState: 'truthful',
  dormantDataPreserved: true,
}, null, 2));
