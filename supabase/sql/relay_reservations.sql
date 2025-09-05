-- Relay table for non-blocking reservation backups via Netlify Function
-- Run in Supabase SQL Editor

create table if not exists public.relay_reservations (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  preferred_date date,
  preferred_time text,
  note text,
  items_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Security: enable RLS, no public read; service role bypasses RLS
alter table public.relay_reservations enable row level security;

-- Indexes
create index if not exists idx_relay_reservations_created_at on public.relay_reservations (created_at desc);


