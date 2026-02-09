#!/bin/bash
# Database Backup Script
# Usage: ./scripts/backup-db.sh
# Requires: DATABASE_URL env var, pg_dump
#
# Recommended: Run daily via cron
#   0 3 * * * /path/to/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
KEEP_DAYS="${KEEP_DAYS:-30}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."
pg_dump "$DATABASE_URL" --no-owner --no-acl --clean --if-exists | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($SIZE)"

# Cleanup old backups
if [ "$KEEP_DAYS" -gt 0 ]; then
  DELETED=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$KEEP_DAYS -delete -print | wc -l)
  echo "[$(date)] Cleaned up $DELETED backups older than $KEEP_DAYS days"
fi

echo "[$(date)] Backup finished successfully"
