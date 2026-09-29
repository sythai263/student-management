-- =============================================================
-- Step 5: Global subject catalog.
-- This table holds the reference list of high-school subjects.
-- A teacher's own subjects are still stored in public.subjects
-- (teacherId), created by selecting from this catalog.
-- =============================================================

create table if not exists public."subjectCatalog" (
  "id"         uuid primary key default gen_random_uuid(),
  "name"       text not null unique,
  "code"       text,
  "createdAt"  timestamptz not null default now()
);

insert into public."subjectCatalog" ("name", "code") values
  ('Toán', 'MATH'),
  ('Vật lý', 'PHYS'),
  ('Hóa học', 'CHEM'),
  ('Sinh học', 'BIO'),
  ('Tin học', 'COMP'),
  ('Công nghệ', 'TECH'),
  ('Ngữ văn', 'LIT'),
  ('Lịch sử', 'HIST'),
  ('Địa lý', 'GEO'),
  ('Giáo dục công dân', 'CIVIC'),
  ('Tiếng Anh', 'ENG'),
  ('Giáo dục quốc phòng và an ninh', 'DEF'),
  ('Thể dục', 'PE')
on conflict ("name") do nothing;

-- Global reference table: any authenticated/anonymous client can read.
alter table public."subjectCatalog" enable row level security;

create policy "subjectCatalog_select_all" on public."subjectCatalog"
  for select using (true);
