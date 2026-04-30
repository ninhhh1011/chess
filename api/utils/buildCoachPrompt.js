function trimArray(value, max = 20) {
  return Array.isArray(value) ? value.slice(-max) : [];
}

function compactProfile(profile = {}) {
  return {
    currentLevel: profile.currentLevel,
    gamesPlayed: profile.gamesPlayed,
    exerciseStats: profile.exerciseStats,
    commonMistakes: trimArray(profile.commonMistakes, 12),
    strengths: trimArray(profile.strengths, 8),
    weaknesses: trimArray(profile.weaknesses, 8),
    openingStats: profile.openingStats,
  };
}

function compactStockfish(stockfish = null) {
  if (!stockfish) return null;
  return {
    bestMove: stockfish.bestMove,
    bestMoveSan: stockfish.bestMoveSan,
    evaluation: stockfish.evaluation,
    pv: trimArray(stockfish.pv, 8),
  };
}

export function buildCoachPayload(body = {}) {
  return {
    message: String(body.message || '').slice(0, 1200),
    mode: body.mode || 'chat',
    fen: body.fen || null,
    turn: body.turn || null,
    history: trimArray(body.history, 20),
    pgn: String(body.pgn || '').slice(-2500),
    playerColor: body.playerColor || 'white',
    level: body.level || body.userProfile?.currentLevel || 'beginner',
    userProfile: compactProfile(body.userProfile || {}),
    recommendations: body.recommendations || {},
    dailyTrainingPlan: body.dailyTrainingPlan || body.userProfile?.dailyTrainingPlan || null,
    stockfish: compactStockfish(body.stockfish),
    openingContext: body.openingContext || null,
  };
}

export function buildCoachUserPrompt(payload) {
  return `Mode yêu cầu: ${payload.mode}
Câu hỏi người dùng: ${payload.message}
Level: ${payload.level}
FEN: ${payload.fen || 'không có'}
Lượt đi: ${payload.turn || 'không rõ'}
Lịch sử 20 nước gần nhất: ${JSON.stringify(payload.history)}

User profile tóm tắt:
${JSON.stringify(payload.userProfile, null, 2)}

Recommendation hiện tại:
${JSON.stringify(payload.recommendations, null, 2)}

Daily training plan:
${JSON.stringify(payload.dailyTrainingPlan, null, 2)}

Stockfish result:
${JSON.stringify(payload.stockfish, null, 2)}

Opening context:
${JSON.stringify(payload.openingContext, null, 2)}

PGN rút gọn:
${payload.pgn || 'không có'}

Hãy trả lời đúng format, bằng tiếng Việt, ngắn gọn, có tính huấn luyện và phù hợp level.`;
}
