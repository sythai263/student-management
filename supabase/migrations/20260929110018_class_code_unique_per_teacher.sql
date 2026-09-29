-- classCode becomes unique per teacher instead of globally unique —
-- different teachers may reuse codes like "10A1" for their own classes.
alter table public.classes
  drop constraint if exists "classes_classCode_key";

do $$
begin
  alter table public.classes
    add constraint "classes_teacherId_classCode_key"
    unique ("teacherId", "classCode");
exception
  when duplicate_object then null;
end
$$;
