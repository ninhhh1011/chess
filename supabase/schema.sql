-- Bảng profiles
create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  email text,
  display_name text,
  current_level text default 'noob',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bảng user_progress
create table if not exists user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  profile_data jsonb not null default '{}',
  games_played integer default 0,
  lessons_completed jsonb default '[]',
  exercises_completed jsonb default '[]',
  exercise_stats jsonb default '{}',
  common_mistakes jsonb default '[]',
  strengths jsonb default '[]',
  weaknesses jsonb default '[]',
  opening_stats jsonb default '{}',
  daily_training_plan jsonb default '{}',
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id)
);

-- Bảng training_events
create table if not exists training_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  event_type text not null,
  payload jsonb default '{}',
  created_at timestamptz default now()
);

-- Bảng opening_progress
create table if not exists opening_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  opening_id text not null,
  attempts integer default 0,
  success_count integer default 0,
  mistake_count integer default 0,
  mastery_percent integer default 0,
  mistakes jsonb default '[]',
  last_practiced timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, opening_id)
);

-- Bảng game_reviews
create table if not exists game_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  pgn text,
  result text,
  blunder_count integer default 0,
  mistake_count integer default 0,
  inaccuracy_count integer default 0,
  summary jsonb default '{}',
  created_at timestamptz default now()
);

-- Bảng coach_messages
create table if not exists coach_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  role text not null,
  content text not null,
  context jsonb default '{}',
  created_at timestamptz default now()
);

-- Bật RLS (chỉ chạy nếu chưa bật)
DO $$ BEGIN
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE training_events ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE opening_progress ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE game_reviews ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Policies cho profiles (dùng DO block để tránh lỗi nếu đã tồn tại)
DO $$ BEGIN
  CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies cho user_progress
DO $$ BEGIN
  CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own progress" ON user_progress FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies cho training_events
DO $$ BEGIN
  CREATE POLICY "Users can view own events" ON training_events FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own events" ON training_events FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own events" ON training_events FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies cho opening_progress
DO $$ BEGIN
  CREATE POLICY "Users can view own opening progress" ON opening_progress FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own opening progress" ON opening_progress FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own opening progress" ON opening_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own opening progress" ON opening_progress FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies cho game_reviews
DO $$ BEGIN
  CREATE POLICY "Users can view own reviews" ON game_reviews FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own reviews" ON game_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own reviews" ON game_reviews FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies cho coach_messages
DO $$ BEGIN
  CREATE POLICY "Users can view own messages" ON coach_messages FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own messages" ON coach_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own messages" ON coach_messages FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- Enable RLS cho RAG tables (chỉ chạy nếu chưa bật)
DO $$ BEGIN
  ALTER TABLE chess_knowledge ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE chat_embeddings ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Public read for chess_knowledge (anonymous app users need to search)
DO $$ BEGIN
  CREATE POLICY "Public read chess_knowledge" ON chess_knowledge FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public read for chat_embeddings (deduplication)
DO $$ BEGIN
  CREATE POLICY "Public read chat_embeddings" ON chat_embeddings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only service role can insert/update (seed script uses service role key)
DO $$ BEGIN
  CREATE POLICY "Service role insert chess_knowledge" ON chess_knowledge FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service role insert chat_embeddings" ON chat_embeddings FOR INSERT WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
