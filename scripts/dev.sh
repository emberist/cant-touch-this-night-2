#!/bin/bash
set -e

# Ensure .clickhouse data directory exists
mkdir -p .clickhouse

# Download ClickHouse executable if not present
if [ ! -f "./clickhouse" ]; then
  echo "[CH] ClickHouse binary not found, downloading..."
  curl -fsSL https://clickhouse.com/ | sh
  echo "[CH] ClickHouse downloaded."
fi

# Kill any existing ClickHouse server process
EXISTING_PIDS=$(pgrep -f "clickhouse server" 2>/dev/null || true)
if [ -n "$EXISTING_PIDS" ]; then
  echo "[CH] Killing existing ClickHouse process(es): $EXISTING_PIDS"
  echo "$EXISTING_PIDS" | xargs kill 2>/dev/null || true
  # Wait for the lock file to be released
  while [ -f ".clickhouse/status" ] && lsof ".clickhouse/status" > /dev/null 2>&1; do
    sleep 0.3
  done
fi

# Start ClickHouse in the background
./clickhouse server -- --path=.clickhouse &
CH_PID=$!

# Kill ClickHouse when this script exits
trap "kill $CH_PID 2>/dev/null; exit 0" INT TERM EXIT

# Wait until ClickHouse native TCP port (9000) is accepting connections
echo "[CH] Waiting for ClickHouse to be ready..."
until nc -z localhost 9000 2>/dev/null; do
  sleep 0.3
done
echo "[CH] ClickHouse ready."

# Run migrations
echo "[DB] Running migrations..."
if pnpm exec tsx scripts/migrate.ts; then
  echo "[DB] Migrations done."
else
  echo "[DB] Migration FAILED — check output above."
  exit 1
fi

# Start Next.js
pnpm exec next dev
