# ADR-0010 — Hébergement et déploiement continu

## Statut

Proposé.

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

## Décision

Option 1, avec un ajustement d'architecture pour le worker :

- **`apps/web` → Vercel.** Déploiement automatique sur push vers `main`,
  preview URL sur chaque PR. Le mieux adapté à un frontend Vite/React.
- **`apps/api` → Render, Web Service.** Déploiement automatique sur push.
  Sur le tier gratuit, le service peut se mettre en veille après une
  période d'inactivité et redémarrer avec un délai à la première requête —
  acceptable pour un MVP, à réévaluer si ça devient gênant.
- **`apps/worker` → Render, Cron Job (et non un process persistant).**
  Plutôt que de laisser tourner en continu une boucle `setInterval` (ADR-0004
  pipeline séquentiel — inchangé), le worker devient un script qui exécute
  **un seul cycle d'ingestion puis se termine**, déclenché par le
  scheduler de Render selon `INGESTION_INTERVAL_MINUTES`. Ça correspond
  mieux à la nature du besoin (tâche périodique, pas un serveur), coûte
  moins cher/rien à faire tourner, et simplifie l'observabilité (un log
  clair par exécution plutôt qu'un process longue durée à surveiller).
  Conséquence code : `apps/worker/src/index.ts` doit exposer un point
  d'entrée qui lance `runCycle()` une fois et sort (`process.exit`), au lieu
  d'une boucle infinie — à faire au moment du câblage du déploiement.

Les tarifs exacts et limites des tiers gratuits évoluent souvent : à
vérifier au moment de la création des comptes plutôt que de se fier aux
chiffres de cette ADR.

## Conséquences

- Trois comptes tiers à créer (Vercel, Render), en plus de Neon et GitHub
  déjà en place.
- Secrets (`DATABASE_URL`, `GROQ_API_KEY`, etc.) à dupliquer dans les
  panneaux d'environnement de Vercel et Render — jamais commités.
- `apps/web` n'a aujourd'hui aucun contenu réel (Phase 8 pas commencée) :
  le premier déploiement Vercel servira un placeholder, pas l'application
  finale.
