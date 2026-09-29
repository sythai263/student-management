-- =============================================================
-- Step 8: Security linter fixes
--   1. Move `unaccent` extension out of the exposed `public` schema
--   2. Pin search_path on functions (role-mutable search_path warning)
--   3. Revoke EXECUTE on `rls_auto_enable` (SECURITY DEFINER helper
--      that should never be callable via the API)
-- =============================================================

-- 1. Extensions live in their own schema
create schema if not exists extensions;
alter extension unaccent set schema extensions;

-- 2. Helper: lower-case + remove diacritics (pinned search_path)
create or replace function public.remove_diacritics(input text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  return lower(extensions.unaccent('extensions.unaccent', input));
end;
$$;

-- 3. Search + paginate students of a class (RLS still applies)
create or replace function public.search_students(
  p_class_id uuid,
  p_search text,
  p_page int,
  p_page_size int
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_search_norm text := public.remove_diacritics(coalesce(p_search, ''));
  v_total int;
  v_offset int;
  v_students jsonb;
begin
  if p_page < 1 then p_page := 1; end if;
  if p_page_size < 1 then p_page_size := 10; end if;
  v_offset := (p_page - 1) * p_page_size;

  select count(*) into v_total
  from public.students
  where "classId" = p_class_id
    and (
      v_search_norm = ''
      or public.remove_diacritics("studentCode") ilike '%' || v_search_norm || '%'
      or public.remove_diacritics("lastName") ilike '%' || v_search_norm || '%'
      or public.remove_diacritics("firstName") ilike '%' || v_search_norm || '%'
    );

  select jsonb_agg(to_jsonb(s.*) order by s."studentCode")
  into v_students
  from (
    select *
    from public.students
    where "classId" = p_class_id
      and (
        v_search_norm = ''
        or public.remove_diacritics("studentCode") ilike '%' || v_search_norm || '%'
        or public.remove_diacritics("lastName") ilike '%' || v_search_norm || '%'
        or public.remove_diacritics("firstName") ilike '%' || v_search_norm || '%'
      )
    order by "studentCode"
    limit p_page_size
    offset v_offset
  ) s;

  return jsonb_build_object(
    'students', coalesce(v_students, '[]'::jsonb),
    'total', v_total
  );
end;
$$;

grant execute on function public.search_students(uuid, text, int, int) to authenticated;

-- 4. `rls_auto_enable` only exists on the remote project (created by
--    hand during setup, not used by the app) — guard so local dev
--    databases without it don't fail this migration.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated, public';
  end if;
end;
$$;
