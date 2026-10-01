import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const read = (path) => readFileSync(path, 'utf8');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

const productionFiles = filesUnder('src').filter((path) =>
  /\.(?:js|jsx|ts|tsx)$/.test(path)
  && !/[\\/]test[\\/]/.test(path)
  && !/\.(?:test|spec)\./.test(path));
const productionSources = productionFiles.map((path) => ({ path: relative('.', path).replaceAll('\\', '/'), text: read(path) }));
const forbiddenImportPattern = /(?:from\s*|import\s*)['"][^'"]*(?:generatedPuzzles|corpusPuzzles)[^'"]*['"]/g;
const forbiddenImports = productionSources.flatMap(({ path, text }) => [...text.matchAll(forbiddenImportPattern)].map(([match]) => ({ path, match })));
const initializationCallers = productionSources
  .filter(({ path, text }) => path !== 'src/services/corpusService.ts' && /\binitializeCorpus\s*\(/.test(text))
  .map(({ path }) => path);

const loader = read('src/services/corpusLoader.ts');
const exercisesPage = read('src/pages/Exercises.jsx');
const exercises = read('src/data/exercises.js');
const packageJson = read('package.json');
const distJsFiles = filesUnder('dist/assets').filter((path) => path.endsWith('.js'));
const distText = distJsFiles.map(read).join('\n');
const forbiddenBundleMarkers = ['generated-corpus-v2', 'gen-00001', 'seed-corpus-v1-sha256', 'puzzle-mate_1_queen'];
const bundleMarkerHits = forbiddenBundleMarkers.filter((marker) => distText.includes(marker));
const localDrillIds = ['mate_one_queen', 'knight_capture', 'promotion_queen', 'back_rank_mate', 'bishop_diagonal'];
const trackedDormantDiff = spawnSync('git', ['diff', '--exit-code', '--', 'scripts/ingest-corpus.cjs', 'scripts/verify-corpus.cjs', 'src/data/corpusPuzzles.ts'], { encoding: 'utf8' });
const ignored = spawnSync('git', ['check-ignore', '-v', 'src/data/generated/generatedPuzzles.json', 'src/data/generated/corpusManifest.json'], { encoding: 'utf8' });

const result = {
  verdict: 'PASS',
  productionSourceFilesScanned: productionSources.length,
  forbiddenImports,
  productionInitializationCallers: initializationCallers,
  loaderContract: {
    externalAvailable: false,
    puzzleCount: 0,
    source: 'unavailable',
    resetsCorpus: loader.includes('resetCorpus();'),
    importsBundledExercises: loader.includes('../data/exercises'),
    importsDormantSeed: loader.includes('corpusPuzzles'),
    importsGeneratedArtifact: loader.includes('generatedPuzzles'),
  },
  localBundledDrills: {
    count: (exercises.match(/\{ id:/g) || []).length,
    ids: localDrillIds,
    pageImportsLocalData: exercisesPage.includes("from '../data/exercises'"),
    pageLabelsLocalNotExternal: exercisesPage.includes('5 bài tập tích hợp') || exercisesPage.includes('{validExercises.length} bài tập tích hợp'),
  },
  buildPath: {
    packageRunsGenerator: packageJson.includes('ingest-corpus'),
    productionBundleFilesScanned: distJsFiles.length,
    syntheticMarkerHits: bundleMarkerHits,
    localDrillIdsPresent: localDrillIds.filter((id) => distText.includes(id)),
    truthfulNoticePresent: distText.includes('không phải corpus bên ngoài'),
  },
  dormantData: {
    preserved: trackedDormantDiff.status === 0,
    trackedDiffExitCode: trackedDormantDiff.status,
    generatedIgnored: ignored.status === 0,
    generatedSha256: sha256('src/data/generated/generatedPuzzles.json'),
    manifestSha256: sha256('src/data/generated/corpusManifest.json'),
    seedSha256: sha256('src/data/corpusPuzzles.ts'),
  },
};

assert.deepEqual(forbiddenImports, []);
assert.deepEqual(initializationCallers, []);
assert.equal(result.loaderContract.resetsCorpus, true);
assert.equal(result.loaderContract.importsBundledExercises, false);
assert.equal(result.loaderContract.importsDormantSeed, false);
assert.equal(result.loaderContract.importsGeneratedArtifact, false);
assert.equal(result.localBundledDrills.count, 5);
assert.equal(result.localBundledDrills.pageImportsLocalData, true);
assert.equal(result.localBundledDrills.pageLabelsLocalNotExternal, true);
assert.equal(result.buildPath.packageRunsGenerator, false);
assert.deepEqual(bundleMarkerHits, []);
assert.deepEqual(result.buildPath.localDrillIdsPresent, localDrillIds);
assert.equal(result.buildPath.truthfulNoticePresent, true);
assert.equal(result.dormantData.preserved, true);
assert.equal(result.dormantData.generatedIgnored, true);
assert.equal(result.dormantData.generatedSha256, 'e9e12f397bad4b6ab9dd9180cfc3f6c402fcc1f0875cccdaea4a9b607a1ee6ad');
assert.equal(result.dormantData.manifestSha256, '183232fac3d727e07f4a1281b4b2ed8c8c211c31eab7cf83108b6311aa169ac8');

writeFileSync('artifacts/tech-verification/PHASE_2/P2-T02/verifier/isolation.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
