-- Research jobs persistence
create table if not exists public.research_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  ext_job_id text, -- e.g., job_169999999
  payload jsonb,    -- input request
  result jsonb,     -- output result
  status text not null default 'done',
  created_at timestamptz not null default now()
);

create index if not exists idx_research_jobs_client on public.research_jobs(client_id, created_at desc);