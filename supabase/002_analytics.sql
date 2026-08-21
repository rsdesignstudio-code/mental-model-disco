-- =====================================================================
-- Mental Model × DISCO — migration 002: faculty analytics
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Safe to re-run.
--
-- What this adds:
--   · coarse location (country / region / city) on each session row
--   · last_active_at, so a session has a measurable span
--   · faculty read access to profiles, sessions and cases, enforced in
--     Postgres — not merely hidden in the UI
--
-- Privacy note: no raw IP address is ever stored. The location columns are
-- filled from Vercel's edge geo headers, which are already city-level at
-- best. See src/app/api/session/start/route.ts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------

alter table public.sessions add column if not exists country text;
alter table public.sessions add column if not exists region  text;
alter table public.sessions add column if not exists city    text;

-- Stamped whenever the user saves work during this session. Gives an honest
-- "session span" without any background pinging.
alter table public.sessions add column if not exists last_active_at timestamptz;

create index if not exists sessions_started_idx on public.sessions(started_at desc);
create index if not exists cases_created_idx    on public.cases(created_at desc);

-- ---------------------------------------------------------------------
-- 2. Faculty check
--
-- SECURITY DEFINER so it reads profiles with RLS bypassed. Without this,
-- a faculty policy ON profiles that itself queries profiles recurses
-- infinitely and every query fails.
-- ---------------------------------------------------------------------

create or replace function public.is_faculty()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'faculty'
  );
$$;

revoke all on function public.is_faculty() from public;
grant execute on function public.is_faculty() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Faculty read policies
--
-- These are ADDITIVE. Postgres ORs policies together, so the existing
-- "own cases" / "own sessions" policies are untouched: a student still
-- sees exactly their own rows, and only a faculty account sees everyone's.
-- Faculty get SELECT only — no policy here grants them write access to
-- another person's work.
-- ---------------------------------------------------------------------

drop policy if exists "faculty read all profiles" on public.profiles;
create policy "faculty read all profiles" on public.profiles
  for select using (public.is_faculty());

drop policy if exists "faculty read all sessions" on public.sessions;
create policy "faculty read all sessions" on public.sessions
  for select using (public.is_faculty());

drop policy if exists "faculty read all cases" on public.cases;
create policy "faculty read all cases" on public.cases
  for select using (public.is_faculty());

-- ---------------------------------------------------------------------
-- 4. Verify
--    After running, check your own role is faculty:
-- ---------------------------------------------------------------------
-- select email, role from public.profiles order by created_at;
-- update public.profiles set role = 'faculty' where email = 'you@example.com';
--
-- Then confirm the helper sees you (must return true while signed in as you):
-- select public.is_faculty();
