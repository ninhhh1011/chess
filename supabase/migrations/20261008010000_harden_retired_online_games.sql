-- Keep the retired table and its rows while removing all client access paths.
revoke all privileges on table public.online_games from public, anon, authenticated;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select pol.polname
    from pg_policy as pol
    join pg_class as rel on rel.oid = pol.polrelid
    join pg_namespace as nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'online_games'
  loop
    execute format('drop policy %I on public.online_games', policy_name);
  end loop;
end;
$$;

alter table public.online_games enable row level security;

comment on table public.online_games is
  'Retired in product scope v1. Rows retained pending deployment data disposition; client grants revoked and no RLS policies allow access.';
