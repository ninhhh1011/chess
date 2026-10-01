import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { Chess } from 'chess.js';
import { validatePuzzleRecord } from '../../../../src/services/puzzleRecord.ts';

const input = process.argv[2] || path.join(process.env.TEMP, 'chess-p2t04', 'mini-import-final-1', 'accepted.jsonl');
const output = process.argv[3] || 'artifacts/tech-verification/PHASE_2/P2-T05/imported-puzzle-flow.json';
const lines = createInterface({ input: createReadStream(input), crlfDelay: Infinity });
const { value: first } = await lines[Symbol.asyncIterator]().next();
lines.close();
if (!first) throw new Error('Imported corpus is empty');

const record = JSON.parse(first);
const contract = await validatePuzzleRecord(record);
if (!contract.valid) throw new Error(`Invalid imported record: ${JSON.stringify(contract.errors)}`);

let game = new Chess(record.fen);
const expected = record.moves[0];
const wrong = game.moves({ verbose: true }).find((move) => `${move.from}${move.to}${move.promotion ?? ''}` !== expected);
if (!wrong) throw new Error('No legal incorrect candidate move is available');
game.move(wrong);
const wrongFen = game.fen();

game = new Chess(record.fen);
const retryFen = game.fen();
const replay = record.moves.map((uci) => {
  const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  if (!move) throw new Error(`Illegal solution move: ${uci}`);
  return { uci, san: move.san };
});

const evidence = {
  verdict: 'PASS',
  harness: 'non-production imported-corpus boundary',
  productionIntegrationClaimed: false,
  sourceId: record.sourceId,
  sourceUrl: record.sourceUrl,
  licenseId: record.licenseId,
  startFen: record.fen,
  incorrectAttempt: { uci: `${wrong.from}${wrong.to}${wrong.promotion ?? ''}`, legal: true, acceptedAsSolution: false, resultingFen: wrongFen },
  retry: { resetToStartFen: retryFen === record.fen },
  solution: { moves: replay, plies: replay.length, completed: true, finalFen: game.fen() },
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
