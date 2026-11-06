import type { Evaluation } from '../../types/ChessTypes';

export type EvaluationPerspective = 'white';

type EvaluationScore = Pick<Evaluation, 'type' | 'value'>;

export function evaluationForMover(evaluation: EvaluationScore, mover: 'w' | 'b'): number {
  const whiteScore = evaluation.type === 'mate'
    ? Math.sign(evaluation.value) * 9_900
    : evaluation.value;
  return mover === 'w' ? whiteScore : -whiteScore;
}

export function evaluationForReview(evaluation: EvaluationScore): number {
  if (evaluation.type === 'cp') return evaluation.value;
  return evaluation.value > 0
    ? 100_000 - evaluation.value * 100
    : -100_000 - evaluation.value * 100;
}

export function moverEvaluationDelta(
  before: EvaluationScore,
  after: EvaluationScore,
  mover: 'w' | 'b'
): number {
  const sign = mover === 'w' ? 1 : -1;
  return sign * (evaluationForReview(after) - evaluationForReview(before));
}

export function toWhitePerspective(evaluation: Evaluation, sideToMove: 'w' | 'b'): Evaluation {
  const value = sideToMove === 'w' ? evaluation.value : -evaluation.value;
  return {
    ...evaluation,
    value,
    display: evaluation.type === 'mate'
      ? `Mate in ${Math.abs(value)} for ${value >= 0 ? 'White' : 'Black'}`
      : sideToMove === 'w' ? evaluation.display : `${value >= 0 ? '+' : ''}${(value / 100).toFixed(2)}`,
  };
}
