-- =====================================================================
-- Mental Model × DISCO — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to re-run: every statement is guarded.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- One row per registered user; extends Supabase's built-in auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'student' check (role in ('student','faculty')),
  -- Reserved for a stronger verification step later (e.g. faculty approval
  -- gating Class Gallery submission). Not enforced by the app today.
  verified_by_faculty boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per app session (created on EVERY successful login, not just signup).
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  client_info text
);
create index if not exists sessions_user_idx on public.sessions(user_id, started_at desc);

-- One row per case study.
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  title text default '',
  archetype text default '',
  student text default '',
  case_date date,
  mm jsonb not null default '{}'::jsonb,
  disco jsonb not null default '{}'::jsonb,
  final_cognitive_brief text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cases_user_idx on public.cases(user_id, updated_at desc);
create index if not exists cases_session_idx on public.cases(session_id);

-- A snapshot copy of a case, shared with the whole class.
create table if not exists public.gallery_submissions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  student text,
  title text,
  archetype text,
  submitted_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists gallery_submitted_idx
  on public.gallery_submissions(submitted_at desc);

-- ---------------------------------------------------------------------
-- 2. Triggers
-- ---------------------------------------------------------------------

-- Auto-create a profile row the moment a user confirms/signs up, so the
-- client never has to race the auth service to insert one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email,''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep cases.updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cases_touch_updated_at on public.cases;
create trigger cases_touch_updated_at
  before update on public.cases
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.sessions            enable row level security;
alter table public.cases               enable row level security;
alter table public.gallery_submissions enable row level security;

-- profiles: a user may read and update only their own row.
drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- sessions: fully private to their owner.
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cases: fully private to their owner. This is the policy that stops one
-- student reading or editing another student's work.
drop policy if exists "own cases" on public.cases;
create policy "own cases" on public.cases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- gallery: any signed-in user may READ every submission (that is the point
-- of a class gallery), but only the owner may insert, update or delete.
drop policy if exists "read all submissions" on public.gallery_submissions;
create policy "read all submissions" on public.gallery_submissions
  for select using (auth.role() = 'authenticated');

drop policy if exists "insert own submissions" on public.gallery_submissions;
create policy "insert own submissions" on public.gallery_submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own submissions" on public.gallery_submissions;
create policy "update own submissions" on public.gallery_submissions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own submissions" on public.gallery_submissions;
create policy "delete own submissions" on public.gallery_submissions
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. Optional: promote yourself to faculty
--    Run this once, replacing the email, after you have registered.
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'faculty' where email = 'you@example.com';

-- ---------------------------------------------------------------------
-- 5. Optional, for later: restrict sign-up to an institutional domain.
--    Uncomment and edit if you ever want to enforce this at the DB level.
-- ---------------------------------------------------------------------
-- create or replace function public.enforce_institutional_email()
-- returns trigger language plpgsql security definer as $$
-- begin
--   if new.email not like '%@nid.edu' then
--     raise exception 'Registration is limited to @nid.edu addresses';
--   end if;
--   return new;
-- end;
-- $$;
-- create trigger enforce_domain before insert on auth.users
--   for each row execute function public.enforce_institutional_email();
