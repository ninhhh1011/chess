import { Router } from 'express';
import { getCoachResponse } from '../services/aiCoachService.js';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { fen, pgn, history, turn, playerLevel, question, status } = req.body || {};

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Thiếu câu hỏi cho AI Coach.' });
    }

    const result = await getCoachResponse({
      fen,
      pgn,
      history: Array.isArray(history) ? history : [],
      turn,
      playerLevel,
      question,
      status,
    });

    return res.json(result);
  } catch (error) {
    console.error('[coach] chat error:', error);
    return res.status(500).json({ error: 'AI Coach đang gặp lỗi. Vui lòng thử lại sau.' });
  }
});

export default router;
