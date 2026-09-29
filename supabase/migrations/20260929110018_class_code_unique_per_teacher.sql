-- classCode becomes unique per teacher instead of globally unique —
-- different teachers may reuse codes like "10A1" for their own classes.
alter table public.classes
  drop constraint if exists "classes_classCode_key";

-- add constraint raises duplicate_table (42P07), not duplicate_object —
-- guard by pg_constraint lookup instead of relying on an exception handler.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'classes_teacherId_classCode_key'
      and conrelid = 'public.classes'::regclass
  ) then
    alter table public.classes
      add constraint "classes_teacherId_classCode_key"
      unique ("teacherId", "classCode");
  end if;
end
$$;
