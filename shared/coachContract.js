import { Chess } from 'chess.js';

const LEVELS = new Set(['noob', 'beginner', 'intermediate', 'advanced']);
const STYLES = new Set(['short', 'medium', 'detailed']);

export const MAX_COACH_BODY_BYTES = 8 * 1024;

export class CoachRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validateCoachRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new CoachRequestError('Invalid request');
  }
  const allowed = new Set(['schemaVersion', 'question', 'fen', 'playerLevel', 'responseStyle']);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new CoachRequestError('Unsupported request field');
  if (body.schemaVersion !== 'coach.v1') throw new CoachRequestError('Unsupported schema version');
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 1200) {
    throw new CoachRequestError('Invalid question');
  }
  if (body.playerLevel !== undefined && !LEVELS.has(body.playerLevel)) throw new CoachRequestError('Invalid player level');
  if (body.responseStyle !== undefined && !STYLES.has(body.responseStyle)) throw new CoachRequestError('Invalid response style');
  if (body.fen !== undefined) {
    if (typeof body.fen !== 'string' || body.fen.length > 120) throw new CoachRequestError('Invalid position');
    try { new Chess(body.fen); } catch { throw new CoachRequestError('Invalid position'); }
  }
  return {
    schemaVersion: 'coach.v1',
    question: body.question.trim(),
    ...(body.fen ? { fen: body.fen } : {}),
    playerLevel: body.playerLevel || 'beginner',
    responseStyle: body.responseStyle || 'short',
  };
}
