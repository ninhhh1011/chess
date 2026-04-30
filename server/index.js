import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import coachRouter from './routes/coach.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'vua-co-ai-coach' });
});

app.use('/api/coach', coachRouter);

app.listen(PORT, () => {
  console.log(`AI Coach backend running at http://localhost:${PORT}`);
});
