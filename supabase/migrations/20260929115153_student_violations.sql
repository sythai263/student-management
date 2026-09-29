-- Teacher records of class-rule violations: which students, what they
-- did (free text built from quick-pick presets), and when the teacher
-- noted it (recordedAt sent from the teacher's machine).
create table if not exists public."studentViolations" (
  "id"         uuid primary key default gen_random_uuid(),
  "classId"    uuid not null references public.classes(id) on delete cascade,
  "studentId"  uuid not null references public.students(id) on delete cascade,
  "content"    text not null,
  "recordedAt" timestamptz not null default now(),
  "createdAt"  timestamptz not null default now()
);

create index if not exists "idx_studentViolations_classId"
  on public."studentViolations" ("classId", "recordedAt" desc);

alter table public."studentViolations" enable row level security;

-- -------------------------------------------------------------
-- RLS: accessible only through an owned class; insert requires
-- the student to actually belong to that class.
-- -------------------------------------------------------------
drop policy if exists "studentViolations_select_via_class" on public."studentViolations";
create policy "studentViolations_select_via_class" on public."studentViolations"
  for select using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );

drop policy if exists "studentViolations_insert_via_class" on public."studentViolations";
create policy "studentViolations_insert_via_class" on public."studentViolations"
  for insert with check (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
    and exists (
      select 1 from public.students s
      where s."id" = "studentId" and s."classId" = "classId"
    )
  );

drop policy if exists "studentViolations_delete_via_class" on public."studentViolations";
create policy "studentViolations_delete_via_class" on public."studentViolations"
  for delete using (
    exists (
      select 1 from public.classes c
      where c."id" = "classId" and c."teacherId" = auth.uid()
    )
  );
