import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchByCategory, searchAll } from '../services/vectorSearchService.js';
import * as supabaseModule from '../lib/supabaseClient.js';

describe('vectorSearchService', () => {
  let mockRpc;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    // Mock supabase as a valid object with rpc method
    vi.spyOn(supabaseModule, 'default', 'get').mockReturnValue({ rpc: mockRpc });
  });

  describe('searchByCategory', () => {
    it('queries chess_knowledge by category with cosine similarity', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        { id: '1', category: 'opening', chunk_text: 'Italian Game', metadata: {} },
      ];
      mockRpc.mockResolvedValueOnce({ data: mockResults, error: null });

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
      await searchByCategory([0.1], 'tactic', {
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
      mockRpc.mockResolvedValueOnce({ data: null, error: new Error('fail') });

      const results = await searchByCategory([0.1], 'opening');
      expect(results).toEqual([]);
    });

    it('returns empty array when supabase not configured', async () => {
      // Mock supabase as null to test the null-check path
      vi.spyOn(supabaseModule, 'default', 'get').mockReturnValue(null);

      const results = await searchByCategory([0.1], 'opening');
      expect(results).toEqual([]);
    });
  });

  describe('searchAll', () => {
    it('searches all categories in parallel', async () => {
      const mockEmbedding = [0.1];

      await searchAll(mockEmbedding);

      const calls = mockRpc.mock.calls;
      expect(calls.length).toBe(4); // opening, tactic, principle, endgame
      expect(calls.map((c) => c[1].match_category).sort()).toEqual(
        ['endgame', 'opening', 'principle', 'tactic']
      );
    });
  });
});
