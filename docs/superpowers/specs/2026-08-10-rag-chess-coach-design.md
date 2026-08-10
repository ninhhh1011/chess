# RAG Pipeline for Chess Coach - Design Spec

## Overview

Implement Level 1 RAG (Retrieval-Augmented Generation) pipeline to enhance AI coach responses with chess-specific knowledge. Currently, the coach uses mock responses or basic Claude API calls without domain knowledge. This adds vector search over chess openings, tactics, principles, and endgame patterns.

## Goals

- **Portfolio-worthy**: Clean architecture, well-documented, explainable
- **Production-ready**: Handle edge cases, graceful fallbacks, performance-conscious

## Tech Stack

| Component | Technology |
|-----------|------------|
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Vector DB | Supabase pgvector |
| LLM | Claude via existing `/api/coach` endpoint |
| Fallback | Existing `mockCoachService.js` |

## Architecture

```
User Query → Embedding (OpenAI) → Vector Search (pgvector) → Context Injection → Claude → Response
                                          ↓
                                   Fallback: mockCoachService
```

## Database Schema

### Extensions
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Tables

```sql
-- Chunked chess knowledge base
CREATE TABLE chess_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('opening', 'tactic', 'principle', 'endgame')),
  subcategory text,
  chunk_text text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Vector search index
CREATE INDEX ON chess_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- User query embedding cache
CREATE TABLE chat_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  query_hash text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, query_hash)
);
```

## Knowledge Base Structure

### Categories & Chunking Strategy

| Category | Chunk Size | Content |
|----------|------------|---------|
| `opening` | 200-300 chars | Position + main idea + common mistakes |
| `tactic` | 150-200 chars | Tactical motif + example + solution |
| `principle` | 300-400 chars | Chess principle + level-specific explanation |
| `endgame` | 200-300 chars | Endgame position + solution + key concept |

### Metadata Schema
```typescript
interface ChunkMetadata {
  elo_range?: [number, number];     // e.g., [800, 1200]
  game_phase?: 'opening' | 'middlegame' | 'endgame';
  color?: 'white' | 'black' | 'both';
  fen_pattern?: string;            // Optional FEN pattern for matching
}
```

## Components

### 1. `embeddingService.js`
**Responsibility**: Generate and cache embeddings

```typescript
interface EmbeddingService {
  // Generate embedding for text
  getEmbedding(text: string): Promise<number[]>;
  
  // Get from cache or generate
  getEmbeddingCached(userId: string, query: string): Promise<number[]>;
  
  // Cache embedding
  cacheEmbedding(userId: string, query: string, embedding: number[]): Promise<void>;
}
```

### 2. `vectorSearchService.js`
**Responsibility**: Similarity search over knowledge base

```typescript
interface VectorSearchService {
  // Search by category with optional metadata filter
  searchByCategory(
    embedding: number[], 
    category: string, 
    options?: { 
      limit?: number; 
      eloRange?: [number, number];
      gamePhase?: string;
    }
  ): Promise<KnowledgeChunk[]>;
  
  // Search all categories
  searchAll(embedding: number[], options?: SearchOptions): Promise<SearchResults>;
}
```

### 3. `ragPipeline.js`
**Responsibility**: Orchestrate full RAG flow

```typescript
interface RAGPipeline {
  // Main entry point
  query(params: {
    question: string;
    fen?: string;
    history?: string[];
    userProfile?: UserProfile;
    stockfishEval?: StockfishResult;
  }): Promise<CoachResponse>;
}
```

### 4. `generateChessKB.js`
**Responsibility**: Generate synthetic chess knowledge chunks

**Input Sources**:
- Existing `src/data/openings.js`
- Existing `src/data/lessons.js`
- Synthetic data generated via Claude API

**Output**: JSON file with chunks ready for seeding

### 5. `seedChessKB.js`
**Responsibility**: Seed knowledge chunks to Supabase with embeddings

## Data Flow

```
1. User sends query to /api/coach
2. Generate embedding via OpenAI API
3. Cache embedding in chat_embeddings table
4. Search chess_knowledge for top-k similar chunks
5. Inject chunks into system prompt as context
6. Call Claude API with enhanced prompt
7. Return response with optional citations
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| OpenAI API error | Fallback to mockCoachService |
| OpenAI rate limit | Fallback to mockCoachService + log warning |
| No API key configured | Fallback to mockCoachService |
| pgvector error | Query Supabase normally; if Supabase down, use mock |
| Empty search results | Expand to all categories, relax threshold |
| Partial failure | Return best-effort with available data |

## API Changes

### `/api/coach` (updated)

**Request** (unchanged):
```json
{
  "message": "...",
  "fen": "...",
  "history": [...],
  "userProfile": {...}
}
```

**Response** (enhanced):
```json
{
  "success": true,
  "reply": "...",
  "source": "ai_rag",
  "citations": [
    { "chunk_id": "...", "category": "opening", "text": "..." }
  ]
}
```

## File Structure

```
src/
├── services/
│   ├── embeddingService.js      # NEW: Embedding generation & caching
│   ├── vectorSearchService.js   # NEW: pgvector queries
│   └── ragPipeline.js           # NEW: RAG orchestration
api/
├── coach.js                     # MODIFIED: Integrate RAG pipeline
scripts/
├── generateChessKB.js           # NEW: Generate synthetic chunks
└── seedChessKB.js               # NEW: Seed to Supabase
supabase/
└── schema.sql                   # MODIFIED: Add vector tables
```

## Testing Strategy

1. **Unit tests**: Each service in isolation
2. **Integration tests**: RAG pipeline end-to-end
3. **Manual testing**: Compare RAG responses vs mock responses

## Implementation Priority

1. Database schema updates (pgvector)
2. Knowledge base seed script
3. embeddingService.js
4. vectorSearchService.js
5. ragPipeline.js
6. API integration
7. Testing

## Out of Scope

- Multi-modal embeddings (image-based position recognition)
- Real-time position analysis via vision
- User feedback loop for improving embeddings
- Embedding model fine-tuning
