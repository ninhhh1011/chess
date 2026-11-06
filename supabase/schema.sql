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
  cloud_revision bigint not null default 0 check (cloud_revision >= 0),
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
