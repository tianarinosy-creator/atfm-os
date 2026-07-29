#!/bin/sh
set -e

cd /repo

echo "[api] Applying database migrations..."
pnpm --filter @atfm/db exec prisma migrate deploy

echo "[api] Checking whether demo data needs seeding..."
NEEDS_SEED=$(cd packages/db && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.person.count()
  .then((c) => { console.log(c === 0 ? 'yes' : 'no'); return prisma.\$disconnect(); })
  .catch((e) => { console.error(e); process.exit(1); });
")

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "[api] Empty database — seeding demo data (first run only)."
  pnpm --filter @atfm/db seed
else
  echo "[api] Demo data already present — skipping seed."
fi

cd /repo
exec "$@"
