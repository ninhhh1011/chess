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
    const { message, history, fen, pgn, stockfish, turn, status } = await req.json();

    const systemPrompt = `You are a chess coach. 
Current FEN: ${fen}
Current PGN: ${pgn}
Stockfish Evaluation: ${stockfish ? JSON.stringify(stockfish) : 'None'}
Status: ${status}
Turn: ${turn}

Keep responses short, clear, and focused on chess improvement. Use Vietnamese.`;

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
