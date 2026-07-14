-- Run this in the Supabase SQL Editor (after 002_profile_on_signup.sql).
-- Step 6, Section 1: schema for expanded student profiles, richer
-- submissions, and the appointment-scheduling foundation.

-- ============================================================
-- PROFILES — required student fields
-- ============================================================
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

-- Let a student read/update their own profile directly if a future page
-- ever talks to Supabase straight from the browser. The backend (service
-- role) bypasses this regardless.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- SUBMISSIONS — richer essay submission fields
-- ============================================================
alter table public.submissions
  add column if not exists essay_for text
    check (essay_for is null or essay_for in ('specific_college', 'common_app', 'other')),
  add column if not exists essay_for_college text,
  add column if not exists word_count integer,
  add column if not exists essay_prompt text,
  add column if not exists attachment_path text;

-- Students can create and read their own submissions directly, for the
-- same forward-looking reason as above.
drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own" on public.submissions
  for insert with check (auth.uid() = profile_id);

-- ============================================================
-- APPOINTMENT SCHEDULING FOUNDATION
-- appointment_slots = admin-defined open times.
-- appointments.slot_id links a booking to the slot it filled.
-- No booking/payment logic yet — structure only.
-- ============================================================
create table if not exists public.appointment_slots (
  id bigserial primary key,
  starts_at timestamptz not null,
  duration_minutes integer not null default 15,
  is_booked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists appointment_slots_starts_at_idx on public.appointment_slots (starts_at);
create index if not exists appointment_slots_is_booked_idx on public.appointment_slots (is_booked);

alter table public.appointments
  add column if not exists slot_id bigint references public.appointment_slots (id);

create unique index if not exists appointments_slot_id_unique
  on public.appointments (slot_id) where slot_id is not null;

alter table public.appointment_slots enable row level security;

drop policy if exists "appointment_slots_select_open" on public.appointment_slots;
create policy "appointment_slots_select_open" on public.appointment_slots
  for select using (true);
-- Anyone authenticated can see open times (no student-identifying info in
-- this table); booking itself still only happens through the backend for
-- now, so this is read-only from the client's perspective.

drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments
  for insert with check (auth.uid() = profile_id);

-- ============================================================
-- STORAGE — private bucket for optional essay PDF attachments
-- ============================================================
insert into storage.buckets (id, name, public)
values ('essay-attachments', 'essay-attachments', false)
on conflict (id) do nothing;

-- Students may only touch files under a folder named after their own
-- profile id, e.g. essay-attachments/<profile_id>/my-essay.pdf
drop policy if exists "essay_attachments_own_folder_all" on storage.objects;
create policy "essay_attachments_own_folder_all" on storage.objects
  for all
  using (bucket_id = 'essay-attachments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'essay-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
