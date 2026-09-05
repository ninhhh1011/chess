/**
 * Canonical Coach Endpoint - Express Server
 * Schema: coach.v1
 *
 * Local development runtime.
 * Uses shared coachHandler.js for business logic.
 */

import { Router } from 'express';
import { getCoachResponse } from '../../api/coachHandler.js';

const router = Router();

/**
 * Canonical coach endpoint: POST /api/coach
 * Schema: coach.v1
 */
router.post('/', async (req, res) => {
  try {
    const { schemaVersion, question, fen, playerLevel } = req.body || {};

    // Validate schema version
    if (schemaVersion && schemaVersion !== 'coach.v1') {
      return res.status(400).json({
        error: 'Unsupported schema version',
        supported: 'coach.v1'
      });
    }

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Question is required',
        schemaVersion: 'coach.v1'
      });
    }

    const result = await getCoachResponse({
      question,
      fen,
      playerLevel,
    });

    // Return canonical coach.v1 response
    return res.json(result);
  } catch (error) {
    console.error('[coach] Error:', error);
    return res.status(500).json({
      error: 'Coach service error',
      schemaVersion: 'coach.v1',
      source: 'unavailable',
    });
  }
});

export default router;
