#!/bin/bash
# -----------------------------------------------------------------------------
# Script: dump.sh
# Purpose: Takes a manual, secure point-in-time backup of the Supabase production 
#          database using pg_dump via Docker. 
# 
# Why this exists: 
# - It was created during the Phase 3 schema hardening to ensure a 
#   failsafe backup existed before modifying the live production schema, 
#   especially since the Free tier lacks managed PITR (Point-In-Time Recovery).
# - It uses environment variables inside the script to avoid leaking 
#   the production database password into the shell history or process list.
# -----------------------------------------------------------------------------

set -e

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "Starting pg_dump using Docker..."
# Use the postgres container to run pg_dump against the remote DIRECT_URL
# Stream the output directly to a local SQL file.
/usr/local/bin/docker run --rm -e DIRECT_URL="$DIRECT_URL" postgres:17 bash -c 'pg_dump "$DIRECT_URL" --no-owner --no-privileges' > supabase_backup_$(date +%F_%H-%M-%S).sql

echo "Backup complete! File saved to project root."
