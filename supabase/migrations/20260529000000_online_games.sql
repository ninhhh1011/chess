create table online_games (
  id uuid primary key default uuid_generate_v4(),
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text not null default '',
  white_user_id uuid references auth.users(id),
  black_user_id uuid references auth.users(id),
  status text not null default 'waiting',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table online_games enable row level security;

-- Policies
create policy "Anyone can insert an online game" on online_games for insert with check (auth.uid() = white_user_id or auth.uid() = black_user_id);
create policy "Participants can read their game" on online_games for select using (true); -- Allow read for spectator maybe? Let's just allow all for read to simplify link sharing.
create policy "Participants can update their game" on online_games for update using (auth.uid() = white_user_id or auth.uid() = black_user_id);

-- Realtime
alter publication supabase_realtime add table online_games;
