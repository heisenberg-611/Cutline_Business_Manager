#!/usr/bin/env sh
# Runs any command against the local Docker Postgres instead of the hosted DB.
#
#   sh scripts/local-db.sh npx prisma migrate dev
#
# Real environment variables take precedence over .env in Prisma, so exporting
# here is what guarantees Aiven/Neon are never touched by a command run this way.
set -e

LOCAL_DB_URL="postgresql://cutline:cutline_local_dev@localhost:55432/cutline_dev"

export DATABASE_URL="$LOCAL_DB_URL"
export DIRECT_URL="$LOCAL_DB_URL"

exec "$@"
