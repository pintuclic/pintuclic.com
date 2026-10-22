FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN printf 'allowBuilds:\n  esbuild: true\n  unrs-resolver: true\n' > pnpm-workspace.yaml \
    && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
# Next fija en el build los rewrites (BACKEND_URL) y las variables NEXT_PUBLIC_*:
# sin ARG, los "args" de docker-compose se descartan.
ARG BACKEND_URL=http://backend:3000
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV BACKEND_URL=$BACKEND_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec next build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
