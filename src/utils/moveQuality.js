import { getSanFromUci } from './chessMoveUtils';

export const MOVE_QUALITY = {
  brilliant: {
    symbol: '!!',
    label: 'Thiên tài',
    shortLabel: 'Thiên tài',
    tone: 'brilliant',
  },
  great: {
    symbol: '!',
    label: 'Tuyệt',
    shortLabel: 'Tuyệt',
    tone: 'great',
  },
  best: {
    symbol: '✓',
    label: 'Tốt nhất',
    shortLabel: 'Tốt nhất',
    tone: 'best',
  },
  good: {
    symbol: '',
    label: 'Tốt',
    shortLabel: 'Tốt',
    tone: 'good',
  },
  inaccuracy: {
    symbol: '?!',
    label: 'Không chính xác',
    shortLabel: 'Lệch',
    tone: 'inaccuracy',
  },
  mistake: {
    symbol: '?',
    label: 'Sai lầm',
    shortLabel: 'Sai',
    tone: 'mistake',
  },
  blunder: {
    symbol: '??',
    label: 'Ngu ngốc',
    shortLabel: 'Blunder',
    tone: 'blunder',
  },
  pending: {
    symbol: '...',
    label: 'Đang phân tích',
    shortLabel: 'Đang phân tích',
    tone: 'pending',
  },
};

function evaluationForColor(analysis, color) {
  if (!analysis?.evaluation) return 0;
  const whitePawns =
    analysis.evaluation.type === 'mate'
      ? analysis.evaluation.value > 0
        ? 99
        : -99
      : (Number(analysis.evaluation.value) || 0) / 100;
  return color === 'w' ? whitePawns : -whitePawns;
}

export function classifyMoveAnnotation({ before, after, playedUci, playedSan, color }) {
  const beforeForMover = evaluationForColor(before, color);
  const afterForMover = evaluationForColor(after, color);
  const delta = afterForMover - beforeForMover;
  const loss = Math.max(0, -delta);
  
  const playedBestMove = Boolean(before?.bestMove && playedUci === before.bestMove);
  const bestSan = before?.bestMove ? getSanFromUci(before.fen, before.bestMove) : null;

  let qualityKey = 'good';

  if ((playedBestMove && delta >= 1.5) || delta >= 2.2) {
    qualityKey = 'brilliant';
  } else if (playedBestMove || loss < 0.15) {
    qualityKey = 'great';
  } else if (loss < 0.25) {
    qualityKey = 'best';
  } else if (loss < 0.6) {
    qualityKey = 'good';
  } else if (loss < 1.2) {
    qualityKey = 'inaccuracy';
  } else if (loss < 2.2) {
    qualityKey = 'mistake';
  } else {
    qualityKey = 'blunder';
  }

  const quality = MOVE_QUALITY[qualityKey];

  return {
    symbol: quality.symbol,
    label: quality.label,
    shortLabel: quality.shortLabel,
    tone: quality.tone,
    loss,
    bestSan,
    playedSan,
  };
}
