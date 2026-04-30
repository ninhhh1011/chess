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

-- Bật RLS
alter table profiles enable row level security;
alter table user_progress enable row level security;
alter table training_events enable row level security;
alter table opening_progress enable row level security;
alter table game_reviews enable row level security;
alter table coach_messages enable row level security;

-- Policies cho profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Policies cho user_progress
create policy "Users can view own progress" on user_progress
  for select using (auth.uid() = user_id);

create policy "Users can update own progress" on user_progress
  for update using (auth.uid() = user_id);

create policy "Users can insert own progress" on user_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own progress" on user_progress
  for delete using (auth.uid() = user_id);

-- Policies cho training_events
create policy "Users can view own events" on training_events
  for select using (auth.uid() = user_id);

create policy "Users can insert own events" on training_events
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own events" on training_events
  for delete using (auth.uid() = user_id);

-- Policies cho opening_progress
create policy "Users can view own opening progress" on opening_progress
  for select using (auth.uid() = user_id);

create policy "Users can update own opening progress" on opening_progress
  for update using (auth.uid() = user_id);

create policy "Users can insert own opening progress" on opening_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own opening progress" on opening_progress
  for delete using (auth.uid() = user_id);

-- Policies cho game_reviews
create policy "Users can view own reviews" on game_reviews
  for select using (auth.uid() = user_id);

create policy "Users can insert own reviews" on game_reviews
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own reviews" on game_reviews
  for delete using (auth.uid() = user_id);

-- Policies cho coach_messages
create policy "Users can view own messages" on coach_messages
  for select using (auth.uid() = user_id);

create policy "Users can insert own messages" on coach_messages
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own messages" on coach_messages
  for delete using (auth.uid() = user_id);
