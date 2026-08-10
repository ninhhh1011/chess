# RAG Pipeline for Chess Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Level 1 RAG pipeline (OpenAI embeddings + Supabase pgvector) to enhance AI coach responses with chess knowledge base.

**Architecture:** User query → embed via OpenAI → similarity search on `chess_knowledge` table (vector(1536)) → inject top-k chunks into system prompt → Claude API → response. Falls back to existing mockCoachService on any failure.

**Tech Stack:** OpenAI `text-embedding-3-small`, Supabase pgvector, Claude 3 Haiku (existing), Node.js ESM, Vite

---

## Global Constraints

- All code uses ES modules (see `package.json` `"type": "module"`)
- OpenAI API key from `process.env.OPENAI_API_KEY` or `VITE_OPENAI_API_KEY`
- Supabase via existing `src/lib/supabaseClient.js` (service role key in scripts, anon in app)
- Tests use vitest (existing setup in `src/test/setup.ts`)
- Commit format: `feat:`, `chore:`, `test:`, `docs:` prefix
- Code language: TypeScript where existing code is `.ts`, JavaScript where existing is `.js`
- Do not break existing fallback chain — any RAG failure must fall back to `mockCoachService`

---

## File Structure

```
supabase/
└── schema.sql                    # MODIFIED: add vector extension, chess_knowledge, chat_embeddings tables

src/services/
├── embeddingService.js           # NEW: generate/cache embeddings via OpenAI
├── vectorSearchService.js        # NEW: pgvector similarity search
└── ragPipeline.js                # NEW: orchestrate RAG flow

src/services/
└── aiCoachApiService.js          # MODIFIED: route through ragPipeline

src/test/
├── embeddingService.test.js      # NEW: unit tests
└── vectorSearchService.test.js   # NEW: unit tests

scripts/
├── generateChessKB.js            # NEW: generate synthetic chess knowledge chunks
└── seedChessKB.js                # NEW: seed chunks to Supabase with embeddings

.env.example                      # MODIFIED: add OPENAI_API_KEY
```

---

## Task 1: Update Database Schema

**Files:**
- Modify: `supabase/schema.sql` (append pgvector tables at the end)

- [ ] **Step 1: Add pgvector extension and tables to schema**

Append the following to `supabase/schema.sql` after the existing RLS policies:

```sql
-- ===========================================
-- RAG: Chess Knowledge Base
-- ===========================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Chunked chess knowledge base
CREATE TABLE IF NOT EXISTS chess_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('opening', 'tactic', 'principle', 'endgame')),
  subcategory text,
  chunk_text text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- IVFFlat index for fast similarity search
CREATE INDEX IF NOT EXISTS chess_knowledge_embedding_idx
  ON chess_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- User query embedding cache (anonymous use allowed - cache by query hash alone)
CREATE TABLE IF NOT EXISTS chat_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  UNIQUE(query_hash)
);

-- Enable RLS
ALTER TABLE chess_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_embeddings ENABLE ROW LEVEL SECURITY;

-- Public read for chess_knowledge (anonymous app users need to search)
CREATE POLICY "Public read chess_knowledge" ON chess_knowledge
  FOR SELECT USING (true);

-- Public read for chat_embeddings (deduplication)
CREATE POLICY "Public read chat_embeddings" ON chat_embeddings
  FOR SELECT USING (true);

-- Only service role can insert/update (seed script uses service role key)
CREATE POLICY "Service role insert chess_knowledge" ON chess_knowledge
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role insert chat_embeddings" ON chat_embeddings
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

- [ ] **Step 2: Commit**

```bash
cd E:/chess
git add supabase/schema.sql
git commit -m "chore: add pgvector schema for chess knowledge base

- chess_knowledge table with vector(1536) for OpenAI embeddings
- chat_embeddings cache for deduplication
- IVFFlat index for fast cosine similarity search
- RLS policies: public read, service role write"
```

---

## Task 2: Add OpenAI API Key to Environment

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add OPENAI_API_KEY documentation**

Append to `.env.example`:

```
# OpenAI API key for RAG embeddings (text-embedding-3-small)
# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=
```

- [ ] **Step 2: Commit**

```bash
cd E:/chess
git add .env.example
git commit -m "chore: document OPENAI_API_KEY env var for RAG pipeline"
```

---

## Task 3: Build Knowledge Base Generator

**Files:**
- Create: `scripts/generateChessKB.js`

**Interfaces:**
- Consumes: `src/data/openings.js`, `src/data/lessons.js`
- Produces: `chunks.json` with array of `{ category, subcategory, chunk_text, metadata }`

- [ ] **Step 1: Create the generator script**

Create `scripts/generateChessKB.js`:

```javascript
import { openings } from '../src/data/openings.js';
import { lessons } from '../src/data/lessons.js';
import { writeFileSync } from 'node:fs';

const TACTIC_TEMPLATES = [
  {
    subcategory: 'fork',
    template: (color = 'white') =>
      `${color === 'white' ? 'Trắng' : 'Đen'} dùng xe ở e2 chiếu hậu ở a6 và tấn công mã ở c7 cùng lúc — đây là fork cổ điển. Fork xảy ra khi một quân tấn công hai quân trở lên cùng lúc.`,
  },
  {
    subcategory: 'pin',
    template: (color = 'white') =>
      `Pin xảy ra khi quân giá trị cao hơn đứng phía sau quân giá trị thấp hơn. Ví dụ: tượng ${color === 'white' ? 'trắng' : 'đen'} ghim xe không cho di chuyển vì sau xe là vua.`,
  },
  {
    subcategory: 'skewer',
    template: (color = 'white') =>
      `Skewer ngược với pin: quân giá trị cao hơn ở phía trước. Ví dụ: xe ${color === 'white' ? 'trắng' : 'đen'} tấn công hậu, hậu phải di chuyển thì xe ăn quân phía sau.`,
  },
  {
    subcategory: 'discovered_attack',
    template: (color = 'white') =>
      `Tấn công giáng chiêu: di chuyển một quân ra khỏi đường tấn công của quân khác. Ví dụ: mã ${color === 'white' ? 'trắng' : 'đen'} nhảy ra, để hậu tấn công vua đối phương.`,
  },
  {
    subcategory: 'checkmate_patterns',
    template: () =>
      `Mẫu chiếu hết phổ biến: back rank mate (chiếu hết hàng cuối), scholar's mate (học giả), smothered mate (ngạt thở). Nhận diện sớm để tránh hoặc khai thác.`,
  },
];

const PRINCIPLE_TEMPLATES = [
  {
    subcategory: 'king_safety',
    template: (level) =>
      `An toàn vua (level ${level}): Nhập thành càng sớm càng tốt trong khai cuộc. Tránh để vua ở trung tâm khi chưa cần thiết. Xây tường tốt trước vua.`,
  },
  {
    subcategory: 'center_control',
    template: (level) =>
      `Kiểm soát trung tâm (level ${level}): Chiếm e4, d4, e5, d5 bằng tốt hoặc tấn công các ô này bằng quân. Quân kiểm soát trung tâm có phạm vi hoạt động rộng hơn.`,
  },
  {
    subcategory: 'development',
    template: (level) =>
      `Phát triển quân (level ${level}): Đưa mã và tượng ra ngoài trong 8-10 nước đầu. Tránh di chuyển một quân nhiều lần. Nhập thành và kết nối xe.`,
  },
  {
    subcategory: 'piece_activity',
    template: (level) =>
      `Hoạt động quân (level ${level}): Quân bị kẹt là quân yếu. Tìm cách đưa quân vào vị trí hoạt động. Đổi quân bị động lấy quân hoạt động tốt của đối phương.`,
  },
  {
    subcategory: 'pawn_structure',
    template: (level) =>
      `Cấu trúc tốt (level ${level}): Tốt cô lập yếu. Tốt thông suốt có thể tạo quân thông. Tránh tạo tốt yếu hoặc tốt đôi.`,
  },
];

const ENDGAME_TEMPLATES = [
  {
    subcategory: 'king_pawn_ending',
    template: () =>
      `Tàn cuộc vua và tốt: Vua phải hoạt động tích cực. Opposition (đối diện) là kỹ thuật quan trọng. Tốt thông suốt thắng trừ khi vua đối phương kịp chặn.`,
  },
  {
    subcategory: 'rook_endgame',
    template: () =>
      `Tàn cuộc xe: Xe hoạt động sau tốt thông là chìa khóa. Tránh để xe bị động. Vua trong tàn cuộc xe rất quan trọng — phải đưa vua vào trung tâm.`,
  },
  {
    subcategory: 'minor_piece_endgame',
    template: () =>
      `Tàn cuộc quân nhẹ: Tượng tốt cho tốt thông suốt (mỗi màu), mã tốt cho tốt cô lập hoặc tốt cụm. Hoạt động vua quyết định thắng thua.`,
  },
  {
    subcategory: 'queen_endgame',
    template: () =>
      `Tàn cuộc hậu: Hậu mạnh nhưng dễ bị chiếu vĩnh viễn. Tránh để hậu đối phương chiếu liên tục khi không có lý do. Dùng hậu để tấn công tốt yếu.`,
  },
];

function generateOpeningChunks() {
  return openings.map((opening) => {
    const moveList = opening.moves.map((m) => m.san).join(' ');
    const ideas = opening.mainIdeas.map((idea) => `- ${idea}`).join('\n');
    const mistakes = opening.commonMistakes.map((mistake) => `- ${mistake}`).join('\n');

    const chunk_text = `Khai cuộc: ${opening.vietnameseName} (${opening.name})
Side: ${opening.side === 'white' ? 'Trắng' : 'Đen'}
Level: ${opening.level}

Mô tả: ${opening.description}

Các nước chính: ${moveList}

Ý tưởng chính:
${ideas}

Lỗi thường gặp:
${mistakes}`;

    return {
      category: 'opening',
      subcategory: opening.id,
      chunk_text,
      metadata: {
        elo_range: opening.level === 'beginner' ? [400, 1000] : opening.level === 'intermediate' ? [1000, 1600] : [1600, 2400],
        color: opening.side,
        game_phase: 'opening',
      },
    };
  });
}

function generateLessonChunks() {
  return lessons.map((lesson) => ({
    category: 'principle',
    subcategory: lesson.id,
    chunk_text: `Bài học: ${lesson.title}

${lesson.content}

Ví dụ: ${lesson.example}`,
    metadata: {
      elo_range: [400, 2400],
      game_phase: 'all',
    },
  }));
}

function generateTacticChunks() {
  const chunks = [];
  for (const template of TACTIC_TEMPLATES) {
    for (const color of ['white', 'black']) {
      chunks.push({
        category: 'tactic',
        subcategory: template.subcategory,
        chunk_text: template.template(color),
        metadata: {
          elo_range: [800, 2400],
          color,
          game_phase: 'middlegame',
        },
      });
    }
  }
  return chunks;
}

function generatePrincipleChunks() {
  const chunks = [];
  for (const template of PRINCIPLE_TEMPLATES) {
    for (const level of ['noob', 'beginner', 'intermediate', 'advanced']) {
      chunks.push({
        category: 'principle',
        subcategory: template.subcategory,
        chunk_text: template.template(level),
        metadata: {
          elo_range: level === 'noob' ? [400, 800] : level === 'beginner' ? [800, 1200] : level === 'intermediate' ? [1200, 1800] : [1800, 2400],
          level,
          game_phase: 'all',
        },
      });
    }
  }
  return chunks;
}

function generateEndgameChunks() {
  return ENDGAME_TEMPLATES.map((template) => ({
    category: 'endgame',
    subcategory: template.subcategory,
    chunk_text: template.template(),
    metadata: {
      elo_range: [1200, 2400],
      game_phase: 'endgame',
    },
  }));
}

const chunks = [
  ...generateOpeningChunks(),
  ...generateLessonChunks(),
  ...generateTacticChunks(),
  ...generatePrincipleChunks(),
  ...generateEndgameChunks(),
];

writeFileSync('chunks.json', JSON.stringify(chunks, null, 2));
console.log(`Generated ${chunks.length} chunks:`);
console.log(`  - ${chunks.filter((c) => c.category === 'opening').length} openings`);
console.log(`  - ${chunks.filter((c) => c.category === 'principle').length} principles/lessons`);
console.log(`  - ${chunks.filter((c) => c.category === 'tactic').length} tactics`);
console.log(`  - ${chunks.filter((c) => c.category === 'endgame').length} endgames`);
```

- [ ] **Step 2: Run the generator**

Run: `cd E:/chess && node scripts/generateChessKB.js`
Expected: `Generated ~70 chunks` printed, `chunks.json` created

- [ ] **Step 3: Verify output**

Run: `cd E:/chess && node -e "const c=require('./chunks.json'); console.log(c.length, c[0])"`
Expected: prints count and first chunk object

- [ ] **Step 4: Commit**

```bash
cd E:/chess
git add scripts/generateChessKB.js chunks.json
git commit -m "feat: add chess knowledge base generator

- Extracts from existing openings.js and lessons.js
- Generates tactical motif templates (fork, pin, skewer, etc.)
- Generates principle templates per ELO level
- Generates endgame patterns
- Output: chunks.json ready for embedding"
```

---

## Task 4: Build Embedding Service

**Files:**
- Create: `src/services/embeddingService.js`
- Create: `src/test/embeddingService.test.js`

**Interfaces:**
- Consumes: `OPENAI_API_KEY` env, Supabase client
- Produces: `getEmbedding(text)`, `getEmbeddingCached(query)`, `cacheEmbedding(query, embedding)`

- [ ] **Step 1: Write the failing test**

Create `src/test/embeddingService.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd E:/chess && npm test -- src/test/embeddingService.test.js`
Expected: FAIL with "Cannot find module '../services/embeddingService.js'"

- [ ] **Step 3: Implement embeddingService**

Create `src/services/embeddingService.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd E:/chess && npm test -- src/test/embeddingService.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd E:/chess
git add src/services/embeddingService.js src/test/embeddingService.test.js
git commit -m "feat: add embeddingService for OpenAI text-embedding-3-small

- Generates 1536-dim embeddings via OpenAI API
- Caches embeddings in Supabase chat_embeddings table
- Returns null on any failure (graceful degradation)
- Gracefully handles missing API key"
```

---

## Task 5: Build Vector Search Service

**Files:**
- Create: `src/services/vectorSearchService.js`
- Create: `src/test/vectorSearchService.test.js`

**Interfaces:**
- Consumes: Supabase client, embedding vector
- Produces: `searchByCategory(embedding, category, options)`, `searchAll(embedding, options)`

- [ ] **Step 1: Write the failing test**

Create `src/test/vectorSearchService.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd E:/chess && npm test -- src/test/vectorSearchService.test.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement vectorSearchService**

Create `src/services/vectorSearchService.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd E:/chess && npm test -- src/test/vectorSearchService.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd E:/chess
git add src/services/vectorSearchService.js src/test/vectorSearchService.test.js
git commit -m "feat: add vectorSearchService for pgvector similarity search

- searchByCategory with optional elo_range and game_phase filters
- searchAll queries all 4 categories in parallel
- Uses Supabase RPC function match_chess_knowledge
- Returns empty array on any failure"
```

---

## Task 6: Add match_chess_knowledge RPC Function to Schema

**Files:**
- Modify: `supabase/schema.sql` (append RPC function)

- [ ] **Step 1: Add RPC function to schema**

Append to `supabase/schema.sql`:

```sql
-- ===========================================
-- RAG: Vector search RPC function
-- ===========================================

-- Drop existing function if updating signature
DROP FUNCTION IF EXISTS match_chess_knowledge(vector, text, integer, float);

CREATE OR REPLACE FUNCTION match_chess_knowledge(
  query_embedding vector(1536),
  match_category text,
  match_count integer DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  category text,
  subcategory text,
  chunk_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.category,
    ck.subcategory,
    ck.chunk_text,
    ck.metadata,
    1 - (ck.embedding <=> query_embedding) AS similarity
  FROM chess_knowledge ck
  WHERE
    ck.category = match_category
    AND ck.embedding IS NOT NULL
    AND 1 - (ck.embedding <=> query_embedding) > match_threshold
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

- [ ] **Step 2: Commit**

```bash
cd E:/chess
git add supabase/schema.sql
git commit -m "chore: add match_chess_knowledge RPC function for vector search

- Uses cosine distance operator (<=>)
- Filters by category and similarity threshold
- Returns top-k results ordered by similarity"
```

---

## Task 7: Build RAG Pipeline Orchestrator

**Files:**
- Create: `src/services/ragPipeline.js`

**Interfaces:**
- Consumes: query, embedding service, vector search service, Claude API
- Produces: `query(params)` returns `{ reply, source, citations }` or falls back to mock

- [ ] **Step 1: Create the RAG pipeline**

Create `src/services/ragPipeline.js`:

```javascript
import { getEmbeddingCached } from './embeddingService.js';
import { searchAll } from './vectorSearchService.js';
import { askAICoach } from './aiCoachApiService.js';
import { askMockCoach } from './mockCoachService.js';

function extractCitations(results) {
  const citations = [];
  for (const [category, chunks] of Object.entries(results)) {
    for (const chunk of chunks || []) {
      citations.push({
        category,
        subcategory: chunk.subcategory,
        text: chunk.chunk_text.substring(0, 200) + (chunk.chunk_text.length > 200 ? '...' : ''),
      });
    }
  }
  return citations;
}

function buildContextPrompt(citations) {
  if (citations.length === 0) return '';

  const grouped = citations.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c.text);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .map(([category, texts]) => {
      const label = {
        opening: 'Khai cuộc liên quan',
        tactic: 'Chiến thuật liên quan',
        principle: 'Nguyên tắc liên quan',
        endgame: 'Tàn cuộc liên quan',
      }[category] || category;
      return `${label}:\n${texts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`;
    })
    .join('\n\n');

  return `\n\nKiến thức tham khảo từ cơ sở dữ liệu (RAG):\n${sections}\n\nDùng kiến thức trên để trả lời chính xác hơn nhưng đừng trích dẫn trực tiếp - hãy tích hợp tự nhiên vào câu trả lời.`;
}

export async function queryRAG(params) {
  const { question, fen, history, userProfile, stockfish } = params;

  // Step 1: Generate embedding for the question
  const embedding = await getEmbeddingCached(question || '');
  if (!embedding) {
    // No embedding available — fall back to plain AI coach
    return await askAICoach(params);
  }

  // Step 2: Search knowledge base across all categories
  const searchResults = await searchAll(embedding, {
    limit: 3,
    eloRange: userProfile?.currentLevel ? eloFromLevel(userProfile.currentLevel) : undefined,
  });

  const citations = extractCitations(searchResults);
  const contextPrompt = buildContextPrompt(citations);

  // Step 3: Inject context into the prompt and call Claude
  const enhancedPayload = {
    ...params,
    contextPrompt,
  };

  const aiResult = await askAICoach(enhancedPayload);

  if (!aiResult?.reply) {
    // AI failed — fall back to mock
    return {
      reply: askMockCoach(params),
      source: 'mock_fallback',
      citations,
    };
  }

  return {
    reply: aiResult.reply,
    source: citations.length > 0 ? 'ai_rag' : 'ai',
    citations,
  };
}

function eloFromLevel(level) {
  const map = {
    noob: [400, 800],
    beginner: [800, 1200],
    intermediate: [1200, 1800],
    advanced: [1800, 2400],
  };
  return map[level] || [400, 2400];
}
```

- [ ] **Step 2: Verify file syntax**

Run: `cd E:/chess && node -c src/services/ragPipeline.js`
Expected: no errors (syntax valid)

- [ ] **Step 3: Commit**

```bash
cd E:/chess
git add src/services/ragPipeline.js
git commit -m "feat: add RAG pipeline orchestrator

- Embeds query via embeddingService (with cache)
- Searches all 4 knowledge categories in parallel
- Builds context prompt from citations grouped by category
- Passes enhanced prompt to existing askAICoach
- Falls back to mockCoachService on any failure
- Returns source attribution (ai_rag / ai / mock)"
```

---

## Task 8: Update aiCoachApiService to Use RAG Pipeline

**Files:**
- Modify: `src/services/aiCoachApiService.js`

**Interfaces:**
- Consumes: existing `compactPayload`, `/api/coach` endpoint
- Produces: same external interface, internal routing via RAG

- [ ] **Step 1: Add RAG context injection**

Modify `src/services/aiCoachApiService.js`:

Replace the function `compactPayload` to also include `contextPrompt`:

```javascript
import { askMockCoach, explainMockPosition, getMockHint, reviewMockGame } from './mockCoachService';

function fallbackMock(payload) {
  const mockPayload = { question: payload.message, fen: payload.fen, history: payload.history, level: payload.level };
  if (payload.mode === 'hint') return getMockHint(mockPayload);
  if (payload.mode === 'explain_position') return explainMockPosition(mockPayload);
  if (payload.mode === 'review_game') return reviewMockGame(mockPayload);
  return askMockCoach(mockPayload);
}

function compactPayload(payload = {}) {
  return {
    ...payload,
    history: Array.isArray(payload.history) ? payload.history.slice(-20) : [],
    pgn: payload.pgn ? String(payload.pgn).slice(-2500) : '',
    userProfile: payload.userProfile || {},
    recommendations: payload.recommendations || {},
    stockfish: payload.stockfish || null,
    openingContext: payload.openingContext || null,
    responseStyle: payload.responseStyle || 'very_short',
  };
}

export async function askAICoach(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...compactPayload(payload),
        contextPrompt: payload.contextPrompt || '',
      }),
    });
    window.clearTimeout(timeout);

    if (!response.ok) throw new Error('Coach API lỗi mạng.');
    const data = await response.json();
    if (data.success && data.reply) return { reply: data.reply, source: data.source || 'ai', suggestedActions: data.suggestedActions || [] };

    return { reply: fallbackMock(payload), source: data.source === 'fallback' ? 'fallback' : 'mock', suggestedActions: [] };
  } catch (error) {
    window.clearTimeout(timeout);
    return { reply: fallbackMock(payload), source: 'mock', suggestedActions: [] };
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `cd E:/chess && node -c src/services/aiCoachApiService.js`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd E:/chess
git add src/services/aiCoachApiService.js
git commit -m "feat: thread contextPrompt through askAICoach payload

- Optional contextPrompt field forwarded to /api/coach
- No breaking change for existing callers
- Backward compatible if RAG is not active"
```

---

## Task 9: Update API Coach Handler to Use Context

**Files:**
- Modify: `api/coach.js`

- [ ] **Step 1: Add contextPrompt to system message**

Modify `api/coach.js`. Replace the `systemPrompt` definition with:

```javascript
const { message, history, fen, pgn, stockfish, turn, status, contextPrompt } = await req.json();

const systemPrompt = `Bạn là AI Chess Coach cho app "Vua Cờ".

Nhiệm vụ:
- Huấn luyện người chơi cờ vua từ noob đến advanced.
- Trả lời bằng tiếng Việt.
- Giải thích ngắn gọn, dễ hiểu, đúng trình độ.
- Không chỉ đưa đáp án, phải dạy tư duy.
- Không bịa luật cờ.
- Nếu có context từ RAG, dùng nó như nguồn tham khảo chính.
- Không trích dẫn trực tiếp - hãy tích hợp tự nhiên.

Format: Tối đa 3 dòng, mỗi dòng 1 ý. Không disclaimer.${contextPrompt ? `\n\n${contextPrompt}` : ''}

Dữ liệu ván:
- FEN: ${fen || 'N/A'}
- PGN: ${pgn || 'N/A'}
- Stockfish: ${stockfish ? JSON.stringify(stockfish) : 'N/A'}
- Trạng thái: ${status || 'N/A'}
- Lượt: ${turn || 'N/A'}`;
```

- [ ] **Step 2: Commit**

```bash
cd E:/chess
git add api/coach.js
git commit -m "feat: coach API accepts contextPrompt from RAG pipeline

- Adds contextPrompt field to /api/coach request
- Injects context into system prompt for richer answers
- Falls back to standard prompt if no context provided"
```

---

## Task 10: Build Seed Script

**Files:**
- Create: `scripts/seedChessKB.js`

**Interfaces:**
- Consumes: `chunks.json`, Supabase service role key, OpenAI API key
- Produces: populated `chess_knowledge` table

- [ ] **Step 1: Create the seed script**

Create `scripts/seedChessKB.js`:

```javascript
import 'dotenv/config';
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
```

- [ ] **Step 2: Verify syntax**

Run: `cd E:/chess && node -c scripts/seedChessKB.js`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd E:/chess
git add scripts/seedChessKB.js
git commit -m "feat: add Supabase seed script for chess knowledge base

- Reads chunks.json generated by generateChessKB.js
- Embeds each chunk via OpenAI text-embedding-3-small
- Batches inserts (5 per batch) to avoid rate limits
- Uses service role key for write access"
```

---

## Task 11: Update aiCoachApiService to Route Through RAG

**Files:**
- Modify: `src/services/aiCoachApiService.js`

- [ ] **Step 1: Add RAG orchestration wrapper**

Replace `src/services/aiCoachApiService.js` with:

```javascript
import { askMockCoach, explainMockPosition, getMockHint, reviewMockGame } from './mockCoachService';
import { getEmbeddingCached } from './embeddingService.js';
import { searchAll } from './vectorSearchService.js';

function fallbackMock(payload) {
  const mockPayload = { question: payload.message, fen: payload.fen, history: payload.history, level: payload.level };
  if (payload.mode === 'hint') return getMockHint(mockPayload);
  if (payload.mode === 'explain_position') return explainMockPosition(mockPayload);
  if (payload.mode === 'review_game') return reviewMockGame(mockPayload);
  return askMockCoach(mockPayload);
}

function compactPayload(payload = {}) {
  return {
    ...payload,
    history: Array.isArray(payload.history) ? payload.history.slice(-20) : [],
    pgn: payload.pgn ? String(payload.pgn).slice(-2500) : '',
    userProfile: payload.userProfile || {},
    recommendations: payload.recommendations || {},
    stockfish: payload.stockfish || null,
    openingContext: payload.openingContext || null,
    responseStyle: payload.responseStyle || 'very_short',
  };
}

function buildContextPrompt(citations) {
  if (!citations || citations.length === 0) return '';

  const grouped = citations.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c.text);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .map(([category, texts]) => {
      const label = {
        opening: 'Khai cuộc liên quan',
        tactic: 'Chiến thuật liên quan',
        principle: 'Nguyên tắc liên quan',
        endgame: 'Tàn cuộc liên quan',
      }[category] || category;
      return `${label}:\n${texts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`;
    })
    .join('\n\n');

  return `\n\nKiến thức tham khảo (RAG):\n${sections}`;
}

function eloFromLevel(level) {
  const map = {
    noob: [400, 800],
    beginner: [800, 1200],
    intermediate: [1200, 1800],
    advanced: [1800, 2400],
  };
  return map[level] || [400, 2400];
}

async function enhanceWithRAG(payload) {
  const { message, userProfile } = payload;
  const embedding = await getEmbeddingCached(message || '');

  if (!embedding) {
    return { ...payload, contextPrompt: '' };
  }

  const searchResults = await searchAll(embedding, {
    limit: 3,
    eloRange: userProfile?.currentLevel ? eloFromLevel(userProfile.currentLevel) : undefined,
  });

  const citations = [];
  for (const [category, chunks] of Object.entries(searchResults)) {
    for (const chunk of chunks || []) {
      citations.push({
        category,
        text: chunk.chunk_text.substring(0, 300),
      });
    }
  }

  return {
    ...payload,
    contextPrompt: buildContextPrompt(citations),
  };
}

export async function askAICoach(payload) {
  // Step 1: Enhance payload with RAG context
  const enhancedPayload = await enhanceWithRAG(payload);

  // Step 2: Call Claude API
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(compactPayload(enhancedPayload)),
    });
    window.clearTimeout(timeout);

    if (!response.ok) throw new Error('Coach API lỗi mạng.');
    const data = await response.json();
    if (data.success && data.reply) return { reply: data.reply, source: data.source || 'ai', suggestedActions: data.suggestedActions || [] };

    return { reply: fallbackMock(payload), source: data.source === 'fallback' ? 'fallback' : 'mock', suggestedActions: [] };
  } catch (error) {
    window.clearTimeout(timeout);
    return { reply: fallbackMock(payload), source: 'mock', suggestedActions: [] };
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `cd E:/chess && node -c src/services/aiCoachApiService.js`
Expected: no errors

- [ ] **Step 3: Run existing tests**

Run: `cd E:/chess && npm test`
Expected: all existing tests still pass + new tests pass

- [ ] **Step 4: Commit**

```bash
cd E:/chess
git add src/services/aiCoachApiService.js
git commit -m "feat: integrate RAG pipeline into askAICoach

- enhanceWithRAG adds context from knowledge base to payload
- Falls back to plain Claude call if embedding/RAG fails
- Preserves existing fallback to mockCoachService
- No breaking changes to public interface"
```

---

## Task 12: Run All Tests

**Files:**
- N/A

- [ ] **Step 1: Run full test suite**

Run: `cd E:/chess && npm test`
Expected: all tests pass

- [ ] **Step 2: Run linter**

Run: `cd E:/chess && npm run lint`
Expected: no errors (or only pre-existing warnings)

- [ ] **Step 3: Verify no regressions**

Run: `cd E:/chess && npm run build`
Expected: build succeeds without errors

---

## Task 13: Manual Smoke Test

**Files:**
- N/A

- [ ] **Step 1: Start dev servers**

Run: `cd E:/chess && npm run dev:all`
Expected: both Vite (5173) and server (3001) start

- [ ] **Step 2: Test coach endpoint with RAG context**

Run: `cd E:/chess && curl -X POST http://localhost:3001/api/coach -H "Content-Type: application/json" -d '{"message":"Sicilian Defense nên chơi thế nào?","fen":"rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2","history":["e4","c5"],"userProfile":{"currentLevel":"intermediate"}}'`
Expected: response with chess coaching content

- [ ] **Step 3: Verify fallback when OpenAI is down**

Unset OPENAI_API_KEY and re-run Step 2. Expected: still returns a response (mock fallback).

---

## Self-Review Notes

**Spec coverage:**
- ✅ Database schema (Task 1, 6)
- ✅ OpenAI API integration (Task 2, 4)
- ✅ Knowledge base generation (Task 3, 10)
- ✅ Vector search (Task 5)
- ✅ RAG orchestration (Task 7, 11)
- ✅ API integration (Task 8, 9)
- ✅ Testing (Task 4, 5, 12, 13)
- ✅ Fallback strategy (Task 4, 5, 11, 13)

**Type consistency:**
- `getEmbedding(text)` returns `number[] | null` — used consistently
- `searchByCategory(embedding, category, options)` returns `KnowledgeChunk[]`
- `searchAll(embedding, options)` returns `Record<Category, KnowledgeChunk[]>`
- `askAICoach(payload)` returns `{ reply, source, suggestedActions }`

**Placeholder scan:** No TODOs, no "implement later", all code blocks complete.