import { getSanFromUci } from './chessMoveUtils';
import { COACH_TONE } from '../config/brand';
import { calculateMoverCPL, classifyMove } from '../services/analysis/orientation';

export const MOVE_QUALITY = {
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
    label: COACH_TONE.good,
    shortLabel: 'Ổn',
    tone: 'good',
  },
  inaccuracy: {
    symbol: '?!',
    label: COACH_TONE.inaccuracy,
    shortLabel: 'Thiếu lực',
    tone: 'inaccuracy',
  },
  mistake: {
    symbol: '?',
    label: COACH_TONE.mistake,
    shortLabel: 'Tự hủy',
    tone: 'mistake',
  },
  blunder: {
    symbol: '??',
    label: COACH_TONE.blunder,
    shortLabel: 'Mất quá nhiều',
    tone: 'blunder',
  },
  pending: {
    symbol: '...',
    label: 'Đang phân tích',
    shortLabel: 'Đang phân tích',
    tone: 'pending',
  },
};

export function classifyMoveAnnotation({ before, after, playedUci, playedSan, color }) {
  if (!before?.evaluation || !after?.evaluation) return null;
  const cpl = calculateMoverCPL(before.evaluation, after.evaluation, color);
  if (cpl === null) return null;
  const classification = classifyMove(cpl);

  const bestSan = before?.bestMove ? getSanFromUci(before.fen, before.bestMove) : null;
  const qualityKey = {
    best: 'best',
    excellent: 'great',
    good: 'good',
    inaccuracy: 'inaccuracy',
    mistake: 'mistake',
    blunder: 'blunder',
  }[classification];
  const quality = MOVE_QUALITY[qualityKey];
  if (!quality) return null;

  return {
    symbol: quality.symbol,
    label: quality.label,
    shortLabel: quality.shortLabel,
    tone: quality.tone,
    loss: cpl / 100,
    bestSan,
    playedSan,
  };
}
