-- =============================================================
-- Step 10: Teacher signature (for report card PDF export)
--   Each teacher keeps at most one signature image on file,
--   used when printing report cards ("phiếu điểm").
-- =============================================================

create table if not exists public."teacherSignatures" (
  "teacherId" uuid primary key references auth.users(id) on delete cascade,
  "imageKey"  text not null,
  "updatedAt" timestamptz not null default now()
);

comment on column public."teacherSignatures"."teacherId" is
  'CHỦ SỞ HỮU chữ ký — 1 giáo viên chỉ lưu 1 chữ ký hiện hành.';
comment on column public."teacherSignatures"."imageKey" is
  'Khóa lưu trữ (MinIO/R2) của ảnh chữ ký PNG.';

alter table public."teacherSignatures" enable row level security;

drop policy if exists "teacherSignatures_select_own" on public."teacherSignatures";
drop policy if exists "teacherSignatures_insert_own" on public."teacherSignatures";
drop policy if exists "teacherSignatures_update_own" on public."teacherSignatures";
drop policy if exists "teacherSignatures_delete_own" on public."teacherSignatures";

create policy "teacherSignatures_select_own" on public."teacherSignatures"
  for select using (auth.uid() = "teacherId");

create policy "teacherSignatures_insert_own" on public."teacherSignatures"
  for insert with check (auth.uid() = "teacherId");

create policy "teacherSignatures_update_own" on public."teacherSignatures"
  for update using (auth.uid() = "teacherId")
  with check (auth.uid() = "teacherId");

create policy "teacherSignatures_delete_own" on public."teacherSignatures"
  for delete using (auth.uid() = "teacherId");
