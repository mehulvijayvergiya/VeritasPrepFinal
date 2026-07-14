-- Step 7: organize submission operations and storage for student workflows.
-- Run after 003_student_profile_and_submissions_expansion.sql.

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
