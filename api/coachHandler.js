/**
 * Shared Coach Handler
 *
 * Single source of truth for coach business logic.
 * Used by both Vercel Edge Function and Express server.
 */

const AI_PROVIDER = process.env.AI_PROVIDER || 'anthropic';
const AI_MODEL = process.env.AI_MODEL || 'claude-3-haiku-20240307';
const AI_API_KEY = process.env.VITE_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY;

/**
 * Create deterministic basic explanation
 * NEVER echoes prompts, FEN, or internal instructions
 */
export function createBasicAnswer({ playerLevel = 'beginner', question = '' }) {
  const levelLabel = {
    noob: 'người mới',
    beginner: 'người mới bắt đầu',
    intermediate: 'người chơi trung cấp',
    advanced: 'người chơi nâng cao',
  }[playerLevel] || 'người mới';

  const q = question.toLowerCase();

  if (q.includes('nước đi') || q.includes('move')) {
    return `Với trình độ ${levelLabel}, hãy ưu tiên nước phát triển quân hoặc kiểm soát trung tâm.`;
  } else if (q.includes('khai cuộc') || q.includes('opening')) {
    return `Với ${levelLabel}, nên bắt đầu với các khai cuộc đơn giản như Italian Game hoặc London System.`;
  } else if (q.includes('tactic') || q.includes('đòn')) {
    return `Tìm các nước forcing: chiếu, ăn quân, hoặc tạo đe dọa kép.`;
  } else if (q.includes('endgame') || q.includes('tàn cuộc')) {
    return `Trong tàn cuộc, hãy đưa vua ra hoạt động và ưu tiên phong cấp tốt.`;
  } else {
    return `Hãy tập trung vào nguyên tắc cơ bản: an toàn vua, phát triển quân, kiểm soát trung tâm.`;
  }
}

/**
 * Build system prompt (internal, never exposed to client)
 */
function buildSystemPrompt() {
  return `Bạn là HLV cờ vua cá nhân của người mới học.
Trả lời bằng tiếng Việt, giọng chuyên môn nhưng có chút meme nhẹ kiểu Ninh.
Chỉ trả lời đúng format:
1. <1 ý chính>

Không quá 45 từ.
Không marketing.
Không nói lan man.`;
}

/**
 * Call AI provider
 * @returns {Promise<string>} Reply text
 */
export async function callAIProvider(prompt) {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY not configured');
  }

  const systemPrompt = buildSystemPrompt();

  if (AI_PROVIDER === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || '';
  }

  throw new Error(`Unsupported AI provider: ${AI_PROVIDER}`);
}

/**
 * Get coach response using shared handler
 * @param {Object} params
 * @param {string} params.question - User question
 * @param {string} [params.fen] - Current FEN position
 * @param {string} [params.playerLevel] - Player level
 * @returns {Promise<Object>} Coach response v1
 */
export async function getCoachResponse({ question, fen, playerLevel = 'beginner' }) {
  let reply;
  let source;

  if (!AI_API_KEY) {
    // No API key - use basic fallback
    reply = createBasicAnswer({ playerLevel, question });
    source = 'basic';
  } else {
    try {
      reply = await callAIProvider(question);
      source = 'llm';
    } catch (error) {
      // Provider failed - use basic fallback
      console.error('[coach] Provider error:', error.message);
      reply = createBasicAnswer({ playerLevel, question });
      source = 'basic';
    }
  }

  return {
    schemaVersion: 'coach.v1',
    reply,
    source,
    engineSource: 'none',
    knowledgeSource: 'none',
    suggestedActions: [
      { type: 'exercise', label: 'Luyện bài tập cơ bản' },
    ],
  };
}
