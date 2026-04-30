import { askMockCoach, explainMockPosition, getMockHint, reviewMockGame } from './mockCoachService';

function fallbackMock(payload) {
  const mockPayload = { question: payload.message, fen: payload.fen, history: payload.history, level: payload.level };
  if (payload.mode === 'hint') return getMockHint(mockPayload);
  if (payload.mode === 'explain_position') return explainMockPosition(mockPayload);
  if (payload.mode === 'review_game') return reviewMockGame(mockPayload);
  return askMockCoach(mockPayload);
}

function compactPayload(payload = {}) {
  return {
    ...payload,
    history: Array.isArray(payload.history) ? payload.history.slice(-20) : [],
    pgn: payload.pgn ? String(payload.pgn).slice(-2500) : '',
    userProfile: payload.userProfile || {},
    recommendations: payload.recommendations || {},
    stockfish: payload.stockfish || null,
    openingContext: payload.openingContext || null,
  };
}

export async function askAICoach(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(compactPayload(payload)),
    });
    window.clearTimeout(timeout);

    if (!response.ok) throw new Error('Coach API lỗi mạng.');
    const data = await response.json();
    if (data.success && data.reply) return { reply: data.reply, source: data.source || 'ai', suggestedActions: data.suggestedActions || [] };

    return { reply: fallbackMock(payload), source: data.source === 'fallback' ? 'fallback' : 'mock', suggestedActions: [] };
  } catch (error) {
    window.clearTimeout(timeout);
    return { reply: fallbackMock(payload), source: 'mock', suggestedActions: [] };
  }
}
