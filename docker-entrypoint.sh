#!/bin/sh
set -e

echo "→ Waiting for the database and applying migrations..."
# Retry in case Postgres is still warming up, but never start the app on an
# out-of-date database.
attempt=1
until npx prisma migrate deploy; do
  if [ "$attempt" -ge 10 ]; then
    echo "  could not apply migrations after $attempt attempts; not starting the app."
    exit 1
  fi
  echo "  database not ready yet (attempt $attempt), retrying in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

# Sample products are opt-in (the local docker-compose stack sets this) and only
# ever go into an empty shop, so a live catalogue is never touched.
if [ "$SEED_SAMPLE_DATA" = "true" ]; then
  echo "→ Loading the sample catalogue if the shop is empty..."
  npm run db:seed -- --if-empty || echo "  seed step reported an issue; continuing to start the app."
fi

echo "→ Starting AfroPantry on port ${PORT:-3000}..."
exec "$@"
