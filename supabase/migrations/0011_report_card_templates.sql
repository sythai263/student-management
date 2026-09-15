-- =============================================================
-- Step 11: Custom report card templates ("phiếu điểm")
--   Teachers design their own layout (ordered blocks, stored as
--   JSON) and pick predefined fields to bind — no free-form HTML,
--   just a small set of block types + a fixed field catalogue.
-- =============================================================

create table if not exists public."reportCardTemplates" (
  "id"         uuid primary key default gen_random_uuid(),
  "teacherId"  uuid not null references auth.users(id) on delete cascade,
  "name"       text not null,
  "blocks"     jsonb not null default '[]'::jsonb,
  "isDefault"  boolean not null default false,
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now()
);

comment on column public."reportCardTemplates"."teacherId" is
  'CHỦ SỞ HỮU mẫu phiếu điểm.';
comment on column public."reportCardTemplates"."blocks" is
  'Danh sách khối bố cục theo thứ tự (fieldRow/average/comment/signature/divider), field trong mỗi khối tham chiếu tới danh mục field cố định của app.';
comment on column public."reportCardTemplates"."isDefault" is
  'Mẫu được dùng mặc định khi in phiếu điểm (mỗi giáo viên chỉ 1 mẫu mặc định — thực thi ở tầng ứng dụng).';

create index if not exists "idx_reportCardTemplates_teacherId"
  on public."reportCardTemplates" ("teacherId");

alter table public."reportCardTemplates" enable row level security;

drop policy if exists "reportCardTemplates_select_own" on public."reportCardTemplates";
drop policy if exists "reportCardTemplates_insert_own" on public."reportCardTemplates";
drop policy if exists "reportCardTemplates_update_own" on public."reportCardTemplates";
drop policy if exists "reportCardTemplates_delete_own" on public."reportCardTemplates";

create policy "reportCardTemplates_select_own" on public."reportCardTemplates"
  for select using (auth.uid() = "teacherId");

create policy "reportCardTemplates_insert_own" on public."reportCardTemplates"
  for insert with check (auth.uid() = "teacherId");

create policy "reportCardTemplates_update_own" on public."reportCardTemplates"
  for update using (auth.uid() = "teacherId")
  with check (auth.uid() = "teacherId");

create policy "reportCardTemplates_delete_own" on public."reportCardTemplates"
  for delete using (auth.uid() = "teacherId");
