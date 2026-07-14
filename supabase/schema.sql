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

alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists gpa numeric(3, 2) check (gpa is null or (gpa >= 0 and gpa <= 5.0)),
  add column if not exists sat_score integer check (sat_score is null or (sat_score >= 400 and sat_score <= 1600)),
  add column if not exists act_score integer check (act_score is null or (act_score >= 1 and act_score <= 36)),
  add column if not exists graduation_year integer check (graduation_year is null or (graduation_year >= 2020 and graduation_year <= 2100)),
  add column if not exists high_school text,
  add column if not exists intended_major text,
  add column if not exists ap_course_count integer check (ap_course_count is null or (ap_course_count >= 0 and ap_course_count <= 50)),
  add column if not exists class_rank_percentile numeric(5, 2)
    check (class_rank_percentile is null or (class_rank_percentile >= 0 and class_rank_percentile <= 100)),
  add column if not exists extracurricular_summary text,
  add column if not exists target_colleges text[] not null default '{}';

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

-- ============================================================
-- STUDENT SUBMISSION ORGANIZATION
-- Adds explicit submission naming/checklist fields and workspace tracking.
-- ============================================================
alter table public.submissions
  add column if not exists service_key text,
  add column if not exists service_label text,
  add column if not exists vc_cost numeric(10, 2),
  add column if not exists submission_type text,
  add column if not exists submission_title text,
  add column if not exists submission_checklist jsonb not null default '[]',
  add column if not exists payment_verified boolean not null default false,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists google_drive_folder_id text,
  add column if not exists google_drive_folder_url text,
  add column if not exists attachment_path text;

create index if not exists submissions_profile_created_idx
  on public.submissions (profile_id, created_at desc);

create table if not exists public.student_submission_folders (
  id bigserial primary key,
  profile_id uuid references public.profiles (id) on delete cascade,
  student_name text not null,
  google_drive_folder_id text,
  google_drive_folder_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists student_submission_folders_profile_unique
  on public.student_submission_folders (profile_id);

create table if not exists public.submission_assets (
  id bigserial primary key,
  submission_id bigint not null references public.submissions (id) on delete cascade,
  asset_kind text not null default 'pdf',
  bucket_name text not null,
  storage_path text not null,
  original_name text,
  created_at timestamptz not null default now()
);

create index if not exists submission_assets_submission_idx
  on public.submission_assets (submission_id, created_at desc);

alter table public.student_submission_folders enable row level security;
alter table public.submission_assets enable row level security;

drop policy if exists "student_submission_folders_select_own" on public.student_submission_folders;
create policy "student_submission_folders_select_own" on public.student_submission_folders
  for select using (auth.uid() = profile_id);

drop policy if exists "submission_assets_select_own" on public.submission_assets;
create policy "submission_assets_select_own" on public.submission_assets
  for select using (
    exists (
      select 1
      from public.submissions s
      where s.id = submission_id and s.profile_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('student-submissions', 'student-submissions', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('admin-feedback', 'admin-feedback', false)
on conflict (id) do nothing;

drop policy if exists "student_submissions_own_folder_all" on storage.objects;
create policy "student_submissions_own_folder_all" on storage.objects
  for all
  using (
    bucket_id = 'student-submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'student-submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
