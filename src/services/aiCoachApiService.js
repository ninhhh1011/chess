import { askMockCoach, explainMockPosition, getMockHint, reviewMockGame } from './mockCoachService';
import { getEmbeddingCached } from './embeddingService.js';
import { searchAll } from './vectorSearchService.js';

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
    responseStyle: payload.responseStyle || 'very_short',
  };
}

function buildContextPrompt(citations) {
  if (!citations || citations.length === 0) return '';

  const grouped = citations.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c.text);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .map(([category, texts]) => {
      const label = {
        opening: 'Khai cuộc liên quan',
        tactic: 'Chiến thuật liên quan',
        principle: 'Nguyên tắc liên quan',
        endgame: 'Tàn cuộc liên quan',
      }[category] || category;
      return `${label}:\n${texts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`;
    })
    .join('\n\n');

  return `\n\nKiến thức tham khảo (RAG):\n${sections}`;
}

function eloFromLevel(level) {
  const map = {
    noob: [400, 800],
    beginner: [800, 1200],
    intermediate: [1200, 1800],
    advanced: [1800, 2400],
  };
  return map[level] || [400, 2400];
}

async function enhanceWithRAG(payload) {
  const { message, userProfile } = payload;
  const embedding = await getEmbeddingCached(message || '');

  if (!embedding) {
    return { ...payload, contextPrompt: '' };
  }

  const searchResults = await searchAll(embedding, {
    limit: 3,
    eloRange: userProfile?.currentLevel ? eloFromLevel(userProfile.currentLevel) : undefined,
  });

  const citations = [];
  for (const [category, chunks] of Object.entries(searchResults)) {
    for (const chunk of chunks || []) {
      citations.push({
        category,
        text: chunk.chunk_text.substring(0, 300),
      });
    }
  }

  return {
    ...payload,
    contextPrompt: buildContextPrompt(citations),
  };
}

export async function askAICoach(payload) {
  // Step 1: Enhance payload with RAG context
  const enhancedPayload = await enhanceWithRAG(payload);

  // Step 2: Call Claude API
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(compactPayload(enhancedPayload)),
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
