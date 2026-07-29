# Image de production de l'API NestJS — construite avec le repo entier comme
# contexte (monorepo pnpm : @atfm/api dépend de @atfm/db en workspace:*).
# Contexte de build attendu : la racine du repo (voir docker-compose.demo.yml).
FROM node:22-alpine

# Requis par les moteurs Prisma (query engine + schema engine utilisé par
# `migrate deploy`) : sans le paquet openssl, Alpine ne fournit que
# libssl.so.3 sans l'utilitaire de détection, et Prisma se rabat par défaut
# sur un binaire lié à libssl.so.1.1 (absent) — échec silencieux au démarrage.
RUN apk add --no-cache openssl

RUN corepack enable

WORKDIR /repo
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @atfm/db generate
RUN pnpm --filter @atfm/api build

RUN chmod +x /repo/docker/api-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["/repo/docker/api-entrypoint.sh"]
CMD ["node", "apps/api/dist/main.js"]
