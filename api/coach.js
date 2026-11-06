/** Vercel production transport for the shared Coach handler. */
import {
  checkCoachRateLimit,
  getCoachResponse,
} from './coachHandler.js';
import { CoachRequestError, MAX_COACH_BODY_BYTES } from '../shared/coachContract.js';

export const config = { runtime: 'edge' };

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readBoundedBody(req) {
  const reader = req.body?.getReader();
  if (!reader) return '';

  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_COACH_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (declaredLength > MAX_COACH_BODY_BYTES) return json({ error: 'Request too large' }, 413);

  let bodyText;
  try { bodyText = await readBoundedBody(req); } catch { return json({ error: 'Invalid request' }, 400); }
  if (bodyText === null) return json({ error: 'Request too large' }, 413);
  if (!checkCoachRateLimit(req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim())) {
    return json({ error: 'Too many requests' }, 429);
  }

  let body;
  try { body = JSON.parse(bodyText); } catch { return json({ error: 'Invalid request' }, 400); }

  try {
    return json(await getCoachResponse(body), 200);
  } catch (error) {
    if (error instanceof CoachRequestError) {
      return json({ error: error.message, ...(error.message === 'Unsupported schema version' ? { supported: 'coach.v1' } : {}) }, error.status);
    }
    return json({ error: 'Coach is unavailable' }, 503);
  }
}
