-- =============================================================
-- Step 1: Database Schema (camelCase) + RLS Policies
-- Facial Recognition Attendance SaaS
-- =============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- 1. Table: classes
-- -------------------------------------------------------------
create table if not exists public.classes (
  "id"         uuid primary key default gen_random_uuid(),
  "name"       text not null,
  "schoolYear" text not null,
  "teacherId"  uuid not null references auth.users(id) on delete cascade,
  "createdAt"  timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 2. Table: students
-- -------------------------------------------------------------
create table if not exists public.students (
  "id"          uuid primary key default gen_random_uuid(),
  "studentCode" text not null,
  "lastName"    text not null,
  "firstName"   text not null,
  "dateOfBirth" date,
  "classId"     uuid not null references public.classes(id) on delete cascade,
  "awsFaceId"   text,
  "avatarUrl"   text,
  "createdAt"   timestamptz not null default now(),
  constraint "students_studentCode_classId_key" unique ("studentCode", "classId")
);

-- -------------------------------------------------------------
-- 3. Table: attendanceSessions
-- -------------------------------------------------------------
create table if not exists public."attendanceSessions" (
  "id"          uuid primary key default gen_random_uuid(),
  "classId"     uuid not null references public.classes(id) on delete cascade,
  "sessionDate" date not null default current_date,
  "imageUrls"   text[] not null default '{}',
  "closed"      boolean not null default false,
  "createdAt"   timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 4. Table: attendanceRecords
-- -------------------------------------------------------------
create table if not exists public."attendanceRecords" (
  "id"         uuid primary key default gen_random_uuid(),
  "sessionId"  uuid not null references public."attendanceSessions"(id) on delete cascade,
  "studentId"  uuid not null references public.students(id) on delete cascade,
  "status"     text not null default 'VANG' check ("status" in ('CO_MAT', 'VANG', 'VANG_PHEP', 'BO_TIET', 'DI_MUON')),
  "confidence" double precision,
  "note"       text,
  "createdAt"  timestamptz not null default now(),
  constraint "attendanceRecords_sessionId_studentId_key" unique ("sessionId", "studentId")
);

-- -------------------------------------------------------------
-- 5. Table: subjects (owned by teacher, reused across classes)
-- -------------------------------------------------------------
create table if not exists public.subjects (
  "id"         uuid primary key default gen_random_uuid(),
  "teacherId"  uuid not null references auth.users(id) on delete cascade,
  "name"       text not null,
  "code"       text,
  "createdAt"  timestamptz not null default now(),
  constraint "subjects_teacherId_name_key" unique ("teacherId", "name")
);

-- -------------------------------------------------------------
-- 6. Table: grades (flat, denormalized classId for fast lookups)
-- -------------------------------------------------------------
create table if not exists public.grades (
  "id"         uuid primary key default gen_random_uuid(),
  "studentId"  uuid not null references public.students(id) on delete cascade,
  "subjectId"  uuid not null references public.subjects(id) on delete cascade,
  "classId"    uuid not null references public.classes(id) on delete cascade,
  "semester"   smallint not null check ("semester" between 1 and 3),
  "scoreType"  text not null check ("scoreType" in ('THUONG_XUYEN','MIENG','PHUT_15','TIET_1','GIUA_KY','CUOI_KY')),
  "score"      numeric(4,2) not null check ("score" between 0 and 10),
  "weight"     smallint not null default 1,
  "note"       text,
  "createdAt"  timestamptz not null default now(),
  constraint "grades_studentId_subjectId_semester_scoreType_key"
    unique ("studentId", "subjectId", "semester", "scoreType")
);

-- -------------------------------------------------------------
-- 7. Table: classSubjects (teaching assignment, many-to-many)
--     1 subject (of a teacher) is taught in many classes,
--     1 class has many subjects. Class roster itself is fixed.
-- -------------------------------------------------------------
create table if not exists public."classSubjects" (
  "id"         uuid primary key default gen_random_uuid(),
  "classId"    uuid not null references public.classes(id) on delete cascade,
  "subjectId"  uuid not null references public.subjects(id) on delete cascade,
  "createdAt"  timestamptz not null default now(),
  constraint "classSubjects_classId_subjectId_key" unique ("classId", "subjectId")
);

-- -------------------------------------------------------------
-- Foreign key documentation (visible via \d+ / Supabase Studio)
-- -------------------------------------------------------------
comment on column public.classes."teacherId" is
  'CHỦ SỞ HỮU lớp (giáo viên chủ nhiệm/quản lý). Là gốc cho toàn bộ RLS. KHÔNG phải liên kết phân công giảng dạy — xem classSubjects.';
comment on column public.students."classId" is
  'Sĩ số cố định: 1 học sinh chỉ thuộc đúng 1 lớp trong một năm học.';
comment on column public."attendanceSessions"."classId" is
  'Lớp được điểm danh. Quyền sở hữu suy ra qua classes."teacherId".';
comment on column public."attendanceRecords"."sessionId" is
  'Buổi điểm danh mà bản ghi này thuộc về.';
comment on column public."attendanceRecords"."studentId" is
  'Học sinh được ghi nhận điểm danh.';
comment on column public.subjects."teacherId" is
  'Giáo viên SỞ HỮU môn học. 1 giáo viên dạy 1-3 môn, tái sử dụng ở nhiều lớp qua classSubjects.';
comment on column public.grades."studentId" is
  'Học sinh được chấm điểm.';
comment on column public.grades."subjectId" is
  'Môn học của điểm số. RLS suy ra quyền sở hữu qua subjects."teacherId".';
comment on column public.grades."classId" is
  'Ngữ cảnh lớp (denormalized — năm học suy ra qua classes."schoolYear"). Cho phép xem bảng điểm theo lớp mà không cần join students.';
comment on column public."classSubjects"."classId" is
  'Lớp mà môn học được giảng dạy.';
comment on column public."classSubjects"."subjectId" is
  'Môn được dạy tại lớp. Giáo viên dạy là subjects."teacherId" — đây là liên kết nhiều-nhiều "giáo viên bộ môn dạy ở nhiều lớp".';

-- -------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------
create index if not exists "idx_classes_teacherId"          on public.classes ("teacherId");
create index if not exists "idx_students_classId"           on public.students ("classId");
create index if not exists "idx_attendanceSessions_classId" on public."attendanceSessions" ("classId");
create index if not exists "idx_attendanceRecords_sessionId" on public."attendanceRecords" ("sessionId");
create index if not exists "idx_attendanceRecords_studentId" on public."attendanceRecords" ("studentId");
create index if not exists "idx_subjects_teacherId"          on public.subjects ("teacherId");
create index if not exists "idx_grades_studentId"            on public.grades ("studentId");
create index if not exists "idx_grades_subjectId"            on public.grades ("subjectId");
create index if not exists "idx_grades_classId"              on public.grades ("classId");
create index if not exists "idx_grades_class_subject_semester" on public.grades ("classId", "subjectId", "semester");
create index if not exists "idx_classSubjects_classId"       on public."classSubjects" ("classId");
create index if not exists "idx_classSubjects_subjectId"     on public."classSubjects" ("subjectId");

-- =============================================================
-- ROW LEVEL SECURITY
-- Isolation rule: a teacher can only access data belonging to
-- classes they own (classes."teacherId" = auth.uid()).
-- =============================================================

alter table public.classes               enable row level security;
alter table public.students              enable row level security;
alter table public."classSubjects"       enable row level security;
alter table public."attendanceSessions"  enable row level security;
alter table public."attendanceRecords"   enable row level security;
alter table public.subjects              enable row level security;
alter table public.grades                enable row level security;

-- Drop existing public policies so the script is idempotent when rerun.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- -------------------------------------------------------------
-- classes: owner-only access
-- -------------------------------------------------------------
create policy "classes_select_own" on public.classes
  for select using (auth.uid() = "teacherId");

create policy "classes_insert_own" on public.classes
  for insert with check (auth.uid() = "teacherId");

create policy "classes_update_own" on public.classes
  for update using (auth.uid() = "teacherId")
  with check (auth.uid() = "teacherId");

create policy "classes_delete_own" on public.classes
  for delete using (auth.uid() = "teacherId");

-- -------------------------------------------------------------
-- students: accessible only through an owned class
-- -------------------------------------------------------------
create policy "students_select_via_class" on public.students
  for select using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

create policy "students_insert_via_class" on public.students
  for insert with check (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

create policy "students_update_via_class" on public.students
  for update using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

create policy "students_delete_via_class" on public.students
  for delete using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- classSubjects: assignment allowed only when BOTH the class
-- and the subject belong to the calling teacher
-- -------------------------------------------------------------
create policy "classSubjects_select_own" on public."classSubjects"
  for select using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

create policy "classSubjects_insert_own" on public."classSubjects"
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

create policy "classSubjects_delete_own" on public."classSubjects"
  for delete using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- attendanceSessions: accessible only through an owned class
-- -------------------------------------------------------------
create policy "attendanceSessions_select_via_class" on public."attendanceSessions"
  for select using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

create policy "attendanceSessions_insert_via_class" on public."attendanceSessions"
  for insert with check (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

create policy "attendanceSessions_update_via_class" on public."attendanceSessions"
  for update using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

create policy "attendanceSessions_delete_via_class" on public."attendanceSessions"
  for delete using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- attendanceRecords: accessible only through an owned session
-- -------------------------------------------------------------
create policy "attendanceRecords_select_via_session" on public."attendanceRecords"
  for select using (
    exists (
      select 1
      from public."attendanceSessions" s
      join public.classes c on c."id" = s."classId"
      where s."id" = "sessionId" and c."teacherId" = auth.uid()
    )
  );

create policy "attendanceRecords_insert_via_session" on public."attendanceRecords"
  for insert with check (
    exists (
      select 1
      from public."attendanceSessions" s
      join public.classes c on c."id" = s."classId"
      where s."id" = "sessionId" and c."teacherId" = auth.uid() and not s."closed"
    )
  );

create policy "attendanceRecords_update_via_session" on public."attendanceRecords"
  for update using (
    exists (
      select 1
      from public."attendanceSessions" s
      join public.classes c on c."id" = s."classId"
      where s."id" = "sessionId" and c."teacherId" = auth.uid() and not s."closed"
    )
  ) with check (
    exists (
      select 1
      from public."attendanceSessions" s
      join public.classes c on c."id" = s."classId"
      where s."id" = "sessionId" and c."teacherId" = auth.uid() and not s."closed"
    )
  );

create policy "attendanceRecords_delete_via_session" on public."attendanceRecords"
  for delete using (
    exists (
      select 1
      from public."attendanceSessions" s
      join public.classes c on c."id" = s."classId"
      where s."id" = "sessionId" and c."teacherId" = auth.uid() and not s."closed"
    )
  );

-- -------------------------------------------------------------
-- subjects: owner-only access
-- -------------------------------------------------------------
create policy "subjects_select_own" on public.subjects
  for select using (auth.uid() = "teacherId");

create policy "subjects_insert_own" on public.subjects
  for insert with check (auth.uid() = "teacherId");

create policy "subjects_update_own" on public.subjects
  for update using (auth.uid() = "teacherId")
  with check (auth.uid() = "teacherId");

create policy "subjects_delete_own" on public.subjects
  for delete using (auth.uid() = "teacherId");

-- -------------------------------------------------------------
-- grades: accessible only through an owned subject (1 hop)
-- -------------------------------------------------------------
create policy "grades_select_via_subject" on public.grades
  for select using (
    exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  );

create policy "grades_insert_via_subject" on public.grades
  for insert with check (
    exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  );

create policy "grades_update_via_subject" on public.grades
  for update using (
    exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  );

create policy "grades_delete_via_subject" on public.grades
  for delete using (
    exists (
      select 1 from public.subjects sub
      where sub."id" = "subjectId" and sub."teacherId" = auth.uid()
    )
  );

-- =============================================================
-- STATISTICS VIEW
-- Weighted average per student / subject / class / semester.
-- security_invoker = true -> RLS of base tables still applies,
-- so a teacher only sees summaries of their own data.
-- =============================================================
create or replace view public."studentGradeSummaries"
  with (security_invoker = true) as
select
  g."studentId",
  g."subjectId",
  g."classId",
  g."semester",
  round(sum(g."score" * g."weight") / nullif(sum(g."weight"), 0), 2) as "averageScore",
  count(*)::int as "gradeCount"
from public.grades g
group by g."studentId", g."subjectId", g."classId", g."semester";
