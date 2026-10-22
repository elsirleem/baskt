#!/bin/sh
# Vercel runs this instead of `npm run build` (the "vercel-build" script in package.json).
set -e

npx prisma generate

# Only production deploys change the database; previews of other branches don't.
if [ "$VERCEL_ENV" = "production" ]; then
  if [ -n "$DATABASE_URL_UNPOOLED$POSTGRES_URL_NON_POOLING$DATABASE_URL" ]; then
    echo "→ Applying database migrations"
    npx prisma migrate deploy
    if [ "$SEED_SAMPLE_DATA" = "true" ]; then
      echo "→ Loading the sample catalogue if the shop is empty"
      npm run db:seed -- --if-empty
    fi
  else
    echo "→ No database connected yet (add one in the Storage tab); skipping migrations."
  fi
fi

npx next build
