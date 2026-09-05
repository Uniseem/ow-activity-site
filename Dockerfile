# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts env.config.ts ./
# The root postinstall generates Prisma and downloads the CLI's native engines.
RUN npm ci

FROM dependencies AS builder
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ARG APP_GIT_COMMIT_SHA
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    APP_GIT_COMMIT_SHA=${APP_GIT_COMMIT_SHA} \
    BUILD_STANDALONE=1
RUN npm run build

# Migration tools stay in this short-lived image, outside the web runtime.
FROM dependencies AS migrate
ENV NODE_ENV=production
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node deploy/verify-standalone.mjs /tmp/verify-standalone.mjs
USER node
# Check the isolated runtime before an update can replace an existing website.
RUN node /tmp/verify-standalone.mjs /app && rm /tmp/verify-standalone.mjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
