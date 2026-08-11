import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function embed(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function seed() {
  const chunks = JSON.parse(readFileSync('chunks.json', 'utf8'));
  console.log(`Embedding ${chunks.length} chunks...`);

  const BATCH_SIZE = 5;
  let inserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const enriched = await Promise.all(
      batch.map(async (chunk) => ({
        category: chunk.category,
        subcategory: chunk.subcategory,
        chunk_text: chunk.chunk_text,
        metadata: chunk.metadata,
        embedding: await embed(chunk.chunk_text),
      }))
    );

    const { error } = await supabase.from('chess_knowledge').insert(enriched);

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      continue;
    }

    inserted += enriched.length;
    console.log(`  Inserted ${inserted}/${chunks.length} chunks`);
  }

  console.log(`Done. Seeded ${inserted} chunks to chess_knowledge table.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
