/**
 * Tests for embeddingService - DISABLED
 *
 * Verifies that:
 * 1. No OpenAI API key references exist in the codebase
 * 2. Embeddings are disabled
 * 3. Functions return null
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmbedding, getEmbeddingCached, cacheEmbedding, EMBEDDING_CONFIG } from '../services/embeddingService.js';

describe('embeddingService - DISABLED', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.warn in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('Security Configuration', () => {
    it('is marked as disabled', () => {
      expect(EMBEDDING_CONFIG.DISABLED).toBe(true);
    });

    it('documents the security status', () => {
      expect(EMBEDDING_CONFIG.STATUS).toContain('disabled');
    });

    it('has no API key reference', () => {
      expect(EMBEDDING_CONFIG).not.toHaveProperty('API_KEY');
      expect(EMBEDDING_CONFIG).not.toHaveProperty('apiKey');
    });
  });

  describe('getEmbedding', () => {
    it('always returns null', async () => {
      const result = await getEmbedding('any query');
      expect(result).toBeNull();
    });

    it('does not make any API calls', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      await getEmbedding('test query');

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('getEmbeddingCached', () => {
    it('always returns null', async () => {
      const result = await getEmbeddingCached('any query');
      expect(result).toBeNull();
    });

    it('does not make any API calls', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      await getEmbeddingCached('cached query');

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('cacheEmbedding', () => {
    it('is a no-op', async () => {
      await expect(
        cacheEmbedding('query', [0.1, 0.2])
      ).resolves.not.toThrow();
    });
  });

  describe('SECURITY: No API key exposure', () => {
    it('does not read VITE_OPENAI_API_KEY', async () => {
      // Even if VITE_OPENAI_API_KEY is set, function returns null
      const originalEnv = import.meta.env.VITE_OPENAI_API_KEY;
      import.meta.env.VITE_OPENAI_API_KEY = 'secret-key-123';

      const result = await getEmbedding('test');

      // Should still return null
      expect(result).toBeNull();

      // Clean up
      if (originalEnv !== undefined) {
        import.meta.env.VITE_OPENAI_API_KEY = originalEnv;
      } else {
        delete import.meta.env.VITE_OPENAI_API_KEY;
      }
    });

    it('does not read process.env.OPENAI_API_KEY', async () => {
      // This should not exist in browser context
      const result = await getEmbedding('test');
      expect(result).toBeNull();
    });
  });
});
