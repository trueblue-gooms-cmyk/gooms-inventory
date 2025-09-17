create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text,
  created_at timestamp with time zone default now()
);
