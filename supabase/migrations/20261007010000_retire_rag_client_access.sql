do $$
declare
  function_oid oid;
begin
  if to_regclass('public.chess_knowledge') is not null then
    alter table public.chess_knowledge enable row level security;
    revoke all on table public.chess_knowledge from public, anon, authenticated;
    drop policy if exists "Public read chess_knowledge" on public.chess_knowledge;
    drop policy if exists "Client access retired" on public.chess_knowledge;
    create policy "Client access retired" on public.chess_knowledge
      for all to anon, authenticated using (false) with check (false);
  end if;

  if to_regclass('public.chat_embeddings') is not null then
    alter table public.chat_embeddings enable row level security;
    revoke all on table public.chat_embeddings from public, anon, authenticated;
    drop policy if exists "Public read chat_embeddings" on public.chat_embeddings;
    drop policy if exists "Client access retired" on public.chat_embeddings;
    create policy "Client access retired" on public.chat_embeddings
      for all to anon, authenticated using (false) with check (false);
  end if;

  for function_oid in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'match_chess_knowledge'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', function_oid::regprocedure);
  end loop;
end $$;
