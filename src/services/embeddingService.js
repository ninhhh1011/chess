/**
 * Embedding Service - DISABLED
 *
 * This service is permanently disabled for security.
 * OpenAI API keys must NEVER be exposed in browser bundles.
 *
 * To re-enable safely:
 * 1. Create a backend endpoint (e.g., /api/embeddings)
 * 2. That endpoint calls OpenAI with server-side API key
 * 3. Frontend calls your backend, not OpenAI directly
 */

const EMBEDDING_CONFIG = {
  MODEL: 'text-embedding-3-small',
  DIM: 1536,
  DISABLED: true,
  STATUS: 'Embeddings/RAG disabled - requires backend proxy for production',
};

/**
 * @deprecated Embeddings are disabled for security
 */
export async function getEmbedding(text) {
  console.warn('[embeddingService] Disabled - embeddings require backend proxy');
  return null;
}

/**
 * @deprecated Embeddings are disabled for security
 */
export async function getEmbeddingCached(query) {
  console.warn('[embeddingService] Disabled - embeddings require backend proxy');
  return null;
}

/**
 * @deprecated Embeddings are disabled for security
 */
export async function cacheEmbedding(query, embedding) {
  // No-op
}

export { EMBEDDING_CONFIG };
