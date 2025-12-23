-- Enable pgcrypto if not already present (required for gen_random_uuid)
create extension if not exists "pgcrypto";

-- Create projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
