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
