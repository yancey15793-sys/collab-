# RSS/Atom Ingestion Engine

Contrat défini en Phase 0 (`packages/ingestion/src/index.ts`), implémentation
en Phase 1.

## Pipeline

```
fetch → validate → parse → normalize → sanitize → deduplicate → persist
```

- **fetch** — HTTP GET conditionnel (ETag / Last-Modified), timeout configurable
  (`INGESTION_TIMEOUT_MS`), retries avec backoff exponentiel (max 3 tentatives).
- **validate** — content-type, taille, XML bien formé.
- **parse** — RSS 2.0 et Atom via une librairie de parsing dédiée
  (`rss-parser` pressenti — décision à confirmer en Phase 1), gestion des
  champs manquants et des encodages non-UTF8.
- **normalize** — vers `RawFeedItem` (packages/ingestion), URLs absolutisées,
  dates parsées en UTC, HTML nettoyé (sanitize) avant stockage.
- **deduplicate** — voir "Déduplication" ci-dessous, avant persistance.
- **persist** — `ArticleRepository.create`, statut initial `INGESTED`.

## Isolation par source

Chaque source est fetchée indépendamment (concurrence bornée par
`INGESTION_CONCURRENCY`). Un échec (timeout, 404, XML invalide) est catché,
journalisé dans `SourceSyncLog` avec `status: FAILURE` et un message d'erreur,
et **n'interrompt jamais** le cycle des autres sources. Trois échecs consécutifs
marquent la source comme dégradée dans l'UI Sources (§19 du brief), sans la
désactiver automatiquement.

## Déduplication (multi-niveaux)

| Niveau | Méthode | Où |
|---|---|---|
| 1 | `canonicalUrl` identique | avant insert (`ArticleRepository.findByCanonicalUrl`) |
| 2 | URL normalisée (tracking params retirés, trailing slash, casse) | étape `normalize` |
| 3 | `hash = sha256(sourceId + normalizedTitle + publishedAt)` | contrainte unique DB (`articles.hash`) |
| 4 | similarité de titre (inter-sources, même événement) | étape `enrichment`, avant Story Engine |
| 5 | similarité sémantique | réservé pour l'intégration future d'embeddings |

Les niveaux 1-3 empêchent les doublons **exacts** (même article réingéré, flux
dupliqué) ; le niveau 4 alimente en réalité le **Story Engine** (regrouper des
articles différents sur le même sujet n'est pas de la déduplication mais du
clustering — voir `docs/story-engine.md`).

## Extraction d'entités (Enrichment)

MVP : extraction hybride — appel Groq structuré (extraction d'entités nommées
en JSON, validé par Zod) avec repli sur une heuristique légère (gazetteer +
détection de séquences capitalisées) si l'appel IA échoue ou timeout. Un échec
d'extraction ne bloque jamais la persistance de l'article (statut `ENRICHED`
non atteint, mais `NORMALIZED` reste lisible) — règle §35 du brief.
