-- Ensure submission billing + feedback fields exist for stable admin review updates.
alter table if exists public.submissions
  add column if not exists vc_charged boolean default false;

alter table if exists public.submissions
  add column if not exists vc_charged_at timestamptz;

alter table if exists public.submissions
  add column if not exists feedback_attachment_filename text;

alter table if exists public.submissions
  add column if not exists feedback_attachment_original_name text;

alter table if exists public.submissions
  add column if not exists feedback_attachment_storage_path text;

alter table if exists public.submissions
  add column if not exists feedback_attachment_url text;

-- Durable transaction history table for credit spend/refund/purchases.
create table if not exists public.transactions (
  id text primary key,
  email text not null,
  type text not null,
  amount numeric not null,
  note text,
  status text default 'completed',
  created_at timestamptz default now()
);

create index if not exists idx_transactions_email_created_at
  on public.transactions (lower(email), created_at desc);
