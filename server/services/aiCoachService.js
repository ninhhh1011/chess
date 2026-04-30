import { buildCoachPrompt } from '../prompts/coachPrompt.js';

function createMockAnswer({ fen, history = [], turn, playerLevel, question }) {
  const sideToMove = turn === 'w' ? 'Trắng' : 'Đen';
  const moveCount = Array.isArray(history) ? history.length : 0;
  const simpleMode = ['noob', 'beginner'].includes(playerLevel);

  return `Mình đang chạy ở chế độ mock vì backend chưa có AI_API_KEY.

**Tình hình nhanh**
- Lượt đi: ${sideToMove}
- Số nước đã đi: ${moveCount}
- FEN hiện tại: ${fen || 'chưa nhận được'}

**Gợi ý học tập**
${simpleMode
  ? '- Hãy kiểm tra vua của bạn có an toàn không.\n- Ưu tiên phát triển mã/tượng, nhập thành sớm và đừng để quân bị ăn miễn phí.\n- Trước khi đi, tự hỏi: “nước này có bị đối thủ ăn quân không?”'
  : '- Xác định candidate moves theo forcing moves: check, capture, threat.\n- Đánh giá king safety, pawn structure và các quân chưa phát triển.\n- Tìm tactical motifs như fork, pin hoặc discovered attack nếu có.'}

**Về câu hỏi của bạn**
“${question}”

Để có đánh giá nước đi chính xác như engine, nên tích hợp thêm Stockfish. Còn hiện tại mình có thể giải thích nguyên tắc và kế hoạch dựa trên thế cờ.`;
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
        { role: 'system', content: 'Bạn là huấn luyện viên cờ vua chuyên nghiệp, trả lời bằng tiếng Việt.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 900,
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
