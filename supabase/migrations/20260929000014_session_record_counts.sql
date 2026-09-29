-- =============================================================
-- Step 14: per-session record counts for the attendance list.
-- One row per session: how many attendanceRecords it holds, so
-- the UI derives "cần điểm danh bổ sung" = roster size - count
-- without downloading every record row.
-- =============================================================

create or replace view public."sessionRecordCounts"
  with (security_invoker = true) as
select
  s."id"         as "sessionId",
  s."classId"    as "classId",
  count(ar."id") as "recordCount"
from public."attendanceSessions" s
left join public."attendanceRecords" ar on ar."sessionId" = s."id"
group by s."id";
