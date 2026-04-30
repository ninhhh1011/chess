import { Chess } from 'chess.js';

export function uciToMoveObject(uci = '') {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined };
}

export function getSanFromUci(fen, uci) {
  try {
    const game = new Chess(fen);
    const move = game.move(uciToMoveObject(uci));
    return move?.san || uci;
  } catch {
    return uci || 'không rõ';
  }
}

export function formatEvaluation(evaluation) {
  if (!evaluation) return 'Chưa có đánh giá';
  if (evaluation.type === 'mate') return `Mate in ${evaluation.value}`;
  if (evaluation.display) return evaluation.display;
  return `${evaluation.value >= 0 ? '+' : ''}${(evaluation.value / 100).toFixed(2)}`;
}

function toPawn(evalObj) {
  if (!evalObj) return 0;
  if (evalObj.type === 'mate') return evalObj.value > 0 ? 99 : -99;
  return (Number(evalObj.value) || 0) / 100;
}

export function classifyMoveLoss(beforeEval, afterEval) {
  const loss = Math.abs(toPawn(beforeEval) - toPawn(afterEval));
  if (loss < 0.3) return { type: 'good', label: 'Good', loss };
  if (loss < 1.0) return { type: 'inaccuracy', label: 'Thiếu chính xác', loss };
  if (loss < 2.0) return { type: 'mistake', label: 'Sai lầm', loss };
  return { type: 'blunder', label: 'Blunder', loss };
}
