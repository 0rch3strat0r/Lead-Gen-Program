-- Tenants
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subdomain text unique,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  user_email text not null,
  role text not null check (role in ('admin','member')) default 'member',
  unique (client_id, user_email)
);

create table if not exists client_settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients(id) on delete cascade,
  baseline_keywords jsonb not null default '[]'::jsonb,
  search_toggles jsonb not null default '{"default":true,"augment":true,"custom":true}'::jsonb,
  branding jsonb default '{}',
  feature_flags jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Jobs (per tenant)
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  status text not null check (status in ('queued','running','done','error')),
  prompt text,
  result jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- simple updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_jobs_updated_at on jobs;
create trigger trg_jobs_updated_at before update on jobs
for each row execute procedure set_updated_at();

-- Seed your tenant
insert into clients (name, subdomain) values ('Your Company', null)
on conflict (name) do nothing;

-- Ensure settings row exists
insert into client_settings (client_id, baseline_keywords)
select c.id, '["data entry","reporting analyst"]'::jsonb
from clients c
where not exists (select 1 from client_settings s where s.client_id = c.id);

-- Return the client_id to use as DEFAULT_CLIENT_ID
select id as default_client_id from clients where name = 'Your Company' limit 1;