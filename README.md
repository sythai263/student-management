# Student Management

Hệ thống quản lý lớp học & điểm danh cho giáo viên — hỗ trợ **điểm danh bằng AI** (nhận diện khuôn mặt qua AWS Rekognition) và **điểm danh thủ công** (roll-call với phím tắt + countdown).

## Tính năng

- Quản lý lớp học, học sinh (thêm thủ công / import CSV).
- Đăng ký ảnh chân dung học sinh → index khuôn mặt vào Rekognition.
- Điểm danh bằng AI: upload ảnh nhóm (mobile-friendly, mở camera trực tiếp) → Rekognition match → tạo session kết quả.
- Điểm danh thủ công: modal gọi tên từng HS, phím tắt **C** (có mặt) / **V** (vắng) / **P** (vắng phép), mỗi HS có 6s — hết giờ tự ghi Vắng.
- Review kết quả: grid compact, filter theo trạng thái (backend), click card để sửa sai sót.
- Auth qua Supabase (email/password), RLS theo từng giáo viên.

## Tech stack

- **Next.js 16** (App Router, Server Components) + **React 19** + **TypeScript 7** (strict).
- **Tailwind CSS v4** + **shadcn/ui**.
- **Supabase** (Postgres + Auth + PostgREST, RLS) — cloud hoặc self-host bằng `docker-compose.yaml`.
- **React Query v5** cho data fetching/mutation (optimistic update).
- **AWS Rekognition** — face collection cho nhận diện.
- **MinIO** (local) / **Cloudflare R2** (production) — S3-compatible storage cho ảnh.
- **React Hook Form + Zod** — validation.
- **pnpm** — package manager.

## Cấu trúc

```
src/
  app/            # Routes (chỉ là shell, không query trực tiếp)
  components/     # UI theo domain: auth, classes, students, attendance, ui (shadcn)
  hooks/          # React Query hooks (client-side data layer)
  lib/
    actions/      # Server Actions (ActionResult, withAction, requireTeacher)
    supabase/     # server / client / middleware clients
    storage/      # S3 helpers (MinIO/R2)
    rekognition/  # AWS Rekognition helpers
    image/        # Image processing
  schemas/        # Zod schemas
  constants/      # Constants dùng chung (@constants)
supabase/
  migrations/     # SQL init (mount vào postgres khi self-host)
  kong.yml        # API gateway routes
docs/             # Tài liệu thiết kế
```

## Setup

### 1. Cài dependencies

```bash
pnpm install
```

### 2. Backend — chọn 1 trong 2

**A. Supabase cloud**: tạo project, chạy `supabase/migrations/0001_init_schema.sql` trong SQL Editor.

**B. Self-host (docker compose)**:

```bash
cp .env.example .env
# Điền POSTGRES_PASSWORD, JWT_SECRET (>=32 ký tự)
# Generate ANON_KEY / SERVICE_ROLE_KEY (JWT ký bằng JWT_SECRET):
# https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
docker compose up -d
```

Services: `db` (postgres, port `POSTGRES_PORT`), `auth` (gotrue), `rest` (postgrest), `kong` (gateway — `NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000`), `minio` + `minio-init` (tự tạo bucket).

### 3. Biến môi trường

Xem `.env.example` — các nhóm chính:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `S3_*` — MinIO local hoặc R2 production
- `AWS_*` — Rekognition credentials (cần IAM quyền `rekognition:*` trên collection)
- Ports: `POSTGRES_PORT`, `KONG_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT` (đổi nếu đụng port)

### 4. Chạy dev

```bash
pnpm dev        # http://localhost:3000
pnpm typecheck  # kiểm tra types
pnpm build      # production build
```

## Luồng điểm danh

1. Tạo lớp → thêm/import học sinh → đăng ký ảnh chân dung (index face).
2. **AI**: upload ảnh nhóm (điện thoại) → hệ thống match → mở trang review (desktop): grid vắng/vắng phép trước, sửa nhanh bằng C/V/P hoặc click card.
3. **Thủ công**: "Điểm danh thủ công" → "Bắt đầu điểm danh" → modal gọi tên, 6s/HS.
