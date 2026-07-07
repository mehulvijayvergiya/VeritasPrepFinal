-- Veritas Prep — Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

-- ============================================================
-- STUDENT PROFILES
-- Supabase Auth (auth.users) handles email/password, verification,
-- and password reset. This table holds everything else about a
-- student, keyed 1:1 to auth.users.id.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  credits numeric(10, 2) not null default 0,
  referral_code text unique,
  referred_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists profiles_referral_code_idx on public.profiles (referral_code);

-- ============================================================
-- ADMINS
-- Kept separate from student profiles for now — admin auth stays
-- as custom JWT (unchanged from Step 2) until we decide otherwise.
-- This mirrors the current LowDB "admins" array.
-- ============================================================
create table if not exists public.admins (
  id serial primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SUBMISSIONS
-- Mirrors server/models/Submission.js. annotations/comments stay
-- as JSONB rather than separate tables — they're always read/written
-- as a whole with their parent submission, so normalizing them out
-- would add joins with no real benefit.
-- ============================================================
create table if not exists public.submissions (
  id bigserial primary key,
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  colleges text not null,
  essay text not null,
  activities text not null,
  notes text default '',
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'completed')),
  reviewer_notes text default '',
  annotations jsonb not null default '[]',
  comments jsonb not null default '[]',
  feedback_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_email_idx on public.submissions (email);
create index if not exists submissions_status_idx on public.submissions (status);

-- ============================================================
-- CREDIT REQUESTS
-- Mirrors server/models/CreditRequest.js (Venmo/Zelle purchase proof,
-- reviewed by an admin).
-- ============================================================
create table if not exists public.credit_requests (
  id bigserial primary key,
  profile_id uuid references public.profiles (id) on delete set null,
  email text not null,
  amount_usd numeric(10, 2) not null,
  vc numeric(10, 2) not null,
  method text not null check (method in ('venmo', 'zelle')),
  note text default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists credit_requests_status_idx on public.credit_requests (status);

-- ============================================================
-- APPOINTMENTS (forward-looking — built out in a later step)
-- Table only, no app code wired to it yet. Included now so the
-- schema doesn't need a second migration later.
-- ============================================================
create table if not exists public.appointments (
  id bigserial primary key,
  profile_id uuid references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes integer not null default 15,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'canceled', 'no_show')),
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists appointments_profile_id_idx on public.appointments (profile_id);
create index if not exists appointments_starts_at_idx on public.appointments (starts_at);

-- ============================================================
-- updated_at auto-touch trigger for submissions
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists submissions_touch_updated_at on public.submissions;
create trigger submissions_touch_updated_at
  before update on public.submissions
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Row Level Security
-- The backend (Express) talks to Supabase using the service_role
-- key, which bypasses RLS entirely — so these policies only matter
-- if/when the frontend ever talks to Supabase directly. Enabling
-- RLS now with sensible defaults is cheap insurance either way.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.credit_requests enable row level security;
alter table public.appointments enable row level security;
alter table public.admins enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "submissions_select_own" on public.submissions;
create policy "submissions_select_own" on public.submissions
  for select using (auth.uid() = profile_id);

drop policy if exists "credit_requests_select_own" on public.credit_requests;
create policy "credit_requests_select_own" on public.credit_requests
  for select using (auth.uid() = profile_id);

drop policy if exists "appointments_select_own" on public.appointments;
create policy "appointments_select_own" on public.appointments
  for select using (auth.uid() = profile_id);

-- No public policies on admins — only the service role (backend) can touch it.
