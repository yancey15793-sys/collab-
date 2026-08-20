# Architecture — Briefeed

> Personal News Intelligence Engine. Ce document est la référence canonique de
> l'architecture. Les décisions structurantes sont détaillées séparément dans
> `docs/decisions/`.

## 1. Principe directeur

```
SOURCES → ARTICLES → ENTITÉS → ÉVÉNEMENTS → STORIES → TENDANCES → SYNTHÈSES → COMPRÉHENSION
```

`ARTICLE ≠ STORY`. Un article est une unité publiée par une source ; une Story
est une représentation évolutive d'un sujet, alimentée par plusieurs articles,
sources, et événements. L'article devient une preuve ; la Story devient l'objet
de compréhension.

Interdit : `RSS → LLM → HTML`. Chaque étape du pipeline est un service testable
indépendamment, avec des frontières explicites.

## 2. Frontières en couches

```
UI (apps/web)
  ↓ appelle
Application Service (packages/pipeline, routes apps/api)
  ↓ dépend d'interfaces
Domain (packages/domain — types, repository interfaces, règles pures)
  ↑ implémentées par
Repository / Infrastructure (packages/db — Drizzle, packages/ingestion, packages/ai)
```

Règle absolue : **aucune logique métier dans les composants React**, et aucune
dépendance du domaine vers l'infrastructure (le domaine ne connaît pas Drizzle,
Fastify, ou Groq — voir `packages/domain`).

## 3. Monorepo

```
briefeed/
  apps/
    web/       — React + TS + Vite (Phase 8+)
    api/       — Fastify + TS, REST typée, zéro logique métier
    worker/    — Ingestion + pipeline, cycle planifié, processus séparé de l'API
  packages/
    domain/    — Types métier, interfaces de repository, règles pures (lifecycle, trend formula)
    db/        — Schéma Drizzle (PostgreSQL), migrations, implémentations de repository
    ingestion/ — Contrats de fetch/parse RSS-Atom (implémentation Phase 1)
    pipeline/  — Application Services : Story Engine, Event Engine, Trend Engine (Phases 2-5)
    ai/        — Client Groq, schémas Zod de sortie structurée, Ask (Phase 6)
    shared/    — Erreurs applicatives partagées, utilitaires transverses
  docs/
```

`apps/api` et `apps/worker` sont deux processus distincts : l'API sert des
lectures rapides et ne doit jamais être bloquée par un cycle d'ingestion ou un
appel Groq. Le worker tourne sur un intervalle (`INGESTION_INTERVAL_MINUTES`)
et orchestre le pipeline complet.

## 4. Flux de données (pipeline)

```
INGESTION → NORMALISATION → DÉDUPLICATION → ENRICHISSEMENT → CLASSIFICATION
  → ENTITY EXTRACTION → SEMANTIC MATCHING → CLUSTERING → STORY ENGINE
  → EVENT ENGINE → TREND ENGINE → RANKING ENGINE → AI SYNTHESIS
  → EDITORIAL OBJECTS → UI
```

Pour le MVP, ce pipeline est **séquentiel et synchrone** au sein d'un cycle
worker (pas de file de messages) — voir `docs/decisions/0004-sequential-pipeline.md`.
Chaque étape est une fonction/service isolé avec une interface claire, ce qui
permet de le faire évoluer vers un pipeline événementiel (queue) sans réécrire
la logique métier.

Isolation par source : l'échec d'une source (timeout, XML malformé, 404) ne
doit jamais interrompre le traitement des autres sources ni casser un cycle
entier. Chaque étape catch ses propres erreurs et les journalise
(`SourceSyncLog`) sans propager d'exception au-delà de sa source.

## 5. Recherche

MVP : PostgreSQL full-text search (`tsvector`/`tsquery`) sur `articles.title`,
`articles.description`, `stories.title`, `stories.summary`. L'architecture
réserve la place pour `pgvector` (recherche sémantique, clustering par
embeddings) sans dépendance MVP — voir `docs/decisions/0005-heuristic-matching-mvp.md`.

## 6. Sécurité

Aucune clé (Groq, etc.) côté frontend. `apps/web` ne parle qu'à `apps/api` ; les
appels Groq sont exclusivement faits par `apps/worker` (synthèse asynchrone) et
`apps/api` (endpoint `/api/ask`, à la demande). `.env` n'est jamais commité,
`.env.example` documente les variables.

## 7. Observabilité

Logs structurés (JSON) à chaque étape critique : fetch RSS, parsing,
déduplication, story matching, appels IA (succès/échec), erreurs DB. MVP :
`pino` (fourni par Fastify) côté API/worker avec des champs structurés
(`sourceId`, `storyId`, `stage`, `durationMs`). Métriques détaillées (Prometheus
etc.) : roadmap future, pas de dépendance MVP.

## 8. Voir aussi

- `docs/domain-model.md` — modèle de données complet
- `docs/ingestion.md` — pipeline d'ingestion RSS/Atom
- `docs/story-engine.md` — algorithme de clustering et lifecycle
- `docs/trend-engine.md` — formule de trend score
- `docs/ai.md` — pipeline de synthèse IA et Ask
- `docs/api.md` — contrats REST
- `docs/design-system.md` — direction visuelle et composants
- `docs/decisions/` — ADRs
