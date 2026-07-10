#!/bin/sh
set -e

# The /api reverse-proxy destination is baked into the Next standalone build
# (rewrites() are serialized at build time). To keep ONE universal image that
# works on any platform, the image is built with a sentinel and we swap it for
# the real backend URL at container start — so BACKEND_URL is effectively a
# runtime setting (Coolify uses http://backend:6680, Railway uses
# http://backend.railway.internal:6680, Render/DO/etc. use their own DNS name).
: "${BACKEND_URL:=http://backend:6680}"

SENTINEL="http://appboard-backend-url-sentinel"

if grep -rl "$SENTINEL" /app/.next >/dev/null 2>&1; then
  grep -rl "$SENTINEL" /app/.next 2>/dev/null | while IFS= read -r file; do
    sed -i "s|$SENTINEL|$BACKEND_URL|g" "$file"
  done
  echo "[entrypoint] proxying /api -> $BACKEND_URL"
fi

exec node server.js
