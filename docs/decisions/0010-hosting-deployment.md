# ADR-0010 — Hébergement et déploiement continu

## Statut

Accepté (validé par l'utilisateur le 2026-08-20 — Vercel/Render écartés,
Railway retenu à la place).

## Contexte

Le repo est maintenant sur GitHub (`github.com/yancey15793-sys/collab-`).
L'utilisateur veut que le projet soit accessible en ligne, avec un déploiement
qui se déclenche depuis GitHub. Le monorepo comporte trois profils
d'exécution très différents :

- **`apps/web`** (Phase 8, pas encore construit) : à terme une SPA/SSR
  React + Vite — fichiers statiques ou rendu léger, servis au navigateur.
- **`apps/api`** (Fastify) : un process Node qui doit tourner en continu
  pour répondre aux requêtes HTTP.
- **`apps/worker`** (pipeline d'ingestion) : un process qui exécute un
  cycle d'ingestion périodique (`INGESTION_INTERVAL_MINUTES`, défaut 15 min)
  — par nature une tâche planifiée, pas un serveur qui répond à des requêtes.

GitHub Pages ne sert que du contenu statique : il ne peut héberger ni
`apps/api` ni `apps/worker`. Il faut donc un hébergeur tiers connecté à
GitHub (déploiement automatique à chaque push), distinct de GitHub lui-même.

## Options considérées

1. **Vercel (web) + Render (api + worker)** — Vercel est la référence pour
   les frontends React/Vite avec déploiement GitHub automatique, preview URL
   par PR, tier gratuit pour projet personnel. Render héberge des process
   Node persistants (Web Service pour l'API) et des tâches planifiées (Cron
   Job pour le worker), également connecté à GitHub, tier gratuit disponible
   pour usage limité.
2. **Railway pour tout** — un seul hébergeur pour les trois apps
   (monorepo-friendly, chaque app = un service). Plus simple à administrer,
   mais le tier gratuit s'est réduit ces derniers temps à un crédit d'essai
   plutôt qu'un palier gratuit permanent — à vérifier à l'inscription.
3. **Fly.io pour tout** — proche de la production (régions, réseau privé
   entre services), mais configuration plus bas niveau (Dockerfile requis
   par service) et courbe d'apprentissage plus longue pour peu de bénéfice
   à ce stade.

## Décision (révisée)

Vercel + Render ont été explicitement écartés par l'utilisateur (2026-08-20),
sans raison technique en cause — préférence pour un hébergeur unique.
**Option 2 retenue : Railway pour les trois apps.**

- Un projet Railway, trois services (`apps/web`, `apps/api`, `apps/worker`),
  chacun connecté au même repo GitHub avec un répertoire racine différent
  (monorepo-friendly — Railway détecte `apps/<nom>` via un `railway.json`
  ou le réglage "Root Directory" par service).
- Déploiement automatique sur push vers `main` pour les trois services.
- **`apps/worker` reste conçu comme un cycle unique qui se termine**
  (et non une boucle `setInterval` infinie) — Railway supporte un
  "Cron Schedule" par service, qui déclenche une exécution puis laisse le
  process s'arrêter. Le raisonnement de l'option Render (tâche périodique
  plutôt que serveur permanent, observabilité par exécution) reste valable
  indépendamment de l'hébergeur ; seul le mécanisme de déclenchement change.
  Conséquence code inchangée : `apps/worker/src/index.ts` doit lancer
  `runCycle()` une fois puis sortir (`process.exit`) au lieu de boucler —
  à faire au moment du câblage du déploiement.
- **`apps/api`** : service Railway classique, toujours actif (pas de
  cron), exposé via une URL publique générée par Railway.
- **`apps/web`** : servi comme un service Railway également (build Vite →
  fichiers statiques servis par le service, ou un serveur Node minimal
  selon ce que Vite/le futur SSR exigent — à trancher en Phase 8).

Le tier gratuit de Railway s'est réduit ces derniers temps à un crédit
d'essai plutôt qu'un palier gratuit permanent : à vérifier au moment de la
création du compte plutôt que de se fier à un chiffre figé dans cette ADR.

## Conséquences

- Un seul compte tiers à créer (Railway), en plus de Neon et GitHub déjà
  en place — plus simple que la première option (deux hébergeurs).
- Secrets (`DATABASE_URL`, `GROQ_API_KEY`, etc.) à dupliquer dans les
  variables d'environnement Railway, par service — jamais commités.
- `apps/web` n'a aujourd'hui aucun contenu réel (Phase 8 pas commencée) :
  le premier déploiement Railway pour ce service servira un placeholder,
  pas l'application finale.
- Administration centralisée sur une seule plateforme (facturation, logs,
  variables d'environnement) au prix d'une dépendance à un unique
  fournisseur pour les trois apps.
