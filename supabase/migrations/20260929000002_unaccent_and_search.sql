-- =============================================================
-- Step 2: Backend full-text helper + search_students RPC
-- Adds unaccent extension and a database-side search function
-- so client pagination/search can be offloaded to Postgres.
-- =============================================================

-- 1. Extension for removing Vietnamese diacritics
create extension if not exists unaccent;

-- 2. Helper: lower-case + remove diacritics
create or replace function public.remove_diacritics(input text)
returns text
language plpgsql
immutable
as $$
begin
  return lower(unaccent('unaccent', input));
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
