#!/usr/bin/env bash
# Postgres backup -> rclone remote (Google Drive).
#
# Required env:
#   DATABASE_URL    postgres connection string.
#                   Supabase cloud: Dashboard -> Connect -> "Session pooler" URI
#                   (direct db.<ref>.supabase.co needs IPv6 - GitHub runners lack it).
#                   Local docker: postgres://postgres:<pw>@localhost:5433/postgres
#   RCLONE_REMOTE   e.g. "gdrive:backups/student-management"
#
# Optional env:
#   RETENTION_DAYS  delete remote backups older than N days (default: 30)
#   BACKUP_DIR      scratch dir for the dump (default: mktemp -d, auto-cleaned)
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${RCLONE_REMOTE:?RCLONE_REMOTE is required}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="supabase-${STAMP}.dump"

CLEANUP=0
if [ -z "${BACKUP_DIR:-}" ]; then
  BACKUP_DIR="$(mktemp -d)"
  CLEANUP=1
fi
mkdir -p "$BACKUP_DIR"

echo ">> Dumping database to $FILE"
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DATABASE_URL" -Fc -Z9 --no-owner --no-privileges -f "$BACKUP_DIR/$FILE"
elif command -v docker >/dev/null 2>&1; then
  docker run --rm -e DATABASE_URL -v "$BACKUP_DIR:/out" postgres:17-alpine \
    sh -c 'pg_dump "$DATABASE_URL" -Fc -Z9 --no-owner --no-privileges -f /out/db.dump'
  mv "$BACKUP_DIR/db.dump" "$BACKUP_DIR/$FILE"
else
  echo "ERROR: need pg_dump (postgresql-client) or docker" >&2
  exit 1
fi

SIZE="$(du -h "$BACKUP_DIR/$FILE" | cut -f1)"
echo ">> Uploading $FILE ($SIZE) to $RCLONE_REMOTE"
rclone copyto "$BACKUP_DIR/$FILE" "$RCLONE_REMOTE/$FILE"
rclone lsf "$RCLONE_REMOTE" --include "$FILE" | grep -qx "$FILE" \
  || { echo "ERROR: upload verification failed" >&2; exit 1; }

echo ">> Pruning backups older than ${RETENTION_DAYS}d"
rclone delete --min-age "${RETENTION_DAYS}d" "$RCLONE_REMOTE" || true

[ "$CLEANUP" = "1" ] && rm -rf "$BACKUP_DIR"
echo ">> Done: $RCLONE_REMOTE/$FILE"
