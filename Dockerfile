# Root-level Dockerfile (builds backend only; no app code changes)
FROM node:22-alpine
WORKDIR /app

# Copy backend sources
COPY apps/backend/ ./apps/backend/

# Install deps if package.json exists (no-op if not)
WORKDIR /app/apps/backend
RUN [ -f package.json ] && npm ci || true

EXPOSE 3000
CMD ["node", "server.js"]

