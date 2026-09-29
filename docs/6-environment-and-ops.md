# ENVIRONMENT & OPERATIONS

## 1. Env Files

| File               | Purpose                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `.env`             | Active env — currently points at Supabase Cloud + Cloudflare R2          |
| `.env.example`     | Template for local dev (self-hosted Supabase + MinIO via docker-compose) |
| `.env.prd`         | Production secrets (gitignored — never commit)                           |
| `.env.prd.example` | Template for production (Supabase Cloud + R2)                            |

App-runtime vars only: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `S3_*`, `AWS_*`. Docker-compose init vars (`POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `MINIO_ROOT_*`, `*_PORT`) exist only in `.env`/`.env.example` for the local stack.

## 2. Docker (local stack)

```bash
pnpm docker:up      # start postgres + gotrue + postgrest + kong + minio + mailpit (plus one-shot migrate/minio-init/templates services)
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

## 4. Supabase CLI (cloud migrations)

The repo layout already matches CLI conventions (`supabase/migrations/`, `supabase/seed.sql`). The CLI tracks applied migrations in `supabase_migrations.schema_migrations` — pushes only new files.

```bash
pnpm supabase login
pnpm supabase link --project-ref <project-ref>
pnpm db:migration:list                        # local vs remote status
pnpm db:migration:new <name>                  # new timestamped migration file
pnpm db:push                                  # apply pending migrations
pnpm db:pull                                  # dump remote schema diff into a NEW migration file (only when remote drifted outside migrations)
pnpm db:migration:repair --status applied|reverted <version...>
```

Rules:
- **Never run `supabase start`** — it spins up the CLI's own local stack and collides with docker-compose (ports 5433/8000/9000). Local dev stays on `pnpm docker:up`.
- **Migration filenames are `YYYYMMDDHHMMSS_<name>.sql`** (the format `migration new` emits). Sequential numbers (`0001`, `0013`, ...) were dropped after two branches produced colliding versions; never hand-number migrations again.
- `db push` does NOT seed — use `pnpm db:seed:remote` or SQL Editor.
- If the cloud DB was partially migrated by hand or versions were renamed, `db push` may complain about missing/extra versions — inspect with `pnpm db:migration:list`, then reconcile with `pnpm db:migration:repair` (`applied` records a version without executing it; `reverted` drops a remote-only entry).
- Hosted Supabase manages the `realtime`/`_realtime` schemas itself — `20260929000017_realtime_schemas.sql` is a no-op there (see its exception handler); it only does real work on the self-hosted stack.

## 5. Storage (S3: MinIO local / R2 prod)

The bucket is **fully private** — no public access, no custom domain:

- **Upload:** browser → presigned PUT (`createUploadUrl`) → straight to S3.
- **Read:** browser → `/api/image?key=<objectKey>` → authenticated proxy streams bytes (`students/`, `attendance/`, `signatures/` prefixes only; `tmp/` is never servable). `signatures/` is additionally scoped to `signatures/<teacherId>/` of the caller.
- **DB stores keys, not URLs:** `students.avatarKey`, `attendanceSessions.imageKeys`, `teacherSignatures.imageKey`.

Key layout (`create-upload-url.ts`):
- `tmp/students/`, `tmp/attendance/` — originals, deleted after Rekognition (best-effort)
- `students/`, `attendance/` — compressed display copies, permanent
- `signatures/` — teacher signature PNGs, scoped by teacherId (`signature-display` kind)

### R2 production checklist

1. API token: scoped `Object Read & Write`, restricted to the `student-management` bucket.
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
