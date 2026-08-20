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

**Phase 0 — Architecture.** Le moteur (ingestion, Story Engine, Trend Engine,
IA) n'est pas encore implémenté. Cette phase pose le modèle de données, les
frontières d'architecture, et les décisions techniques, avant tout
développement conséquent. Voir `docs/architecture.md` et `docs/decisions/`.

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
cp .env.example .env   # renseigner DATABASE_URL et GROQ_API_KEY

npm test                # tests unitaires (packages/domain — lifecycle, trend score)
npm run db:generate     # génère les migrations Drizzle depuis packages/db/src/schema.ts
```

`apps/api` et `apps/worker` ne sont que des squelettes à ce stade (healthcheck
uniquement) — l'implémentation du pipeline arrive après validation de
l'architecture. Voir `docs/decisions/0007-postgres-dev-environment.md` pour la
question ouverte sur l'environnement PostgreSQL de développement.

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
