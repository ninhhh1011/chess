/**
 * Coach Service - Canonical Endpoint
 *
 * Single endpoint for all coach requests.
 * Production: POST /api/coach
 * Fallback: Deterministic basic explanation
 *
 * Schema version: coach.v1
 */

import type { CoachLevel } from '../types/ChessTypes';

// Coach response schema v1
export interface CoachResponseV1 {
  schemaVersion: 'v1';
  reply: string;
  source: 'llm' | 'basic' | 'unavailable';
  engineSource: 'stockfish_wasm' | 'fallback' | 'none';
  knowledgeSource: 'none';
  suggestedActions: Array<{
    type: string;
    targetId?: string;
    label: string;
  }>;
}

// Coach payload - canonical v1
export interface CoachPayloadV1 {
  schemaVersion: 'v1';
  question: string;
  fen?: string;
  history?: string[];
  pgn?: string;
  playerLevel: CoachLevel;
  responseStyle?: 'short' | 'medium' | 'detailed';
}

// Legacy input adapter
export interface CoachPayloadLegacy {
  question: string;
  fen?: string;
  playerLevel?: CoachLevel;
}

// Provider configuration
interface CoachConfig {
  endpoint: string;
  timeout: number;
}

/**
 * Get coach configuration based on environment
 */
function getCoachConfig(): CoachConfig {
  // In production (Vercel), use /api/coach
  // In dev, proxy through Vite to localhost:3001
  const isProduction = import.meta.env.PROD;

  if (isProduction) {
    return {
      endpoint: '/api/coach',
      timeout: 20000,
    };
  }

  // Dev: proxy to local Express server or use basic fallback
  const hasLocalServer = import.meta.env.VITE_USE_LOCAL_COACH === 'true';

  if (hasLocalServer) {
    return {
      endpoint: '/api/coach',
      timeout: 20000,
    };
  }

  // No provider available, use basic
  return {
    endpoint: '',
    timeout: 0,
  };
}

/**
 * Generate deterministic basic explanation
 * NEVER echoes prompts, FEN, or internal instructions
 * Accepts both legacy input and canonical v1 payload
 */
function generateBasicExplanation(
  payload: { question: string; fen?: string; playerLevel: CoachLevel; responseStyle?: 'short' | 'medium' | 'detailed' }
): CoachResponseV1 {
  const { question, fen, playerLevel } = payload;

  // Extract key concepts from question (without repeating it)
  const hasEngineData = !!fen;
  const levelLabel = {
    noob: 'người mới',
    beginner: 'người mới bắt đầu',
    intermediate: 'người chơi trung cấp',
    advanced: 'người chơi nâng cao',
  }[playerLevel] || 'người mới';

  let reply = '';

  // General chess advice based on question type
  const q = question.toLowerCase();

  if (q.includes('nước đi') || q.includes('move') || q.includes('đi nào')) {
    reply = hasEngineData
      ? `Với trình độ ${levelLabel}, hãy ưu tiên nước phát triển quân hoặc kiểm soát trung tâm.`
      : `Hãy kiểm tra các nước chiếu, ăn quân, và đe dọa trước khi chọn nước đi.`;
  } else if (q.includes('khai cuộc') || q.includes('opening')) {
    reply = `Với ${levelLabel}, nên bắt đầu với các khai cuộc đơn giản như Italian Game hoặc London System.`;
  } else if (q.includes('tactic') || q.includes('đòn')) {
    reply = `Tìm các nước forcing: chiếu, ăn quân, hoặc tạo đe dọa kép.`;
  } else if (q.includes('endgame') || q.includes('tàn cuộc')) {
    reply = `Trong tàn cuộc, hãy đưa vua ra hoạt động và ưu tiên phong cấp tốt.`;
  } else {
    reply = `Hãy tập trung vào nguyên tắc cơ bản: an toàn vua, phát triển quân, kiểm soát trung tâm.`;
  }

  return {
    schemaVersion: 'v1',
    reply,
    source: 'basic',
    engineSource: hasEngineData ? 'fallback' : 'none',
    knowledgeSource: 'none',
    suggestedActions: [
      { type: 'exercise', label: 'Luyện bài tập cơ bản' },
    ],
  };
}

/**
 * Call coach API with proper error handling
 */
async function callCoachAPI(config: CoachConfig, payload: CoachPayloadV1): Promise<CoachResponseV1> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    window.clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Coach API error: ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (data.schemaVersion === 'coach.v1') {
      return data as CoachResponseV1;
    }

    // Handle legacy response shape
    return {
      schemaVersion: 'v1',
      reply: data.reply || data.answer || 'Không có phản hồi',
      source: data.source === 'ai' ? 'llm' : 'basic',
      engineSource: 'none',
      knowledgeSource: 'none',
      suggestedActions: [],
    };
  } catch (error) {
    window.clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Coach request timeout', { cause: error });
    }
    throw error;
  }
}

/**
 * Ask the coach
 * Main entry point for coach functionality
 */
export async function askCoach(payload: Omit<CoachPayloadV1, 'schemaVersion'>): Promise<CoachResponseV1> {
  const config = getCoachConfig();

  // If no endpoint configured, use basic
  if (!config.endpoint) {
    return generateBasicExplanation(payload);
  }

  try {
    const fullPayload: CoachPayloadV1 = {
      ...payload,
      schemaVersion: 'v1',
    };
    return await callCoachAPI(config, fullPayload);
  } catch {
    // Provider failed, use basic with telemetry
    console.warn('[coach] Provider unavailable, using basic fallback');
    return generateBasicExplanation(payload);
  }
}

/**
 * Check coach availability status
 */
export function getCoachStatus(): { available: boolean; provider: 'llm' | 'basic' | 'unavailable' } {
  const config = getCoachConfig();

  if (!config.endpoint) {
    return { available: false, provider: 'unavailable' };
  }

  // In dev without local server, use basic
  if (!import.meta.env.PROD && import.meta.env.VITE_USE_LOCAL_COACH !== 'true') {
    return { available: false, provider: 'unavailable' };
  }

  return { available: true, provider: 'llm' };
}

export { generateBasicExplanation };
