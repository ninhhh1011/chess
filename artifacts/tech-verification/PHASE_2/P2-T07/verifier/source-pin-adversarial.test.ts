import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadProductionCorpus } from '../../../../../src/services/corpusLoader';
import { calculatePuzzleRecordSha256 } from '../../../../../src/services/puzzleRecord';
import type { PuzzleRecord } from '../../../../../src/types/corpus';

const deliveryRoot = path.resolve('public/corpus');
const approvedSha256 = 'a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073';

async function sourceFiles() {
  const pointer = JSON.parse(await readFile(path.join(deliveryRoot, 'current.json'), 'utf8'));
  const run = path.join(deliveryRoot, 'runs', pointer.activeRun);
  const manifest = JSON.parse(await readFile(path.join(run, 'manifest.json'), 'utf8'));
  const records = JSON.parse(await readFile(path.join(run, 'chunks', '00000.json'), 'utf8')) as PuzzleRecord[];
  return { pointer, manifest, records };
}

function fetcherFor(pointer: unknown, manifest: unknown, chunkBody: string): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/current.json')) return new Response(JSON.stringify(pointer));
    if (url.endsWith('/manifest.json')) return new Response(JSON.stringify(manifest));
    if (url.endsWith('/chunks/00000.json')) return new Response(chunkBody);
    return new Response('missing', { status: 404 });
  }) as typeof fetch;
}

describe('approved production source pin', () => {
  test('rejects an otherwise valid manifest with an unapproved dataset version', async () => {
    const { pointer, manifest, records } = await sourceFiles();
    manifest.datasetVersion = '2099-12-31';
    const result = await loadProductionCorpus(fetcherFor(pointer, manifest, `${JSON.stringify(records)}\n`));
    expect(result.available).toBe(false);
  });

  test('rejects a self-consistent corpus resigned to an unapproved source checksum', async () => {
    const { pointer, manifest, records } = await sourceFiles();
    const forgedSha256 = 'b'.repeat(64);
    expect(forgedSha256).not.toBe(approvedSha256);
    for (const record of records) {
      record.rawSha256 = forgedSha256;
      const { recordSha256: _old, ...input } = record;
      record.recordSha256 = await calculatePuzzleRecordSha256(input);
    }
    const chunkBody = `${JSON.stringify(records)}\n`;
    manifest.sourceSha256 = forgedSha256;
    manifest.chunks[0].sha256 = createHash('sha256').update(chunkBody).digest('hex');
    const result = await loadProductionCorpus(fetcherFor(pointer, manifest, chunkBody));
    expect(result.available).toBe(false);
  });
});
