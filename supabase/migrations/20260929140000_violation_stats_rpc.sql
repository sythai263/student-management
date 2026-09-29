-- Per-student violation counts for a class, aggregated in Postgres
-- (RLS still applies — the caller only sees their own classes' rows).
create or replace function public.count_violations_by_student(
  p_class_id uuid,
  p_limit int default 8
)
returns table (
  "studentId" uuid,
  "studentName" text,
  "studentCode" text,
  "violationCount" bigint
)
language sql
stable
as $$
  select
    v."studentId",
    coalesce(
      concat_ws(' ', s."lastName", s."firstName") ||
        case
          when nullif(s."nameSuffix", '') is not null
          then ' (' || s."nameSuffix" || ')'
          else ''
        end,
      'Đã xóa'
    ) as "studentName",
    s."studentCode",
    count(*) as "violationCount"
  from public."studentViolations" v
  left join public.students s on s.id = v."studentId"
  where v."classId" = p_class_id
  group by
    v."studentId",
    s."lastName",
    s."firstName",
    s."nameSuffix",
    s."studentCode"
  order by "violationCount" desc, "studentName"
  limit greatest(p_limit, 1);
$$;

grant execute on function public.count_violations_by_student(uuid, int)
  to authenticated;
