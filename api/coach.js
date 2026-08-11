export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.VITE_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API Key' }), { status: 500 });
  }

  try {
    const { message, history, fen, pgn, stockfish, turn, status, contextPrompt } = await req.json();

    const systemPrompt = `Bạn là AI Chess Coach cho app "Vua Cờ".

Nhiệm vụ:
- Huấn luyện người chơi cờ vua từ noob đến advanced.
- Trả lời bằng tiếng Việt.
- Giải thích ngắn gọn, dễ hiểu, đúng trình độ.
- Không chỉ đưa đáp án, phải dạy tư duy.
- Không bịa luật cờ.
- Nếu có context từ RAG, dùng nó như nguồn tham khảo chính.
- Không trích dẫn trực tiếp - hãy tích hợp tự nhiên.

Format: Tối đa 3 dòng, mỗi dòng 1 ý. Không disclaimer.${contextPrompt ? `\n\n${contextPrompt}` : ''}

Dữ liệu ván:
- FEN: ${fen || 'N/A'}
- PGN: ${pgn || 'N/A'}
- Stockfish: ${stockfish ? JSON.stringify(stockfish) : 'N/A'}
- Trạng thái: ${status || 'N/A'}
- Lượt: ${turn || 'N/A'}`;

    const claudePayload = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ],
      stream: false
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudePayload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await response.json();
    const replyText = data.content?.[0]?.text || '';

    return new Response(JSON.stringify({ success: true, reply: replyText, source: 'ai' }), {
      headers: {
        'Content-Type': 'application/json'
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
