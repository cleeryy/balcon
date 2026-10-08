#!/bin/sh
# Entrypoint runner balcon : applique les migrations SQLite puis démarre Next standalone.
# Échoue visiblement (set -e, aucun masquage d'erreur) si la migration échoue.
set -e

echo "[entrypoint] prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] migrations OK, démarrage du serveur."
exec "$@"
