# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy connection string so Prisma driver initializes during static page collection
ENV DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
ENV NEXTAUTH_SECRET="build-secret-dummy-key"
ENV NEXTAUTH_URL="http://localhost:3000"

RUN npm run build

# Stage 3: Runner (Production Image)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs prisma.config.js ./

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

# CMD ["sh", "-c", "npx -y prisma db push && node server.js"]
# CMD ["sh", "-c", "echo '=== CONFIG CONTENTS ===' && cat prisma.config.js && echo '=== DOTENV CHECK ===' && npm ls dotenv || true && echo '=== STARTING PRISMA ===' && npx -y prisma db push && node server.js"]
CMD ["sh", "-c", "npx -y prisma db push && node server.js"]