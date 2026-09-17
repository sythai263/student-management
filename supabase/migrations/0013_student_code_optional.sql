-- =============================================================
-- Step 13: studentCode becomes optional + name-first ordering
-- Mã học sinh giờ chỉ là nhãn tùy chọn — danh sách sắp xếp theo
-- Tên rồi mới tới Họ (quy ước Việt Nam), không còn phụ thuộc mã.
-- The (studentCode, classId) unique constraint stays: Postgres
-- treats NULLs as distinct, so code-less students never conflict.
-- =============================================================

alter table public.students
  alter column "studentCode" drop not null;

-- Search + paginate students of a class, ordered by firstName then
-- lastName with diacritics stripped (closest to vi collation in SQL).
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

  select jsonb_agg(
    to_jsonb(s.*)
    order by
      public.remove_diacritics(s."firstName"),
      public.remove_diacritics(s."lastName"),
      s."id"
  )
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
    order by
      public.remove_diacritics("firstName"),
      public.remove_diacritics("lastName"),
      "id"
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
