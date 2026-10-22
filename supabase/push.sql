-- Engine: notifications with the app closed (Web Push). Run this once in Supabase → SQL Editor, after schema.sql.
-- The app keeps the next 48 h of reminders in push_queue; the engine-push function sends the due ones every 5 minutes.
create table if not exists public.push_subs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null,
  sub jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);
create table if not exists public.push_queue (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  at timestamptz not null,
  title text not null,
  body text,
  tag text,
  data jsonb,
  cond jsonb,
  sent_at timestamptz,
  primary key (user_id, key)
);
create index if not exists push_queue_due on public.push_queue (at) where sent_at is null;
alter table public.push_subs enable row level security;
alter table public.push_queue enable row level security;
drop policy if exists "push subs own" on public.push_subs;
drop policy if exists "push queue own" on public.push_queue;
create policy "push subs own" on public.push_subs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push queue own" on public.push_queue for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Every 5 minutes, call the function. Replace YOUR-PROJECT and YOUR-CRON-SECRET (the same value you set as CRON_SECRET).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('engine-push') where exists (select 1 from cron.job where jobname = 'engine-push');
select cron.schedule('engine-push', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT.supabase.co/functions/v1/engine-push',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR-CRON-SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb)
$$);
