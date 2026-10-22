-- Engine: one table for all your data. Paste this once in Supabase → SQL Editor → Run.
create table if not exists public.engine_docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);
alter table public.engine_docs enable row level security;
drop policy if exists "engine select own" on public.engine_docs;
drop policy if exists "engine insert own" on public.engine_docs;
drop policy if exists "engine update own" on public.engine_docs;
drop policy if exists "engine delete own" on public.engine_docs;
create policy "engine select own" on public.engine_docs for select to authenticated using (auth.uid() = user_id);
create policy "engine insert own" on public.engine_docs for insert to authenticated with check (auth.uid() = user_id);
create policy "engine update own" on public.engine_docs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "engine delete own" on public.engine_docs for delete to authenticated using (auth.uid() = user_id);
do $$ begin
  alter publication supabase_realtime add table public.engine_docs;
exception when duplicate_object then null; end $$;
