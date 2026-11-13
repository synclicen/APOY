#!/usr/bin/env bash
# Build the Next.js app as a static export for the Cloudflare Worker.
# API routes are temporarily moved aside (the Worker handles /api/* itself).
set -euo pipefail
cd "$(dirname "$0")/.."

API_DIR="src/app/api"
BACKUP_DIR="/tmp/apoy-api-backup"

echo "==> Moving API routes aside (Worker handles them)"
rm -rf "$BACKUP_DIR"
if [ -d "$API_DIR" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$API_DIR/." "$BACKUP_DIR/"
  rm -rf "$API_DIR"
fi

echo "==> Running static export build"
BUILD_FOR_WORKER=true bun run next build 2>&1 | tail -20

echo "==> Restoring API routes"
mkdir -p "$API_DIR"
if [ -d "$BACKUP_DIR" ]; then
  cp -r "$BACKUP_DIR/." "$API_DIR/"
  rm -rf "$BACKUP_DIR"
fi

echo "==> Static export complete. Output: out/"
ls -la out/ 2>/dev/null | head -10
