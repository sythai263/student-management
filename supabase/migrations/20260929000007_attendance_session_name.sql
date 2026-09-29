-- =============================================================
-- Step 7: Named attendance sessions.
-- A session gets an auto-generated name ("15/09/2026 - Sáng") at
-- creation time; teachers can rename it and hard-delete sessions
-- (records cascade, storage cleanup handled in the server action).
-- =============================================================

alter table public."attendanceSessions"
  add column if not exists "name" text;

comment on column public."attendanceSessions"."name" is
  'Tên buổi điểm danh — tự sinh theo ngày + ca sáng/chiều, giáo viên có thể đổi.';
