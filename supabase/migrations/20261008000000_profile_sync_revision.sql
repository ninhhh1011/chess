create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id),
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
  created_at timestamptz default now()
);

alter table public.user_progress
  add column if not exists cloud_revision bigint not null default 0;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_progress_cloud_revision_nonnegative'
      and conrelid = 'public.user_progress'::regclass
  ) then
    alter table public.user_progress
      add constraint user_progress_cloud_revision_nonnegative
      check (cloud_revision >= 0);
  end if;
end $$;

alter table public.user_progress enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_progress' and policyname = 'Users can view own progress') then
    create policy "Users can view own progress" on public.user_progress for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_progress' and policyname = 'Users can update own progress') then
    create policy "Users can update own progress" on public.user_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_progress' and policyname = 'Users can insert own progress') then
    create policy "Users can insert own progress" on public.user_progress for insert with check (auth.uid() = user_id);
  end if;
end $$;
