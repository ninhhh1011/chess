import supabase from '../lib/supabaseClient.js';

const CATEGORIES = ['opening', 'tactic', 'principle', 'endgame'];
const DEFAULT_LIMIT = 5;
const DEFAULT_THRESHOLD = 0.5;

export async function searchByCategory(embedding, category, options = {}) {
  if (!supabase || !embedding || !Array.isArray(embedding)) return [];

  const { limit = DEFAULT_LIMIT, eloRange, gamePhase } = options;

  try {
    const { data, error } = await supabase.rpc('match_chess_knowledge', {
      query_embedding: embedding,
      match_category: category,
      match_count: limit,
      match_threshold: DEFAULT_THRESHOLD,
    });

    if (error) {
      console.warn(`[vectorSearch] RPC error for ${category}:`, error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Post-filter by elo_range and game_phase if specified
    return data.filter((chunk) => {
      const meta = chunk.metadata || {};

      if (eloRange && meta.elo_range) {
        const [min, max] = meta.elo_range;
        // Chunk is relevant if ranges overlap
        if (eloRange[1] < min || eloRange[0] > max) return false;
      }

      if (gamePhase && meta.game_phase && meta.game_phase !== 'all') {
        if (meta.game_phase !== gamePhase) return false;
      }

      return true;
    });
  } catch (error) {
    console.warn(`[vectorSearch] Exception for ${category}:`, error.message);
    return [];
  }
}

export async function searchAll(embedding, options = {}) {
  if (!supabase || !embedding) return { opening: [], tactic: [], principle: [], endgame: [] };

  const results = await Promise.all(
    CATEGORIES.map(async (category) => ({
      category,
      chunks: await searchByCategory(embedding, category, options),
    }))
  );

  return results.reduce((acc, { category, chunks }) => {
    acc[category] = chunks;
    return acc;
  }, {});
}

export { CATEGORIES };
