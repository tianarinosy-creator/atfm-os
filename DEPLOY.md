# Déploiement de la démo persistante (atfmlegacy.com)

Stack Docker Compose autonome : Postgres + API NestJS + Web Next.js + Caddy
(reverse proxy avec TLS automatique via Let's Encrypt). Testée de bout en
bout (build des deux images, migrations, seed, login réel, rendu HTML).

## Prérequis sur le serveur cible

- Docker + Docker Compose plugin.
- Le DNS de `atfmlegacy.com` (A/AAAA) doit pointer vers l'IP publique du
  serveur **avant** de démarrer Caddy, sinon l'émission du certificat
  Let's Encrypt (challenge HTTP-01 sur le port 80) échoue.
- Ports 80 et 443 ouverts et libres sur le serveur.

## Premier déploiement

```bash
git clone <ce dépôt> && cd atfm-os
cp .env.demo.example .env.demo
# Éditer .env.demo : DOMAIN=atfmlegacy.com + secrets forts
#   (openssl rand -hex 32 pour JWT_SECRET / ODOO_CREDENTIALS_KEY,
#    openssl rand -hex 24 pour POSTGRES_PASSWORD)

docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --build
```

Au premier démarrage, le conteneur `api` applique les migrations Prisma puis
alimente la base avec les données de démonstration (voir
`packages/db/prisma/seed.ts`) — uniquement si la base est vide, jamais aux
démarrages suivants (`docker/api-entrypoint.sh`). Le mot de passe commun à
tous les comptes de démo est `atfm-dev-2026` (à changer si la démo devient
publique durablement — voir « Après la démo » ci-dessous).

## Architecture

- `caddy` est le seul service exposé sur 80/443 : il termine le TLS pour
  `${DOMAIN}` et proxifie tout vers `web`.
- `web` (Next.js) ne parle jamais de l'API au navigateur : tous les appels
  passent par ses routes serveur (`apps/web/lib/api.ts`), qui appellent
  `api` sur le réseau Docker interne (`http://api:3001/api`).
- `api` n'est donc jamais exposée publiquement.
- `db` (Postgres) persiste dans le volume nommé `db_data`.

## Mettre à jour le déploiement

```bash
git pull
docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --build
```

Les migrations Prisma en attente sont appliquées automatiquement au
redémarrage du conteneur `api` ; le seed ne se relance pas si des données
existent déjà.

## Vérifier l'état

```bash
docker compose -f docker-compose.demo.yml logs -f api
docker compose -f docker-compose.demo.yml ps
```

## Après la démo

Si `atfmlegacy.com` doit rester en ligne durablement au-delà d'une simple
démo, remplacer le mot de passe de seed commun (`atfm-dev-2026`) par des
comptes réels, et régénérer `JWT_SECRET` / `ODOO_CREDENTIALS_KEY` si les
valeurs de `.env.demo` ont pu être exposées.
