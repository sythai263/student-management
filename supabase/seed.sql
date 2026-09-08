-- =============================================================
-- Seed data for local dev.
-- Run: pnpm db:seed   (hoặc: docker exec -i sm-postgres psql -U supabase_admin -d postgres < supabase/seed.sql)
--
-- Tạo teacher login được qua app:
--   email:    teacher@example.com
--   password: password123
-- Idempotent: xóa data cũ của teacher này trước khi seed lại.
-- =============================================================

begin;

-- -------------------------------------------------------------
-- 1. Teacher account (auth.users + auth.identities — gotrue v2)
-- -------------------------------------------------------------
-- Xóa user cũ nếu đã seed trước đó (cascade xóa identities + public data qua FK)
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  '', 'authenticated',
  'teacher@example.com',
  crypt('password123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"teacher@example.com","email_verified":true,"phone_verified":false,"full_name":"Giáo Viên Demo"}',
  false, now(), now(), '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"teacher@example.com","email_verified":true,"phone_verified":false}',
  'email', now(), now(), now()
)
on conflict (provider, provider_id) do nothing;

-- -------------------------------------------------------------
-- 2. Xóa data cũ của teacher (idempotent re-seed)
-- -------------------------------------------------------------
delete from public.classes where "teacherId" = '11111111-1111-1111-1111-111111111111';
delete from public.subjects where "teacherId" = '11111111-1111-1111-1111-111111111111';

-- -------------------------------------------------------------
-- 3. Classes
-- -------------------------------------------------------------
insert into public.classes (id, name, "schoolYear", "teacherId") values
  ('aaaaaaaa-0000-0000-0000-000000000001', '10A1', '2025-2026', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11B2', '2025-2026', '11111111-1111-1111-1111-111111111111');

-- -------------------------------------------------------------
-- 4. Students — 10A1 (8 HS), 11B2 (5 HS)
-- -------------------------------------------------------------
insert into public.students ("studentCode", "lastName", "firstName", "dateOfBirth", "classId") values
  ('HS001', 'Nguyễn Văn', 'An',   '2010-03-15', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('HS002', 'Trần Thị',   'Bình', '2010-05-20', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('HS003', 'Lê Hoàng',   'Cường','2010-01-08', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('HS004', 'Phạm Minh',  'Dũng', '2010-07-22', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('HS005', 'Hoàng Thu',  'Hà',   '2010-11-30', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('HS006', 'Vũ Đức',     'Khang','2010-02-14', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('HS007', 'Đặng Ngọc',  'Linh', '2010-09-05', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('HS008', 'Bùi Quốc',   'Nam',  '2010-04-18', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('HS101', 'Ngô Thanh',  'Mai',  '2009-06-10', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('HS102', 'Đỗ Hữu',     'Phúc', '2009-08-25', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('HS103', 'Trịnh Kim',  'Ngân', '2009-12-01', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('HS104', 'Lý Gia',     'Bảo',  '2009-03-17', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('HS105', 'Phan Anh',   'Tuấn', '2009-10-09', 'aaaaaaaa-0000-0000-0000-000000000002');

-- -------------------------------------------------------------
-- 5. Subjects + classSubjects (phân công giảng dạy)
-- -------------------------------------------------------------
insert into public.subjects (id, "teacherId", name, code) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Toán', 'TOAN'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Vật Lý', 'LY'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Tiếng Anh', 'ANH');

insert into public."classSubjects" ("classId", "subjectId") values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003');

commit;

-- Kết quả
select 'classes' as tbl, count(*) from public.classes
union all select 'students', count(*) from public.students
union all select 'subjects', count(*) from public.subjects;
