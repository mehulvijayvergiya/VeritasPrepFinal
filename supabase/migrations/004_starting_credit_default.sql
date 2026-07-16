-- Ensure all newly created student profiles start with 1 Veritas Credit.
-- Safe to re-run.

alter table public.profiles
  alter column credits set default 1;

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
