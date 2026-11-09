-- Keep-alive heartbeat: cron-job.org hits /api/ping on a schedule to bump
-- this single row, so the free-tier Supabase Cloud project never idles
-- into a pause. Not teacher data — one global row keyed 'ping'.
create table if not exists public."keepAlive" (
  "key"          text primary key,
  "lastPingedAt" timestamptz not null default now()
);

insert into public."keepAlive" ("key")
values ('ping')
on conflict ("key") do nothing;

alter table public."keepAlive" enable row level security;

-- Read is public (the /ping status page renders it anonymously); writes
-- go through the service-role key only, so no write policies exist.
drop policy if exists "keepAlive_select_public" on public."keepAlive";
create policy "keepAlive_select_public" on public."keepAlive"
  for select using (true);
