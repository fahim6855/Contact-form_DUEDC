-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null check (char_length(btrim(full_name)) between 2 and 100),
  company_name text not null check (char_length(btrim(company_name)) between 1 and 100),
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone        text not null check (char_length(btrim(phone)) between 7 and 30),
  consent      boolean not null check (consent = true),
  created_at   timestamptz not null default now()
);

-- Lock the table: browsers (anon key) can't touch it directly.
-- Only the Edge Functions (service role) read and write.
alter table public.messages enable row level security;
