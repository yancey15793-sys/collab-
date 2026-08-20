# API — Contrats REST

Implémentation Phase 7. `apps/api` (Fastify) ne fait qu'exposer des
Application Services (`packages/pipeline`) — voir `docs/architecture.md` §2.

## Endpoints (MVP)

```
GET  /health

GET  /api/stories                 — liste paginée, triable (trend | recent | importance)
GET  /api/stories/:id             — voir "Story API Response" ci-dessous
GET  /api/stories/:id/articles
GET  /api/stories/:id/events
GET  /api/stories/:id/sources

GET  /api/trends                  — "Forte Tendance" : top Stories par trendScore

GET  /api/articles
GET  /api/articles/:id

GET    /api/sources
POST   /api/sources
DELETE /api/sources/:id
POST   /api/sources/:id/sync

POST /api/ask
```

Toutes les listes sont paginées (`limit`/`cursor`), jamais de retour non borné
(règle §32 — ne jamais charger 500 articles d'un coup).

## Story API Response

```ts
{
  id: string;
  title: string;
  summary: string | null;
  importance: number;
  trend: {
    score: number;
    contributions: Record<string, number>;
  }
  updatedAt: string;

  metrics: {
    articleCount: number;
    sourceCount: number;
    eventCount: number;
  }

  timeline: Array<{ id: string; title: string; timestamp: string; importance: number }>;
  sources: Array<{ id: string; name: string; favicon: string | null; articleCount: number }>;
  articles: Array<{
    id: string;
    title: string;
    sourceName: string;
    publishedAt: string;
    url: string;
  }>;
  entities: Array<{ id: string; name: string; type: string }>;
  relatedStories: Array<{ id: string; title: string; slug: string }>;
}
```

## Validation

Tous les payloads entrants (POST /api/sources, POST /api/ask) sont validés par
des schémas Zod partagés (`packages/shared` ou colocalisés dans `apps/api`
selon la taille), avec retour `400 ValidationError` explicite en cas d'échec —
jamais de `500` opaque pour une entrée utilisateur invalide.
