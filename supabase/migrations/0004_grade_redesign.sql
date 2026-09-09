-- =============================================================
-- Step 4: Redesign grades to fixed 6 columns per subject/semester.
-- Each student can have at most 6 scores:
--   tx1..tx4 (regular, weight 1; at least 2 required)
--   gk       (mid-term, weight 2)
--   ck       (final, weight 3)
-- averageScore is computed automatically with the weights above.
-- =============================================================

-- Drop old grade-session model
drop table if exists public."gradeSessions" cascade;
drop table if exists public.grades cascade;

-- -------------------------------------------------------------
-- 1. Table: grades (fixed columns)
-- -------------------------------------------------------------
create table if not exists public.grades (
  "id"           uuid primary key default gen_random_uuid(),
  "classId"      uuid not null references public.classes(id) on delete cascade,
  "subjectId"    uuid not null references public.subjects(id) on delete cascade,
  "semester"     smallint not null check ("semester" in (1, 2)),
  "studentId"    uuid not null references public.students(id) on delete cascade,
  "tx1"          numeric(3,1) check ("tx1" between 0 and 10),
  "tx2"          numeric(3,1) check ("tx2" between 0 and 10),
  "tx3"          numeric(3,1) check ("tx3" between 0 and 10),
  "tx4"          numeric(3,1) check ("tx4" between 0 and 10),
  "gk"           numeric(3,1) check ("gk" between 0 and 10),
  "ck"           numeric(3,1) check ("ck" between 0 and 10),
  "averageScore" numeric(4,2),
  "note"         text,
  "comment"      text,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now(),
  unique ("classId", "subjectId", "semester", "studentId")
);

create index if not exists "idx_grades_class_subject_semester" on public.grades ("classId", "subjectId", "semester");
create index if not exists "idx_grades_studentId" on public.grades ("studentId");
create index if not exists "idx_grades_subjectId" on public.grades ("subjectId");

-- -------------------------------------------------------------
-- 2. Table: gradeWeights (maps each slot to its coefficient)
-- -------------------------------------------------------------
create table if not exists public."gradeWeights" (
  "slot"       text primary key,
  "weight"     smallint not null check ("weight" > 0),
  "label"      text not null,
  "fullLabel"  text not null
);

insert into public."gradeWeights" ("slot", "weight", "label", "fullLabel") values
  ('tx1', 1, 'TX1', 'Điểm thường xuyên 1'),
  ('tx2', 1, 'TX2', 'Điểm thường xuyên 2'),
  ('tx3', 1, 'TX3', 'Điểm thường xuyên 3'),
  ('tx4', 1, 'TX4', 'Điểm thường xuyên 4'),
  ('gk',  2, 'GK',  'Điểm giữa kỳ'),
  ('ck',  3, 'CK',  'Điểm cuối kỳ')
on conflict ("slot") do nothing;

comment on table public."gradeWeights" is 'Bảng map hệ số điểm theo từng loại cột điểm.';

-- Foreign key / column documentation
comment on column public.grades."classId" is 'Lớp được chấm điểm.';
comment on column public.grades."subjectId" is 'Môn học của điểm số.';
comment on column public.grades."semester" is 'Học kỳ: 1 hoặc 2.';
comment on column public.grades."studentId" is 'Học sinh được chấm điểm.';
comment on column public.grades."tx1" is 'Điểm thường xuyên 1 (hệ số 1).';
comment on column public.grades."tx2" is 'Điểm thường xuyên 2 (hệ số 1).';
comment on column public.grades."tx3" is 'Điểm thường xuyên 3 (hệ số 1).';
comment on column public.grades."tx4" is 'Điểm thường xuyên 4 (hệ số 1).';
comment on column public.grades."gk" is 'Điểm giữa kỳ (hệ số 2).';
comment on column public.grades."ck" is 'Điểm cuối kỳ (hệ số 3).';
comment on column public.grades."averageScore" is 'Điểm trung bình có hệ số, do ứng dụng tính và lưu lại.';
comment on column public.grades."note" is 'Ghi chú chung cho bảng điểm của học sinh.';
comment on column public.grades."comment" is 'Nhận xét của giáo viên về học sinh.';

-- -------------------------------------------------------------
-- 2. RLS
-- -------------------------------------------------------------
alter table public.grades enable row level security;

create policy "grades_select_own" on public.grades
  for select using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
    and exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  );

create policy "grades_insert_own" on public.grades
  for insert with check (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
    and exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  );

create policy "grades_update_own" on public.grades
  for update using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
    and exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
    and exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  );

create policy "grades_delete_own" on public.grades
  for delete using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
    and exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  );

-- Allow all authenticated users to read grade weights (global reference table)
alter table public."gradeWeights" enable row level security;

create policy "gradeWeights_select_auth" on public."gradeWeights"
  for select to authenticated using (true);

-- -------------------------------------------------------------
-- 3. Statistics view
-- -------------------------------------------------------------
create or replace view public."studentGradeSummaries"
  with (security_invoker = true) as
select
  "studentId",
  "subjectId",
  "classId",
  "semester",
  null::numeric(4,2) as "averageScore",
  (
    (case when "tx1" is not null then 1 else 0 end) +
    (case when "tx2" is not null then 1 else 0 end) +
    (case when "tx3" is not null then 1 else 0 end) +
    (case when "tx4" is not null then 1 else 0 end) +
    (case when "gk" is not null then 1 else 0 end) +
    (case when "ck" is not null then 1 else 0 end)
  )::int as "gradeCount"
from public.grades;
