import express from 'express';
import path from 'node:path';

const app = express();
const root = process.cwd();

app.post('/api/coach', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const upstream = await fetch('http://127.0.0.1:3001/api/coach', {
    method: 'POST',
    headers: { 'content-type': req.get('content-type') || 'application/json' },
    body: req.body,
  });
  res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json');
  res.send(await upstream.text());
});

app.use(express.static(path.join(root, 'dist')));
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(root, 'dist', 'index.html'));
});

app.listen(4181, '127.0.0.1', () => {
  console.log('Production dist host listening at http://127.0.0.1:4181');
});
