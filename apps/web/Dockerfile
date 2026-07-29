# Image de production du frontend Next.js — construite avec le repo entier
# comme contexte (monorepo pnpm : @atfm/web dépend de @atfm/ui en workspace:*).
# Contexte de build attendu : la racine du repo (voir docker-compose.demo.yml).
FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /repo
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @atfm/db generate
RUN pnpm --filter @atfm/web build

# Next.js "output: standalone" (voir next.config.mjs) produit un dossier
# autonome (server.js + trace minimale de node_modules) — seul ce qui suit
# est nécessaire à l'exécution, jamais le code source ni les devDependencies.
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
