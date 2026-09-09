-- =============================================================
-- Step 3: Grade rounds (dot kiem tra) support
-- Allows multiple rounds of the same score type per subject/class/semester.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Table: gradeSessions
-- A round/occasion for entering scores (e.g. "Kiem tra mieng tuan 3").
-- -------------------------------------------------------------
create table if not exists public."gradeSessions" (
  "id"          uuid primary key default gen_random_uuid(),
  "classId"     uuid not null references public.classes(id) on delete cascade,
  "subjectId"   uuid not null references public.subjects(id) on delete cascade,
  "semester"    smallint not null check ("semester" between 1 and 3),
  "scoreType"   text not null check ("scoreType" in ('THUONG_XUYEN','MIENG','PHUT_15','TIET_1','GIUA_KY','CUOI_KY')),
  "name"        text not null,
  "date"        date not null default current_date,
  "weight"      smallint not null default 1 check ("weight" between 1 and 10),
  "closed"      boolean not null default false,
  "createdAt"   timestamptz not null default now(),
  constraint "gradeSessions_classId_subjectId_name_key" unique ("classId", "subjectId", "name")
);

-- -------------------------------------------------------------
-- 2. Update grades table to reference a grade round
-- Keep denormalized classId/subjectId/semester/scoreType/weight for fast
-- lookups and so the existing studentGradeSummaries view still works.
-- -------------------------------------------------------------
alter table public.grades
  add column if not exists "gradeSessionId" uuid;

-- Drop old uniqueness so multiple rounds of the same scoreType are allowed.
alter table public.grades
  drop constraint if exists "grades_studentId_subjectId_semester_scoreType_key";

-- New uniqueness: one score per student per grade round.
-- Multiple NULL gradeSessionId values are still allowed (legacy rows).
alter table public.grades
  add constraint "grades_gradeSessionId_studentId_key"
    unique ("gradeSessionId", "studentId");

alter table public.grades
  add constraint "grades_gradeSessionId_fkey"
    foreign key ("gradeSessionId") references public."gradeSessions"(id) on delete cascade;

create index if not exists "idx_grades_gradeSessionId" on public.grades ("gradeSessionId");
create index if not exists "idx_gradeSessions_classId" on public."gradeSessions" ("classId");
create index if not exists "idx_gradeSessions_subjectId" on public."gradeSessions" ("subjectId");

-- Foreign key documentation
comment on column public."gradeSessions"."classId" is 'Lop duoc kiem tra.';
comment on column public."gradeSessions"."subjectId" is 'Mon hoc cua dot kiem tra.';
comment on column public."gradeSessions"."scoreType" is 'Loai diem (mieng, 15 phut, 1 tiet, ...).';
comment on column public."gradeSessions"."name" is 'Ten dot kiem tra, vi du: "Kiem tra mieng tuan 3".';
comment on column public."gradeSessions"."weight" is 'He so diem cua dot kiem tra nay (mac dinh 1).';
comment on column public."gradeSessions"."closed" is 'Khi dong, khong cho phep sua diem nua.';
comment on column public.grades."gradeSessionId" is 'Dot kiem tra ma diem nay thuoc ve.';

-- -------------------------------------------------------------
-- 3. RLS for gradeSessions
-- A teacher can only access sessions for classes and subjects they own.
-- -------------------------------------------------------------
alter table public."gradeSessions" enable row level security;

create policy "gradeSessions_select_own" on public."gradeSessions"
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

create policy "gradeSessions_insert_own" on public."gradeSessions"
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

create policy "gradeSessions_update_own" on public."gradeSessions"
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

create policy "gradeSessions_delete_own" on public."gradeSessions"
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

-- -------------------------------------------------------------
-- 4. Refresh grades RLS policies to reference gradeSessions
-- For new rows, enforce the session ownership. Legacy rows still work
-- through the denormalized subjectId column.
-- -------------------------------------------------------------
drop policy if exists "grades_select_via_subject" on public.grades;
drop policy if exists "grades_insert_via_subject" on public.grades;
drop policy if exists "grades_update_via_subject" on public.grades;
drop policy if exists "grades_delete_via_subject" on public.grades;

create policy "grades_select_own" on public.grades
  for select using (
    (
      "gradeSessionId" is null
      and exists (
        select 1 from public.subjects sub
        where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
      )
    )
    or
    (
      "gradeSessionId" is not null
      and exists (
        select 1 from public."gradeSessions" gs
        where gs."id" = "gradeSessionId"
          and exists (
            select 1 from public.subjects sub
            where sub."id" = gs."subjectId" and sub."teacherId" = auth.uid()
          )
      )
    )
  );

create policy "grades_insert_own" on public.grades
  for insert with check (
    (
      "gradeSessionId" is null
      and exists (
        select 1 from public.subjects sub
        where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
      )
    )
    or
    (
      "gradeSessionId" is not null
      and exists (
        select 1 from public."gradeSessions" gs
        where gs."id" = "gradeSessionId"
          and not gs."closed"
          and exists (
            select 1 from public.subjects sub
            where sub."id" = gs."subjectId" and sub."teacherId" = auth.uid()
          )
      )
    )
  );

create policy "grades_update_own" on public.grades
  for update using (
    (
      "gradeSessionId" is null
      and exists (
        select 1 from public.subjects sub
        where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
      )
    )
    or
    (
      "gradeSessionId" is not null
      and exists (
        select 1 from public."gradeSessions" gs
        where gs."id" = "gradeSessionId"
          and not gs."closed"
          and exists (
            select 1 from public.subjects sub
            where sub."id" = gs."subjectId" and sub."teacherId" = auth.uid()
          )
      )
    )
  )
  with check (
    (
      "gradeSessionId" is null
      and exists (
        select 1 from public.subjects sub
        where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
      )
    )
    or
    (
      "gradeSessionId" is not null
      and exists (
        select 1 from public."gradeSessions" gs
        where gs."id" = "gradeSessionId"
          and not gs."closed"
          and exists (
            select 1 from public.subjects sub
            where sub."id" = gs."subjectId" and sub."teacherId" = auth.uid()
          )
      )
    )
  );

create policy "grades_delete_own" on public.grades
  for delete using (
    (
      "gradeSessionId" is null
      and exists (
        select 1 from public.subjects sub
        where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
      )
    )
    or
    (
      "gradeSessionId" is not null
      and exists (
        select 1 from public."gradeSessions" gs
        where gs."id" = "gradeSessionId"
          and not gs."closed"
          and exists (
            select 1 from public.subjects sub
            where sub."id" = gs."subjectId" and sub."teacherId" = auth.uid()
          )
      )
    )
  );
