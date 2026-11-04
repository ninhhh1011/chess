import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import coachRouter from './routes/coach.js';

const app = express();
const PORT = process.env.PORT || 3088;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5188';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '8kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'vua-co-ai-coach' });
});

app.use('/api/coach', coachRouter);

app.use((error, _req, res, next) => {
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid request' });
  return next(error);
});

app.listen(PORT, () => {
  console.log(`AI Coach backend running at http://localhost:${PORT}`);
});
