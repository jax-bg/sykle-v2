-- Run this in your Supabase SQL editor to create a profiles table for authenticated users.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  lifetime_points int default 0,
  points int default 0,
  current_streak int default 0,
  last_log_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists profiles_email_idx on profiles(email);

create function update_profiles_modified_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on profiles
for each row
execute function update_profiles_modified_at();
