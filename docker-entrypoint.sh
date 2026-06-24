#!/bin/sh
set -e

echo "→ Waiting for the database and applying schema..."
# Retry db push a few times in case Postgres is still warming up.
for i in 1 2 3 4 5 6 7 8 9 10; do
  if npx prisma db push --accept-data-loss; then
    break
  fi
  echo "  database not ready yet (attempt $i), retrying in 3s..."
  sleep 3
done

echo "→ Seeding catalogue (idempotent)..."
npm run db:seed || echo "  seed step reported an issue; continuing to start the app."

echo "→ Starting Baskt on port ${PORT:-3000}..."
exec "$@"
