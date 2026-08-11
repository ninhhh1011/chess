import { askMockCoach, explainMockPosition, getMockHint, reviewMockGame } from './mockCoachService';
import { getEmbeddingCached } from './embeddingService.js';
import { searchAll } from './vectorSearchService.js';
import type { CoachPayload, CoachResponse, CoachLevel } from '../types/ChessTypes';

/**
 * Fallback to mock coach when AI is unavailable
 */
function fallbackMock(payload: CoachPayload): string {
  const mockPayload = {
    question: payload.message,
    fen: payload.fen,
    history: payload.history,
    level: payload.level,
  };

  switch (payload.mode) {
    case 'hint':
      return getMockHint(mockPayload);
    case 'explain_position':
      return explainMockPosition(mockPayload);
    case 'review_game':
      return reviewMockGame(mockPayload);
    default:
      return askMockCoach(mockPayload);
  }
}

/**
 * Compact payload to reduce token usage
 */
function compactPayload(payload: CoachPayload): Record<string, unknown> {
  return {
    message: payload.message,
    fen: payload.fen || '',
    history: Array.isArray(payload.history) ? payload.history.slice(-20) : [],
    pgn: payload.pgn ? String(payload.pgn).slice(-2500) : '',
    userProfile: payload.userProfile || {},
    recommendations: payload.recommendations || {},
    stockfish: payload.stockfish || null,
    openingContext: null,
    responseStyle: 'very_short',
    level: payload.level,
    mode: payload.mode,
  };
}

/**
 * Map user level to ELO range for RAG search
 */
function eloFromLevel(level: CoachLevel): [number, number] {
  const map: Record<CoachLevel, [number, number]> = {
    noob: [400, 800],
    beginner: [800, 1200],
    intermediate: [1200, 1800],
    advanced: [1800, 2400],
  };
  return map[level] || [400, 2400];
}

/**
 * Enhance payload with RAG context from chess knowledge base
 */
async function enhanceWithRAG(payload: CoachPayload): Promise<CoachPayload & { contextPrompt: string }> {
  const { message, userProfile } = payload;

  const embedding = await getEmbeddingCached(message || '');
  if (!embedding) {
    return { ...payload, contextPrompt: '' };
  }

  const currentLevel = userProfile?.currentLevel as unknown as CoachLevel | undefined;
  const searchResults = await searchAll(embedding, {
    limit: 3,
    eloRange: currentLevel ? eloFromLevel(currentLevel) : undefined,
  });

  const searchResultsTyped = searchResults as Record<string, Array<{ chunk_text: string }>>;
  const citations: { category: string; text: string }[] = [];
  for (const [category, chunks] of Object.entries(searchResultsTyped)) {
    for (const chunk of chunks || []) {
      citations.push({
        category,
        text: chunk.chunk_text.substring(0, 300),
      });
    }
  }

  const contextPrompt = buildContextPrompt(citations);
  return { ...payload, contextPrompt };
}

function buildContextPrompt(citations: { category: string; text: string }[]): string {
  if (!citations.length) return '';

  const grouped = citations.reduce(
    (acc, c) => {
      if (!acc[c.category]) acc[c.category] = [];
      acc[c.category].push(c.text);
      return acc;
    },
    {} as Record<string, string[]>
  );

  const labels: Record<string, string> = {
    opening: 'Khai cuộc liên quan',
    tactic: 'Chiến thuật liên quan',
    principle: 'Nguyên tắc liên quan',
    endgame: 'Tàn cuộc liên quan',
  };

  const sections = Object.entries(grouped)
    .map(([category, texts]) => {
      const label = labels[category] || category;
      return `${label}:\n${texts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`;
    })
    .join('\n\n');

  return `\n\nKiến thức tham khảo (RAG):\n${sections}`;
}

/**
 * Ask the AI Coach with RAG enhancement and fallback
 * Silent fallback: if AI fails, use mock without showing error
 */
export async function askAICoach(payload: CoachPayload): Promise<CoachResponse> {
  // Step 1: Enhance with RAG context
  const enhanced = await enhanceWithRAG(payload);

  // Step 2: Call Claude API
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(compactPayload(enhanced)),
    });

    window.clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Coach API error');
    }

    const data = await response.json();

    if (data.success && data.reply) {
      return {
        reply: data.reply,
        source: 'ai',
        suggestedActions: data.suggestedActions || [],
      };
    }

    // API returned but no reply - use fallback
    return {
      reply: fallbackMock(payload),
      source: 'fallback',
      suggestedActions: [],
    };
  } catch {
    window.clearTimeout(timeoutId);
    // Silent fallback - user doesn't see error
    return {
      reply: fallbackMock(payload),
      source: 'fallback',
      suggestedActions: [],
    };
  }
}
