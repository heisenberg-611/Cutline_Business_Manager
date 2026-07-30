#!/bin/bash
# -----------------------------------------------------------------------------
# Script: sync-standbys.sh
# Purpose: Safely syncs the Prisma schema and migration history to the isolated 
#          Neon and Aiven standby databases.
# 
# Why this exists: 
# - It was discovered that Neon and Aiven were completely disconnected from Supabase 
#   (no logical replication pipeline existed).
# - Running `npx prisma db push` on them failed because they already had data, 
#   and push attempts to drop/recreate columns when types change.
# - This script mimics the safe production deployment process: 
#   1. Resolves the `0_init` baseline (so Prisma knows the old schema exists).
#   2. Deploys the `1_schema_hardening` migration (which includes safe hand-edited 
#      SQL casts like `USING "type"::"AssetType"` to preserve data).
# -----------------------------------------------------------------------------

set -e

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "--- Syncing Neon ---"
if [ -n "$NEON_DIRECT_URL" ]; then
  echo "Resolving baseline..."
  DATABASE_URL="$NEON_DIRECT_URL" DIRECT_URL="$NEON_DIRECT_URL" npx prisma migrate resolve --applied 0_init || true
  
  echo "Deploying schema hardening..."
  DATABASE_URL="$NEON_DIRECT_URL" DIRECT_URL="$NEON_DIRECT_URL" npx prisma migrate deploy
else
  echo "NEON_DIRECT_URL not set"
fi

echo "--- Syncing Aiven ---"
if [ -n "$AIVEN_DIRECT_URL" ]; then
  echo "Resolving baseline..."
  DATABASE_URL="$AIVEN_DIRECT_URL" DIRECT_URL="$AIVEN_DIRECT_URL" npx prisma migrate resolve --applied 0_init || true
  
  echo "Deploying schema hardening..."
  DATABASE_URL="$AIVEN_DIRECT_URL" DIRECT_URL="$AIVEN_DIRECT_URL" npx prisma migrate deploy
else
  echo "AIVEN_DIRECT_URL not set"
fi

echo "All standbys synced successfully!"
