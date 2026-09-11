-- =============================================================
-- Seed data for local dev.
-- Run: pnpm db:seed   (hoặc: docker exec -i sm-postgres psql -U supabase_admin -d postgres < supabase/seed.sql)
--
-- Tạo teacher login được qua app:
--   email:    anh.htm510@gmail.com
--   password: password123
-- Idempotent: xóa data cũ của teacher này trước khi seed lại.
-- =============================================================

begin;

-- -------------------------------------------------------------
-- 1. Teacher account (auth.users + auth.identities — gotrue v2)
-- -------------------------------------------------------------
-- Xóa user cũ nếu đã seed trước đó (cascade xóa identities + public data qua FK)
delete from auth.users where id = '78cc213a-fb71-4a4c-b2d3-7a030bb7addc';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '78cc213a-fb71-4a4c-b2d3-7a030bb7addc',
  '', 'authenticated',
  'anh.htm510@gmail.com',
  crypt('password123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"sub":"78cc213a-fb71-4a4c-b2d3-7a030bb7addc","email":"anh.htm510@gmail.com","email_verified":true,"phone_verified":false,"full_name":"Mai Anh"}',
  false, now(), now(), '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  '78cc213a-fb71-4a4c-b2d3-7a030bb7addc',
  '78cc213a-fb71-4a4c-b2d3-7a030bb7addc',
  '78cc213a-fb71-4a4c-b2d3-7a030bb7addc',
  '{"sub":"78cc213a-fb71-4a4c-b2d3-7a030bb7addc","email":"anh.htm510@gmail.com","email_verified":true,"phone_verified":false}',
  'email', now(), now(), now()
)
on conflict (provider, provider_id) do nothing;

-- -------------------------------------------------------------
-- 2. Xóa data cũ của teacher (idempotent re-seed)
-- -------------------------------------------------------------
delete from public.classes where "teacherId" = '78cc213a-fb71-4a4c-b2d3-7a030bb7addc';
delete from public.subjects where "teacherId" = '78cc213a-fb71-4a4c-b2d3-7a030bb7addc';

commit;

-- Kết quả
select 'classes' as tbl, count(*) from public.classes
union all select 'students', count(*) from public.students
union all select 'subjects', count(*) from public.subjects
union all select 'subjectCatalog', count(*) from public."subjectCatalog";
