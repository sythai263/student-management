# ENVIRONMENT & OPERATIONS

## 1. Env Files

| File | Purpose |
|---|---|
| `.env` | Active env — currently points at Supabase Cloud + Cloudflare R2 |
| `.env.example` | Template for local dev (self-hosted Supabase + MinIO via docker-compose) |
| `.env.prd` | Production secrets (gitignored — never commit) |
| `.env.prd.example` | Template for production (Supabase Cloud + R2) |

App-runtime vars only: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `S3_*`, `AWS_*`. Docker-compose init vars (`POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `MINIO_ROOT_*`, `*_PORT`) exist only in `.env`/`.env.example` for the local stack.

## 2. Docker (local stack)

```bash
pnpm docker:up      # start postgres + gotrue + postgrest + kong + minio
pnpm docker:down    # stop
pnpm docker:reset   # down -v (wipes volumes) — next `up` re-runs all migrations
pnpm docker:logs    # follow logs
pnpm docker:ps      # status
pnpm gen:keys       # regenerate JWT_SECRET + ANON_KEY + SERVICE_ROLE_KEY
```

The `migrate` service replays every `supabase/migrations/*.sql` on `up`, so migrations MUST be idempotent (guard renames/creates).

## 3. Database Commands

```bash
# Local (container sm-postgres must be running)
pnpm db:migrate        # apply all supabase/migrations/*.sql in order
pnpm db:psql           # interactive psql shell
pnpm db:seed           # run supabase/seed.sql

# Remote (Supabase Cloud) — requires psql + DATABASE_URL
DATABASE_URL="postgresql://postgres:[password]@db.<ref>.supabase.co:5432/postgres" \
  pnpm db:migrate:remote
DATABASE_URL="..." pnpm db:seed:remote
```

`DATABASE_URL` = Supabase Dashboard → Connect → Direct connection.

## 4. Supabase CLI (optional, for cloud migrations)

The repo layout already matches CLI conventions (`supabase/migrations/`, `supabase/seed.sql`). The CLI tracks applied migrations in `supabase_migrations.schema_migrations` — pushes only new files.

```bash
pnpm add -D supabase
pnpm supabase init                                     # creates supabase/config.toml
pnpm supabase login
pnpm supabase link --project-ref <project-ref>
pnpm supabase db push                                  # apply pending migrations
pnpm supabase migration list                           # local vs remote status
pnpm supabase migration new <name>                     # new timestamped migration file
```

Rules:
- **Never run `supabase start`** — it spins up the CLI's own local stack and collides with docker-compose (ports 5433/8000/9000). Local dev stays on `pnpm docker:up`.
- `db push` does NOT seed — use `pnpm db:seed:remote` or SQL Editor.
- If the cloud DB was partially migrated by hand, `db push` may fail — inspect state first, use `supabase migration repair` to reconcile.

## 5. Storage (S3: MinIO local / R2 prod)

The bucket is **fully private** — no public access, no custom domain:

- **Upload:** browser → presigned PUT (`createUploadUrl`) → straight to S3.
- **Read:** browser → `/api/image?key=<objectKey>` → authenticated proxy streams bytes (`students/` and `attendance/` prefixes only; `tmp/` is never servable).
- **DB stores keys, not URLs:** `students.avatarKey`, `attendanceSessions.imageKeys`.

Key layout (`create-upload-url.ts`):
- `tmp/students/`, `tmp/attendance/` — originals, deleted after Rekognition (best-effort)
- `students/`, `attendance/` — compressed display copies, permanent

### R2 production checklist

1. API token: scoped `Object Read & Write`, restricted to the `students-management` bucket.
2. **No custom domain, Public Development URL disabled.**
3. CORS policy — presigned PUT only:
   ```json
   [{
     "AllowedOrigins": ["https://hoctap.id.vn", "http://localhost:3000"],
     "AllowedMethods": ["PUT"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3000
   }]
   ```
4. Lifecycle rule: prefix `tmp/` → delete after 1 day (safety net for best-effort deletes). Keep the default multipart-abort rule; do NOT add bucket-lock rules (they break `deleteObject`).
