-- Users schema for tenancy and roles
-- Run in Supabase SQL editor.

create table if not exists users (
  id text primary key, -- external user id you pass in x-user-id
  client_id uuid not null,
  role text not null default 'user', -- 'admin' or 'user'
  created_at timestamptz not null default now()
);

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('admin','user'));

-- Optional RLS (effective only when not using service_role)
alter table users enable row level security;

-- Example policies (assuming auth is used later and auth.jwt() includes user id)
-- create policy "self read" on users
--   for select using ((auth.jwt() ->> 'user_id')::text = id);

-- Seed example (replace values):
-- insert into users(id, client_id, role) values ('user-123', '00000000-0000-0000-0000-000000000000', 'admin');