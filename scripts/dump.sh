#!/bin/bash
set -e

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "Starting pg_dump using Docker..."
# Use the postgres container to run pg_dump against the remote DIRECT_URL
# Stream the output directly to a local SQL file.
/usr/local/bin/docker run --rm -e DIRECT_URL="$DIRECT_URL" postgres:17 bash -c 'pg_dump "$DIRECT_URL" --no-owner --no-privileges' > supabase_backup_$(date +%F_%H-%M-%S).sql

echo "Backup complete! File saved to project root."
