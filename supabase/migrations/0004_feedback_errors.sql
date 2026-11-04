-- HisabView: feedback from shopkeepers, and error reports from the app
-- Run this file fourth, after 0001, 0002 and 0003.
--
-- Both tables are "write only" for the app: a logged-in person can ADD a row about themselves,
-- but nobody can read, change or delete rows through the app. You read them yourself in the
-- Supabase dashboard (Table Editor), which is not affected by these rules.

create table public.feedback (
  id          uuid primary key,   -- made on the phone, so sending twice never makes a duplicate
  user_id     uuid not null references auth.users (id),
  shop_id     uuid references public.shops (id),
  kind        text not null check (kind in ('problem', 'idea', 'thanks')),
  message     text not null check (char_length(btrim(message)) between 1 and 1000),
  app_version text check (app_version is null or char_length(app_version) <= 40),
  created_at  timestamptz not null default now()
);

create table public.error_log (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id),
  message     text not null check (char_length(message) <= 500),
  stack       text check (stack is null or char_length(stack) <= 4000),
  path        text check (path is null or char_length(path) <= 200),
  app_version text check (app_version is null or char_length(app_version) <= 40),
  user_agent  text check (user_agent is null or char_length(user_agent) <= 300),
  created_at  timestamptz not null default now()
);

create index feedback_created_idx  on public.feedback (created_at desc);
create index error_log_created_idx on public.error_log (created_at desc);

alter table public.feedback  enable row level security;
alter table public.error_log enable row level security;

revoke all on public.feedback, public.error_log from anon;
revoke select, update, delete on public.feedback, public.error_log from authenticated;

create policy feedback_insert on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy error_log_insert on public.error_log for insert to authenticated
  with check (user_id = (select auth.uid()));
