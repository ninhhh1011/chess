import { getEmbeddingCached } from './embeddingService.js';
import { searchAll } from './vectorSearchService.js';
import { askAICoach } from './aiCoachApiService.js';
import { askMockCoach } from './mockCoachService.js';

function extractCitations(results) {
  const citations = [];
  for (const [category, chunks] of Object.entries(results)) {
    for (const chunk of chunks || []) {
      citations.push({
        category,
        subcategory: chunk.subcategory,
        text: chunk.chunk_text.substring(0, 200) + (chunk.chunk_text.length > 200 ? '...' : ''),
      });
    }
  }
  return citations;
}

function buildContextPrompt(citations) {
  if (citations.length === 0) return '';

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

  return `\n\nKiến thức tham khảo từ cơ sở dữ liệu (RAG):\n${sections}\n\nDùng kiến thức trên để trả lời chính xác hơn nhưng đừng trích dẫn trực tiếp - hãy tích hợp tự nhiên vào câu trả lời.`;
}

export async function queryRAG(params) {
  const { question, fen, history, userProfile, stockfish } = params;

  // Step 1: Generate embedding for the question
  const embedding = await getEmbeddingCached(question || '');
  if (!embedding) {
    // No embedding available — fall back to plain AI coach
    return await askAICoach(params);
  }

  // Step 2: Search knowledge base across all categories
  const searchResults = await searchAll(embedding, {
    limit: 3,
    eloRange: userProfile?.currentLevel ? eloFromLevel(userProfile.currentLevel) : undefined,
  });

  const citations = extractCitations(searchResults);
  const contextPrompt = buildContextPrompt(citations);

  // Step 3: Inject context into the prompt and call Claude
  const enhancedPayload = {
    ...params,
    contextPrompt,
  };

  const aiResult = await askAICoach(enhancedPayload);

  if (!aiResult?.reply) {
    // AI failed — fall back to mock
    return {
      reply: askMockCoach(params),
      source: 'mock_fallback',
      citations,
    };
  }

  return {
    reply: aiResult.reply,
    source: citations.length > 0 ? 'ai_rag' : 'ai',
    citations,
  };
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
