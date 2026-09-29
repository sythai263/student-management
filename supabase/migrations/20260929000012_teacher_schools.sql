-- =============================================================
-- Step 12: Teacher schools (a teacher may teach at many schools)
--   Classes optionally map to one of the teacher's schools;
--   the school name feeds report cards automatically.
-- =============================================================

create table if not exists public."teacherSchools" (
  "id"        uuid primary key default gen_random_uuid(),
  "teacherId" uuid not null references auth.users(id) on delete cascade,
  "name"      text not null,
  "createdAt" timestamptz not null default now(),
  unique ("teacherId", "name")
);

comment on column public."teacherSchools"."teacherId" is
  'CHỦ SỞ HỮU — trường mà giáo viên đang giảng dạy.';

alter table public.classes
  add column if not exists "schoolId" uuid
  references public."teacherSchools"(id) on delete set null;

comment on column public.classes."schoolId" is
  'Trường giảng dạy của lớp (tùy chọn) — xóa trường thì lớp tự gỡ mapping.';

alter table public."teacherSchools" enable row level security;

drop policy if exists "teacherSchools_select_own" on public."teacherSchools";
drop policy if exists "teacherSchools_insert_own" on public."teacherSchools";
drop policy if exists "teacherSchools_update_own" on public."teacherSchools";
drop policy if exists "teacherSchools_delete_own" on public."teacherSchools";

create policy "teacherSchools_select_own" on public."teacherSchools"
  for select using (auth.uid() = "teacherId");

create policy "teacherSchools_insert_own" on public."teacherSchools"
  for insert with check (auth.uid() = "teacherId");

create policy "teacherSchools_update_own" on public."teacherSchools"
  for update using (auth.uid() = "teacherId")
  with check (auth.uid() = "teacherId");

create policy "teacherSchools_delete_own" on public."teacherSchools"
  for delete using (auth.uid() = "teacherId");

-- classes: a class may only map to a school owned by the same teacher.
drop policy if exists "classes_insert_own" on public.classes;
create policy "classes_insert_own" on public.classes
  for insert with check (
    auth.uid() = "teacherId"
    and (
      "schoolId" is null
      or exists (
        select 1 from public."teacherSchools" s
        where s."id" = "schoolId" and s."teacherId" = auth.uid()
      )
    )
  );

drop policy if exists "classes_update_own" on public.classes;
create policy "classes_update_own" on public.classes
  for update using (auth.uid() = "teacherId")
  with check (
    auth.uid() = "teacherId"
    and (
      "schoolId" is null
      or exists (
        select 1 from public."teacherSchools" s
        where s."id" = "schoolId" and s."teacherId" = auth.uid()
      )
    )
  );
