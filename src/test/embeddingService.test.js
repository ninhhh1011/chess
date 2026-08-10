import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmbedding, getEmbeddingCached, cacheEmbedding } from '../services/embeddingService.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('embeddingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  describe('getEmbedding', () => {
    it('calls OpenAI embeddings API and returns vector', async () => {
      const mockVector = [0.1, 0.2, 0.3];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: mockVector }] }),
      });

      const result = await getEmbedding('test query');

      expect(result).toEqual(mockVector);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('returns null on API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getEmbedding('test query');
      expect(result).toBeNull();
    });

    it('returns null when API key missing', async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await getEmbedding('test');
      expect(result).toBeNull();
    });
  });

  describe('getEmbeddingCached', () => {
    it('returns cached embedding on hash match', async () => {
      const mockVector = [0.1, 0.2];
      const { default: supabase } = await import('../lib/supabaseClient.js');

      // Mock supabase chain
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { embedding: mockVector }, error: null }),
          }),
        }),
      });

      const result = await getEmbeddingCached('cached query');
      expect(result).toEqual(mockVector);
    });

    it('generates new embedding on cache miss', async () => {
      const mockVector = [0.4, 0.5];
      const { default: supabase } = await import('../lib/supabaseClient.js');

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: mockVector }] }),
      });

      const result = await getEmbeddingCached('new query');
      expect(result).toEqual(mockVector);
    });
  });
});
