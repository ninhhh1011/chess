import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchByCategory, searchAll } from '../services/vectorSearchService.js';

describe('vectorSearchService', () => {
  let mockSupabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('../lib/supabaseClient.js');
    mockSupabase = supabaseModule.default;
  });

  describe('searchByCategory', () => {
    it('queries chess_knowledge by category with cosine similarity', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        { id: '1', category: 'opening', chunk_text: 'Italian Game', metadata: {} },
      ];

      const mockRpc = vi.fn().mockResolvedValue({ data: mockResults, error: null });
      mockSupabase.rpc = mockRpc;

      const results = await searchByCategory(mockEmbedding, 'opening');

      expect(mockRpc).toHaveBeenCalledWith('match_chess_knowledge', {
        query_embedding: mockEmbedding,
        match_category: 'opening',
        match_count: 5,
        match_threshold: 0.5,
      });
      expect(results).toEqual(mockResults);
    });

    it('respects custom limit and elo_range options', async () => {
      const mockEmbedding = [0.1];
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.rpc = mockRpc;

      await searchByCategory(mockEmbedding, 'tactic', {
        limit: 10,
        eloRange: [1000, 1500],
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'match_chess_knowledge',
        expect.objectContaining({
          match_count: 10,
          match_threshold: 0.5,
        })
      );
    });

    it('returns empty array on supabase error', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('fail') });

      const results = await searchByCategory([0.1], 'opening');
      expect(results).toEqual([]);
    });

    it('returns empty array when supabase not configured', async () => {
      const supabaseModule = await import('../lib/supabaseClient.js');
      vi.spyOn(supabaseModule, 'default', 'get').mockReturnValue(null);

      // Re-import to get fresh module
      vi.resetModules();
      const freshModule = await import('../services/vectorSearchService.js');
      const results = await freshModule.searchByCategory([0.1], 'opening');
      expect(results).toEqual([]);
    });
  });

  describe('searchAll', () => {
    it('searches all categories in parallel', async () => {
      const mockEmbedding = [0.1];
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.rpc = mockRpc;

      await searchAll(mockEmbedding);

      const calls = mockRpc.mock.calls;
      expect(calls.length).toBe(4); // opening, tactic, principle, endgame
      expect(calls.map((c) => c[1].match_category).sort()).toEqual(
        ['endgame', 'opening', 'principle', 'tactic']
      );
    });
  });
});
