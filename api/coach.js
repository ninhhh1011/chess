/**
 * Canonical Coach Endpoint - Vercel Edge Function
 * Schema: coach.v1
 *
 * Production runtime for Vercel deployment.
 * Uses shared coachHandler.js for business logic.
 */

export const config = {
  runtime: 'edge',
};

import { getCoachResponse } from './coachHandler.js';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { schemaVersion, question, fen, playerLevel } = body;

    // Validate schema version
    if (schemaVersion && schemaVersion !== 'coach.v1') {
      return new Response(JSON.stringify({
        error: 'Unsupported schema version',
        supported: 'coach.v1'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({
        error: 'Question is required',
        schemaVersion: 'coach.v1'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const response = await getCoachResponse({
      question,
      fen,
      playerLevel,
    });

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[coach] Error:', err);
    return new Response(JSON.stringify({
      error: 'Coach service error',
      schemaVersion: 'coach.v1',
      source: 'unavailable',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
