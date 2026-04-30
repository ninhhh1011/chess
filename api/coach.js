import { coachSystemPrompt } from './prompts/coachSystemPrompt.js';
import { buildCoachPayload, buildCoachUserPrompt } from './utils/buildCoachPrompt.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { success: false, reply: 'Method not allowed', source: 'fallback', suggestedActions: [] });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return send(res, 200, { success: false, reply: 'AI hiện chưa khả dụng, đang dùng Coach cơ bản.', source: 'fallback', suggestedActions: [] });
  }

  try {
    const payload = buildCoachPayload(req.body || {});
    if (!payload.message) return send(res, 400, { success: false, reply: 'Thiếu câu hỏi cho AI Coach.', source: 'fallback', suggestedActions: [] });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: coachSystemPrompt },
          { role: 'user', content: buildCoachUserPrompt(payload) },
        ],
        temperature: 0.45,
        max_tokens: 900,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const sourceMessage = response.status === 429 ? 'AI đang bị giới hạn lượt gọi, đang dùng Coach cơ bản.' : 'AI API đang lỗi, đang dùng Coach cơ bản.';
      return send(res, 200, { success: false, reply: sourceMessage, source: 'fallback', suggestedActions: [] });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return send(res, 200, { success: false, reply: 'AI chưa trả lời được, đang dùng Coach cơ bản.', source: 'fallback', suggestedActions: [] });

    return send(res, 200, { success: true, reply, source: 'ai', suggestedActions: [] });
  } catch (error) {
    return send(res, 200, { success: false, reply: 'AI hiện chưa khả dụng, đang dùng Coach cơ bản.', source: 'fallback', suggestedActions: [] });
  }
}
