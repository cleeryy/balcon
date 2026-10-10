# 🪟 balcon

Clone moderne de [changedetection.io](https://github.com/dgtlmoon/changedetection.io) : surveillez des pages web, détectez les changements, recevez des notifications.

Stack : **Next.js 16** (App Router, TS strict, Tailwind v4, shadcn) · **Prisma + SQLite** · sidecar **fetcher Python FastAPI + curl_cffi** · **node-cron** in-process · Docker/Dokploy ready.

## Run local

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run db:seed   # 1 watch exemple (ou: npx prisma db seed)
npm run dev        # http://localhost:3000
```

Sidecar fetcher (optionnel en dev, requis pour les checks) :

```bash
pip install -r fetcher/requirements.txt
uvicorn main:app --app-dir fetcher --port 8000
```

## Run Docker (recommandé)

```bash
cp .env.example .env
docker compose up --build -d
# web: http://localhost:3000 — volume persistant balcon-data:/app/data
# profil FlareSolverr (optionnel) :
ENABLE_FLARESOLVERR=true docker compose --profile flaresolverr up --build -d
```

Migrations en prod (SQLite, volume persistant) :

```bash
docker compose exec web npx prisma migrate deploy
```

## Déploiement Dokploy

1. Nouveau service **Dockerfile** pointant sur ce repo (`cleeryy/balcon`).
2. Volume : `/app/data` (persistance `balcon.db`).
3. Variables d'environnement :
   - `DATABASE_URL=file:/app/data/balcon.db`
   - `FETCHER_URL=http://fetcher:8000`
   - `ENABLE_FLARESOLVERR=false` (+ service FlareSolverr si besoin)
   - `SMTP_*` pour les notifications email.
4. Le sidecar `fetcher` est défini dans `docker-compose.yml` (service interne).
5. Healthcheck : `GET /api/health`.

Alternative Dokploy : déployer via **Docker Compose** en collant le contenu de `docker-compose.yml`.

## API

| Route | Méthode | Description |
|---|---|---|
| `/api/health` | GET | healthcheck (public) |
| `/api/auth/*` | * | Better Auth (public) |
| `/api/watches` | GET/POST | liste / création (session, scopé owner) |
| `/api/watches/[id]` | GET/PATCH/DELETE | détail / màj / suppression (session, 404 hors périmètre) |
| `/api/watches/[id]/check` | POST | vérification manuelle (session, owner) |
| `/api/watches/[id]/snapshots` | GET | 20 derniers snapshots décompressés (session, owner) |
| `/api/watches/import` | POST | import V2 (session, dédup par owner) |
| `/api/watches/export` | GET | export V2 (session, scopé owner) |
| `/api/cron` | GET/POST | checks dus — `Authorization: Bearer CRON_SECRET` ou session admin |
| `/api/admin/settings` | GET/PATCH | `siteName`/`defaultIntervalMin` + statut OIDC lecture seule (admin) |
| `/api/admin/stats` | GET | compteurs users/watches/checks (admin) |

Chaîne de fetch : `fetcher curl_cffi (10s)` → `FlareSolverr optionnel si CF (15s)` → erreur propre. Pas de Playwright en V1.

## Auth (phases 1–2)

Better Auth + plugin `admin`, adaptateur Prisma (SQLite). Instance **fermée** : inscription désactivée partout (`disableSignUp: true` sur email/password et OIDC) — les comptes sont créés par un admin.

- Routes : `/api/auth/[...all]` (catch-all Better Auth).
- OIDC : provider statique `oidc` enregistré **uniquement** si `OIDC_ISSUER`, `OIDC_CLIENT_ID` et `OIDC_CLIENT_SECRET` sont toutes définies (découverte via `{OIDC_ISSUER}/.well-known/openid-configuration`, PKCE + vérification ID token). Pattern de callback à déclarer côté IdP : `{baseURL}/api/auth/callback/oidc`.
- Requiert `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL`. Tokens OAuth chiffrés au repos (`encryptOAuthTokens`).

## Bootstrap admin (phase 2)

Au démarrage Docker (entrypoint, après `prisma migrate deploy`, `set -e` — échec visible) :

```bash
npm run bootstrap:admin   # scripts/bootstrap-admin.ts (tsx)
```

- 0 utilisateur → crée l'admin depuis `ADMIN_EMAIL` + `ADMIN_PASSWORD` (`ADMIN_NAME` optionnel) via le stockage Better Auth (hash scrypt, hooks). Échec fermé et explicite si manquants (jamais de skip silencieux, jamais de secret loggé).
- ≥1 utilisateur → ne fait rien (idempotent, jamais de reset).
- Puis rattache les `Watch` orphelines (`ownerId IS NULL`) au premier admin.

Toutes les routes `/api/watches*` exigent une session et scopent par `ownerId` (`where:{id, ownerId}`, 404 hors périmètre, dédup URL par owner, pas d'`ownerId` accepté du client). `/api/cron` exige `Bearer CRON_SECRET` ou session admin ; le scheduler in-process appelle `runDueChecks()` directement (inchangé). `/api/health` et `/api/auth/*` restent publics. `proxy.ts` redirige les pages `/`, `/watches/*`, `/admin/*` sans cookie de session vers `/login` (UX seule, sécurité dans les routes).
