# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-alpine AS base
# libc6-compat/openssl cover native deps; harmless if unused.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client, then build Next. No DB needed at build time
# (all routes render on demand).
RUN npx prisma generate && npm run build

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Bring over installed deps (incl. generated Prisma client + the prisma CLI and
# tsx used by the entrypoint for migrate/seed) and the build output.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
