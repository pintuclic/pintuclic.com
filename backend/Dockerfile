# ------------------------------------------------------------------------------
# Fase 1: Build (compilación estricta de TypeScript a JavaScript)
# ------------------------------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

# Toolchain para compilar dependencia nativa bcrypt
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY pnpm-workspace.yaml* ./

RUN printf 'allowBuilds:\n  bcrypt: true\n  esbuild: true\n  "@prisma/client": true\n  "@prisma/engines": true\n  prisma: true\n' > pnpm-workspace.yaml \
    && pnpm import \
    && pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm exec prisma generate \
    && pnpm exec tsc --declaration false --declarationMap false \
    && pnpm install --prod --frozen-lockfile

# ------------------------------------------------------------------------------
# Fase 2: Producción (runtime mínimo, sin npm ni pnpm)
# ------------------------------------------------------------------------------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
