import express from 'express';
import coachRouter from './coach.js';

test('canonical Coach route returns JSON 405 for unsupported Express methods', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/coach', coachRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/coach`);
    expect(response.status).toBe(405);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'Method not allowed' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('validates bounded question and FEN before returning a Coach answer', async () => {
  const app = express();
  app.use(express.json({ limit: '8kb' }));
  app.use('/api/coach', coachRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/coach`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schemaVersion: 'coach.v1', question: 'Analyze this', fen: 'not-a-fen' }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid position' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('rejects unsupported Coach context fields instead of ignoring them', async () => {
  const app = express();
  app.use(express.json({ limit: '8kb' }));
  app.use('/api/coach', coachRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/coach`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schemaVersion: 'coach.v1', question: 'Analyze this', history: ['e4'] }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Unsupported request field' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
