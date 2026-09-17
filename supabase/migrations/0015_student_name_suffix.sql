-- Distinguishing mark for same-name students ("Nguyễn Văn Vĩnh (A)").
-- Kept in its own column so the real name stays untouched; name
-- matching treats (lastName, firstName, nameSuffix) as the identity.
alter table public.students
  add column "nameSuffix" text;
