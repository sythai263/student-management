-- -------------------------------------------------------------
-- Private storage: image columns hold object keys, not public URLs.
-- Stored objects are read back through the authenticated /api/image
-- route — the bucket itself has no public access.
-- -------------------------------------------------------------

-- Guards keep this re-runnable: the local `migrate` service replays
-- every file on `docker compose up`.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students'
      and column_name = 'avatarUrl'
  ) then
    alter table public."students" rename column "avatarUrl" to "avatarKey";
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'attendanceSessions'
      and column_name = 'imageUrls'
  ) then
    alter table public."attendanceSessions" rename column "imageUrls" to "imageKeys";
  end if;
end $$;

-- Legacy rows stored full public URLs (<base>/<key>); extract the bare
-- key. A value that doesn't contain a known key prefix becomes NULL
-- (the row is re-uploadable via the normal edit flow).
update public."students"
set "avatarKey" = nullif(
  regexp_replace("avatarKey", '^.*(students|attendance|tmp)/', '\1/'),
  "avatarKey"
)
where "avatarKey" ~ '^https?://';

update public."attendanceSessions" s
set "imageKeys" = (
  select array_agg(
    regexp_replace(u, '^.*(students|attendance|tmp)/', '\1/')
    order by ord
  )
  from unnest(s."imageKeys") with ordinality as t(u, ord)
)
where s."imageKeys" <> '{}';
