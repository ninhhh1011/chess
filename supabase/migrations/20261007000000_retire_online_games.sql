-- Retire multiplayer access without dropping rows before deployment data is inventoried.
drop policy if exists "Anyone can insert an online game" on online_games;
drop policy if exists "Participants can read their game" on online_games;
drop policy if exists "Participants can update their game" on online_games;

revoke all on table online_games from anon, authenticated;

create policy "Retired online games are inaccessible" on online_games
  for all using (false) with check (false);

comment on table online_games is
  'Retired in product scope v1. Rows retained pending deployment data disposition; no client access allowed.';
