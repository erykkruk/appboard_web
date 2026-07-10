# syntax=docker/dockerfile:1

# --- deps: install dependencies from a frozen lockfile ---
FROM oven/bun:alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- builder: build the Next.js standalone output ---
FROM oven/bun:alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Next evaluates rewrites() at BUILD time for standalone output, so the /api
# proxy destination is baked in. We bake a SENTINEL here and swap it for the
# real backend URL at container start (see docker-entrypoint.sh) — that keeps a
# single universal image whose BACKEND_URL is effectively runtime-configurable
# on any platform (Coolify, Railway, Render, DO, Heroku, Dokploy, ...).
ARG BACKEND_URL=http://appboard-backend-url-sentinel
ENV BACKEND_URL=$BACKEND_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# --- runner: minimal production image ---
# Next's standalone server is a Node server — run it on Node (not Bun), whose
# rewrite/proxy internals otherwise mishandle the /api reverse proxy.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=6600

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 6600

ENTRYPOINT ["/app/docker-entrypoint.sh"]
