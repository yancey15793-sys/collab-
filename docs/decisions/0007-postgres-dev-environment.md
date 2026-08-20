# ADR-0007 — Environnement PostgreSQL de développement

## Statut
Accepté (validé par l'utilisateur le 2026-08-19).

## Contexte
L'environnement de développement inspecté (`node -v`, `psql --version`,
`docker --version`) ne dispose ni de PostgreSQL local, ni de Docker, ni de
`psql`. Le brief impose PostgreSQL comme base de données, sans préciser la
méthode de provisionnement en développement.

## Options considérées

1. **Postgres hébergé gratuit (Neon ou Supabase)** — zéro installation locale,
   `DATABASE_URL` fourni immédiatement, branches de DB éphémères possibles
   (Neon). Nécessite un compte et une connexion internet pour le dev.
2. **Docker Compose (Postgres officiel)** — reproductible, standard pour ce
   type de projet, mais nécessite d'installer Docker Desktop au préalable
   (absent de la machine actuelle).
3. **PostgreSQL local (Homebrew)** — pas de dépendance réseau une fois
   installé, mais installation/configuration manuelle (`brew install
   postgresql@16`, création de rôle/DB) et une instance de plus à maintenir
   sur la machine.

## Recommandation
Option 1 (Postgres hébergé, ex. Neon) pour démarrer immédiatement sans
installation, avec `docker-compose.yml` ajouté en parallèle (Option 2) pour
quiconque préfère un environnement 100 % local/offline par la suite — les deux
ne s'excluent pas, seul `DATABASE_URL` change.

## Décision
Option 1 : **Neon** (Postgres hébergé, tier gratuit).

## Prochaine étape (Phase 1)
1. Créer un projet Neon (console.neon.tech), récupérer la connection string.
2. La coller dans `.env` (`DATABASE_URL`) — jamais commitée.
3. `npm run db:generate` puis `npm run db:migrate` (packages/db) pour créer le
   schéma initial à partir de `packages/db/src/schema.ts`.

`docker-compose.yml` pourra être ajouté ultérieurement pour un environnement
local/offline si besoin, sans remettre en cause cette décision — seule
`DATABASE_URL` change.
