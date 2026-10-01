import { writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { exercises } from '../../../../../src/data/exercises.js';
import { validateExerciseRecord, validateExerciseRecords } from '../../../../../src/services/exerciseValidator.js';

const shippedChecks = exercises.map((exercise) => {
  const chess = new Chess(exercise.fen);
  const beforeFen = chess.fen();
  const move = chess.move(exercise.correctMove);
  const independentObjectives = {
    checkmate: !exercise.tags.includes('checkmate') || chess.isCheckmate(),
    promotion: !exercise.tags.includes('promotion') || Boolean(move?.promotion),
    capture: !exercise.tags.some((tag) => ['capture', 'hanging_piece'].includes(tag)) || Boolean(move?.captured),
  };
  return {
    id: exercise.id,
    beforeFen,
    legalMove: Boolean(move),
    san: move?.san,
    afterFen: chess.fen(),
    tags: exercise.tags,
    independentObjectives,
    productionValidator: validateExerciseRecord(exercise),
  };
});

const shippedBatch = validateExerciseRecords(exercises);
const falsePromotionRecord = {
  ...exercises.find((exercise) => exercise.id === 'knight_capture'),
  id: 'malformed_false_promotion',
  tags: ['promotion'],
};
const falsePromotionResult = validateExerciseRecord(falsePromotionRecord);

const evidence = {
  shippedExerciseCount: exercises.length,
  shippedBatch,
  shippedChecks,
  shippedExercisesPass: exercises.length === 5
    && shippedBatch.passed
    && shippedChecks.every((check) => check.legalMove
      && Object.values(check.independentObjectives).every(Boolean)
      && check.productionValidator.valid),
  sameProductionValidatorImport: '../../../../../src/services/exerciseValidator.js',
  falsePromotionRecord,
  falsePromotionResult,
  falsePromotionRejected: !falsePromotionResult.valid,
  verdict: shippedBatch.passed && !falsePromotionResult.valid ? 'PASS' : 'FAIL',
};

await writeFile(
  'artifacts/tech-verification/PHASE_0/P0-T07/verifier/contract-check.json',
  `${JSON.stringify(evidence, null, 2)}\n`,
);
console.log(JSON.stringify(evidence, null, 2));
if (evidence.verdict !== 'PASS') process.exitCode = 1;
