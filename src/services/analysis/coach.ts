/**
 * Phase 1 Coach - Engine-Backed Analysis
 *
 * Coach only interprets from AnalysisFactV1 data.
 * Does NOT invent moves, evals, or opening names.
 */

import type { AnalysisFactV1, GameAnalysis } from '../../types/analysis';

interface CoachContext {
  /** Facts from engine analysis */
  facts: AnalysisFactV1[];
  /** Top mistakes for focused coaching */
  topMistakes: string[];
  /** Player side */
  playerSide: 'w' | 'b';
  /** Available move context */
  moveContext?: {
    played: string;
    best: string;
    ply: number;
    fen: string;
  };
}

interface CoachResponse {
  reply: string;
  suggestions: string[];
  moveHint?: string;
}

/**
 * Generate coach explanation from analysis facts
 * ONLY uses data from engine analysis - no invented information
 */
export function generateCoachExplanation(
  context: CoachContext,
  question?: string
): CoachResponse {
  const { facts, topMistakes, playerSide } = context;

  // No analysis yet
  if (!facts || facts.length === 0) {
    return {
      reply: 'Chưa có dữ liệu phân tích engine. Hoàn thành một ván cờ để nhận gợi ý cá nhân.',
      suggestions: ['Chơi một ván để có dữ liệu'],
    };
  }

  // Check if asking about a specific move
  if (context.moveContext) {
    return explainMistake(context.moveContext, facts);
  }

  // General coaching based on mistakes
  return generateMistakeSummary(facts, topMistakes, playerSide);
}

/**
 * Explain a specific mistake
 */
function explainMistake(
  moveContext: NonNullable<CoachContext['moveContext']>,
  facts: AnalysisFactV1[]
): CoachResponse {
  const { played, best, ply } = moveContext;
  const fact = facts.find(f => f.ply === ply);

  if (!fact) {
    return {
      reply: 'Không có dữ liệu cho nước đi này.',
      suggestions: [],
    };
  }

  const cpl = fact.centipawnLoss;
  const classification = fact.classification;
  const tags = fact.skillTags;

  // Build explanation from actual data
  const parts: string[] = [];

  // Classification-based coaching
  if (classification === 'blunder') {
    parts.push('Đây là một sai lầm nghiêm trọng.');
    if (cpl !== null) {
      parts.push(`Mất khoảng ${Math.round(cpl / 100)} quân cờ vì nước này.`);
    }
  } else if (classification === 'mistake') {
    parts.push('Đây là một nước đi không tốt.');
    if (cpl !== null) {
      parts.push(`Centspawn loss khoảng ${cpl}.`);
    }
  } else if (classification === 'inaccuracy') {
    parts.push('Có nước tốt hơn một chút.');
  }

  // Tag-based coaching
  if (tags.includes('hung_piece')) {
    parts.push('Quân của bạn đang bị treo - có thể bị ăn mà không bị phạt ngay.');
  }
  if (tags.includes('back_rank')) {
    parts.push('Cẩn thận hàng cuối! Vua có thể bị chiếu hết từ hàng đầu tiên.');
  }
  if (tags.includes('opening_principle')) {
    parts.push('Vi phạm nguyên tắc khai cuộc: phát triển quân, chiếm giữ trung tâm, an toàn vua.');
  }
  if (tags.includes('tactical_oversight')) {
    parts.push('Có vẻ bỏ lỡ một đòn tấn công hoặc phòng thủ quan trọng.');
  }
  if (tags.includes('endgame_conversion')) {
    parts.push('Trong tàn cuộc, cần chú ý cách chuyển thế thắng thành công.');
  }

  // Best move hint
  if (best && best !== played) {
    parts.push(`Nước tốt hơn: ${best}.`);
  }

  // Fallback if no specific guidance
  if (parts.length === 0) {
    parts.push('Hãy xem lại vị trí này và tìm nước đi tốt hơn.');
  }

  const reply = parts.join(' ');

  const suggestions: string[] = [];
  if (tags.includes('opening_principle')) {
    suggestions.push('Luyện nguyên tắc khai cuộc');
  }
  if (tags.includes('tactical_oversight')) {
    suggestions.push('Tập bài tập chiến thuật');
  }
  suggestions.push('Xem lại vị trí với engine');

  return {
    reply,
    suggestions,
    moveHint: best !== played ? best : undefined,
  };
}

/**
 * Generate summary of mistakes
 */
function generateMistakeSummary(
  facts: AnalysisFactV1[],
  topMistakes: string[],
  playerSide: 'w' | 'b'
): CoachResponse {
  const mistakes = facts.filter(f =>
    ['mistake', 'blunder', 'inaccuracy'].includes(f.classification)
  );

  const blunders = mistakes.filter(f => f.classification === 'blunder');
  const errors = mistakes.filter(f => f.classification === 'mistake');
  const inaccuracies = mistakes.filter(f => f.classification === 'inaccuracy');

  const parts: string[] = [];

  if (mistakes.length === 0) {
    return {
      reply: 'Chơi tốt lắm! Không có sai lầm đáng kể trong ván này.',
      suggestions: ['Tiếp tục luyện tập'],
    };
  }

  // Summary
  parts.push(`Trong ván này bạn có ${mistakes.length} nước không tốt.`);

  if (blunders.length > 0) {
    parts.push(`${blunders.length} sai lầm nghiêm trọng.`);
  }
  if (errors.length > 0) {
    parts.push(`${errors.length} nước yếu.`);
  }
  if (inaccuracies.length > 0) {
    parts.push(`${inaccuracies.length} nước chưa tối ưu.`);
  }

  // Focus on top mistakes
  if (topMistakes.length > 0) {
    parts.push(`Hãy xem lại các nước: ${topMistakes.slice(0, 3).join(', ')}.`);
  }

  // Common patterns
  const tagCounts: Record<string, number> = {};
  mistakes.forEach(f => {
    f.skillTags.forEach(tag => {
      if (tag !== 'unclassified') {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
  });

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  if (sortedTags.length > 0) {
    const [topTag, count] = sortedTags[0];
    parts.push(`Lỗi thường gặp: ${formatTag(topTag)} (${count} lần).`);
  }

  const reply = parts.join(' ');

  const suggestions: string[] = [];
  if (blunders.length > 0) suggestions.push('Luyện nhận diện sai lầm nghiêm trọng');
  if (tagCounts['tactical_oversight']) suggestions.push('Tập bài tập chiến thuật');
  if (tagCounts['opening_principle']) suggestions.push('Ôn nguyên tắc khai cuộc');
  suggestions.push('Xem lại ván với engine');

  return { reply, suggestions };
}

/**
 * Format tag for display
 */
function formatTag(tag: string): string {
  const labels: Record<string, string> = {
    hung_piece: 'Treo quân',
    missed_capture: 'Bỏ lỡ ăn quân',
    missed_mate: 'Bỏ lỡ chiếu hết',
    back_rank: 'Hàng cuối yếu',
    opening_principle: 'Khai cuộc yếu',
    king_safety: 'An toàn vua',
    tactical_oversight: 'Bỏ lỡ đòn',
    endgame_conversion: 'Chuyển thế yếu',
  };
  return labels[tag] || tag;
}

/**
 * Build context from GameAnalysis for coach
 */
export function buildCoachContext(
  analysis: GameAnalysis,
  focusedPly?: number
): CoachContext {
  return {
    facts: analysis.analysis,
    topMistakes: analysis.topMistakes,
    playerSide: analysis.playerSide,
    moveContext: focusedPly
      ? getMoveContext(analysis, focusedPly)
      : undefined,
  };
}

/**
 * Get move context for a specific ply
 */
function getMoveContext(
  analysis: GameAnalysis,
  ply: number
): CoachContext['moveContext'] | undefined {
  const fact = analysis.analysis.find(f => f.ply === ply);
  if (!fact) return undefined;

  return {
    ply,
    played: fact.playedMove.san,
    best: fact.bestMove.san,
    fen: fact.fenAfter,
  };
}
