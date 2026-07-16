-- Run this in the Supabase SQL Editor (after schema.sql).
-- Auto-creates a public.profiles row whenever a new user signs up through
-- Supabase Auth, so every authenticated student always has a matching
-- profile (credits, referral code) with no extra backend step required.

create or replace function public.make_referral_code(email text)
returns text as $$
declare
  base text;
  rand text;
begin
  base := upper(left(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9]', '', 'g'), 6));
  if base = '' then
    base := 'VP';
  end if;
  rand := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
  return base || '-' || rand;
end;
$$ language plpgsql;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, credits, referral_code)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    1,
    public.make_referral_code(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
