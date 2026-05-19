import { buildCoachPrompt } from '../prompts/coachPrompt.js';

function createMockAnswer({ fen, history = [], turn, playerLevel, question }) {
  const sideToMove = turn === 'w' ? 'Trắng' : 'Đen';
  const moveCount = Array.isArray(history) ? history.length : 0;
  const simpleMode = ['noob', 'beginner'].includes(playerLevel);

  return `${sideToMove} đi. Ván đã có ${moveCount} nước.
${simpleMode ? 'Ưu tiên: không treo quân, phát triển mã/tượng, giữ vua an toàn.' : 'Ưu tiên: kiểm tra chiếu, ăn quân, đe dọa trước khi chọn kế hoạch.'}
Việc cần làm: chọn 1 nước cải thiện quân và không tạo điểm yếu mới.`;
}

async function callOpenAI(prompt) {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Bạn là huấn luyện viên cờ vua chuyên nghiệp, trả lời bằng tiếng Việt. Trả lời tối đa 3 dòng, không mở bài, không disclaimer.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
      max_tokens: 220,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI provider error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim();
}

export async function getCoachResponse(payload) {
  const prompt = buildCoachPrompt(payload);

  if (!process.env.AI_API_KEY) {
    return {
      answer: createMockAnswer(payload),
      isMock: true,
    };
  }

  const answer = await callOpenAI(prompt);
  return {
    answer: answer || createMockAnswer(payload),
    isMock: false,
  };
}
