-- Opportunities schema for lead/opportunity management
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists regions (
  code text primary key,
  name text not null
);

insert into regions(code, name) values
  ('nyc', 'New York City'),
  ('la', 'Los Angeles'),
  ('chi', 'Chicago'),
  ('dal', 'Dallas'),
  ('mia', 'Miami'),
  ('sea', 'Seattle')
  on conflict (code) do nothing;

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  title text not null,
  url text not null,
  source text,
  region_code text references regions(code),
  keywords text[],
  status text not null default 'unclaimed',
  claimed_by text,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One unique opportunity per client per URL
create unique index if not exists uniq_opportunity_client_url on opportunities(client_id, url);

-- Simple status constraint
alter table opportunities drop constraint if exists opportunities_status_check;
alter table opportunities add constraint opportunities_status_check
  check (status in ('unclaimed','claimed','won','lost'));

-- Updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_opportunities_updated_at on opportunities;
create trigger trg_opportunities_updated_at
before update on opportunities
for each row execute function set_updated_at();