-- Enforce 1 starting credit for all newly created users.
-- Safe to re-run.

alter table public.profiles
  alter column credits set default 1;

-- Backfill any existing rows that were created with 0 or null credits.
update public.profiles
set credits = 1
where credits is null or credits <= 0;

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
