#!/bin/bash
set -e
cd "$(dirname "$0")/.."
DB_PASS=$(grep '^DB_PASSWORD=' .env | cut -d= -f2)
DB_NAME=$(grep '^DB_NAME=' .env | cut -d= -f2)
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
docker compose -f docker-compose.prod.yml exec -T db mysqldump -uroot -p"$DB_PASS" "$DB_NAME" > "backups/eventli-$STAMP.sql"
ls -t backups/eventli-*.sql | tail -n +15 | xargs -r rm
echo "Backup OK: backups/eventli-$STAMP.sql"
