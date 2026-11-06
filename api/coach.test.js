import { describe, expect, it, vi } from 'vitest';
import handler from './coach.js';
import { MAX_COACH_BODY_BYTES } from '../shared/coachContract.js';

function streamRequest(body, { contentLength } = {}) {
  const bytes = new TextEncoder().encode(body);
  const bodyStream = new ReadableStream({
    start(controller) { controller.enqueue(bytes); controller.close(); },
  });
  const headers = new Headers({ 'x-forwarded-for': '192.0.2.10' });
  if (contentLength !== undefined) headers.set('content-length', String(contentLength));
  return new Request('https://example.test/api/coach', {
    method: 'POST', headers, body: bodyStream, duplex: 'half',
  });
}

describe('Vercel Coach transport body limit', () => {
  it('rejects an oversized streamed body without Content-Length', async () => {
    const response = await handler(streamRequest('x'.repeat(MAX_COACH_BODY_BYTES + 1)));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Request too large' });
  });

  it('checks actual bytes when Content-Length understates the body', async () => {
    const response = await handler(streamRequest('x'.repeat(MAX_COACH_BODY_BYTES + 1), { contentLength: 1 }));

    expect(response.status).toBe(413);
  });

  it('rejects a declared oversized body without reading it', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    const request = new Request('https://example.test/api/coach', {
      method: 'POST',
      headers: { 'content-length': String(MAX_COACH_BODY_BYTES + 1) },
      body,
      duplex: 'half',
    });

    const response = await handler(request);

    expect(response.status).toBe(413);
    expect(cancel).not.toHaveBeenCalled();
  });
});
