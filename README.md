# Briefeed

**Your personal system for understanding information.**

Briefeed n'est pas un lecteur RSS. C'est un **moteur d'intelligence
informationnelle personnelle** : il transforme des flux RSS bruts en Stories
compréhensibles — regroupées, contextualisées, expliquées, et toujours
traçables jusqu'à leurs sources originales.

```
SOURCES → ARTICLES → ENTITÉS → ÉVÉNEMENTS → STORIES → TENDANCES → SYNTHÈSES → COMPRÉHENSION
```

## État du projet

- **Phase 0 — Architecture.** ✅ Fait. Modèle de données, frontières
  d'architecture, décisions techniques (`docs/architecture.md`, `docs/decisions/`).
- **Phase 1 — Ingestion RSS/Atom.** ✅ Fait. Fetch conditionnel (ETag/304),
  retries, parsing RSS 2.0 + Atom, sanitization, déduplication niveaux 1-3,
  persistance, logs de synchronisation par source. Voir `docs/ingestion.md`.
- **Phase 2+ (normalisation avancée, Story Engine, Trend Engine, IA, API, UI)**
  — pas encore implémentées.

## Structure

```
apps/
  web/       React + TypeScript + Vite       (Phase 8+)
  api/       Fastify + TypeScript, REST typée (Phase 7+)
  worker/    Ingestion + pipeline             (Phase 1+)
packages/
  domain/    Types métier, interfaces, règles pures (Story lifecycle, Trend formula)
  db/        Schéma Drizzle (PostgreSQL)
  ingestion/ Contrats RSS/Atom
  pipeline/  Story Engine, Event Engine, Trend Engine (contrats)
  ai/        Client Groq, schémas Zod, Ask (contrats)
  shared/    Erreurs applicatives partagées
docs/        Architecture, modèle de données, ADRs
```

## Démarrer

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL (Neon, cf. ADR-0007) et GROQ_API_KEY

npm test                # 35 tests : lifecycle, trend score, parsing RSS/Atom, dedup, ingestion service
npm run db:generate     # génère les migrations Drizzle depuis packages/db/src/schema.ts
npm run db:migrate      # applique les migrations sur DATABASE_URL

npm run dev:worker      # lance le cycle d'ingestion (nécessite DATABASE_URL + des sources en base)
npm run dev:api         # démarre l'API (GET /health)
```

`apps/api` reste un squelette (healthcheck uniquement, les routes /api/*
arrivent en Phase 7). `apps/worker` exécute réellement l'ingestion RSS/Atom
(Phase 1) — il lui faut une base migrée et au moins une ligne dans `sources`
(pas encore d'endpoint pour en ajouter une : à insérer manuellement le temps
de la Phase 7, ou via `db:studio`).

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — vue d'ensemble, couches, flux de données
- [`docs/domain-model.md`](docs/domain-model.md) — modèle de données complet
- [`docs/ingestion.md`](docs/ingestion.md) — pipeline RSS/Atom, déduplication
- [`docs/story-engine.md`](docs/story-engine.md) — clustering, lifecycle
- [`docs/trend-engine.md`](docs/trend-engine.md) — formule de trend score
- [`docs/ai.md`](docs/ai.md) — synthèse IA, Ask
- [`docs/api.md`](docs/api.md) — contrats REST
- [`docs/design-system.md`](docs/design-system.md) — direction visuelle (Phase 8+)
- [`docs/decisions/`](docs/decisions/) — ADRs
