import { createHash } from 'node:crypto';
import supabase from '../lib/supabaseClient.js';

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

function getApiKey() {
  return import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
}

function hashQuery(query) {
  return createHash('sha256').update(query.trim().toLowerCase()).digest('hex');
}

export async function getEmbedding(text) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[embeddingService] No OpenAI API key configured');
    return null;
  }

  if (!text || typeof text !== 'string') return null;

  try {
    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: MODEL,
      }),
    });

    if (!response.ok) {
      console.warn(`[embeddingService] OpenAI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.warn('[embeddingService] Embedding generation failed:', error.message);
    return null;
  }
}

export async function getEmbeddingCached(query) {
  if (!supabase) return getEmbedding(query);

  const queryHash = hashQuery(query);

  try {
    const { data, error } = await supabase
      .from('chat_embeddings')
      .select('embedding')
      .eq('query_hash', queryHash)
      .single();

    if (!error && data?.embedding) {
      return data.embedding;
    }
  } catch {
    // Cache miss or supabase unavailable - fall through
  }

  const embedding = await getEmbedding(query);
  if (embedding) {
    await cacheEmbedding(query, embedding);
  }
  return embedding;
}

export async function cacheEmbedding(query, embedding) {
  if (!supabase) return;

  try {
    await supabase.from('chat_embeddings').insert({
      query_hash: hashQuery(query),
      embedding,
    });
  } catch (error) {
    console.warn('[embeddingService] Failed to cache embedding:', error.message);
  }
}

export const EMBEDDING_CONFIG = {
  MODEL,
  DIM: EMBEDDING_DIM,
};
