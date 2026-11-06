/** Express local transport; business behavior lives in api/coachHandler.js. */
import { Router } from 'express';
import {
  checkCoachRateLimit,
  getCoachResponse,
} from '../../api/coachHandler.js';
import { CoachRequestError, MAX_COACH_BODY_BYTES } from '../../shared/coachContract.js';

const router = Router();

router.post('/', async (req, res) => {
  if (Buffer.byteLength(JSON.stringify(req.body ?? null), 'utf8') > MAX_COACH_BODY_BYTES) {
    return res.status(413).json({ error: 'Request too large' });
  }
  if (!checkCoachRateLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });

  try {
    return res.json(await getCoachResponse(req.body));
  } catch (error) {
    if (error instanceof CoachRequestError) {
      return res.status(error.status).json({
        error: error.message,
        ...(error.message === 'Unsupported schema version' ? { supported: 'coach.v1' } : {}),
      });
    }
    return res.status(503).json({ error: 'Coach is unavailable' });
  }
});

router.all('/', (_req, res) => res.status(405).json({ error: 'Method not allowed' }));

export default router;
