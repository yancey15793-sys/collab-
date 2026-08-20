# RSS/Atom Ingestion Engine

**Implémenté (Phase 1).** Contrat : `packages/ingestion/src/index.ts`.
Adaptateur HTTP+parsing : `packages/ingestion` (`NodeRssAtomFetcher`,
`parseFeed`). Orchestration : `packages/pipeline` (`IngestionService`).

## Pipeline

```
fetch → validate → parse → normalize → sanitize → deduplicate → persist
```

- **fetch** (`fetcher.ts`) — HTTP GET conditionnel (`If-None-Match` /
  `If-Modified-Since`, réponse `304` traitée comme `NOT_MODIFIED`), timeout via
  `AbortController` (`INGESTION_TIMEOUT_MS`), retries avec backoff exponentiel
  (3 tentatives, uniquement sur timeout/erreur réseau/5xx/429 — jamais sur 4xx
  définitif). Suit les redirections (comportement natif de `fetch`).
- **validate / parse** (`parse.ts`) — RSS 2.0 et Atom via `rss-parser`
  (auto-détection du format), fonction pure testée avec des fixtures XML. Les
  items sans titre ou sans lien exploitable sont ignorés et comptés
  (`skippedCount`) plutôt que de faire échouer tout le flux.
- **normalize** (`normalize-url.ts`, `hash.ts`) — URL canonique (tracking
  params retirés, host en minuscules, trailing slash), hash de contenu
  (`sha256(sourceId + titre normalisé + date)`).
- **sanitize** (`sanitize.ts`, via `sanitize-html`) — allowlist stricte de
  balises pour le contenu HTML stocké ; version texte brut pour la description
  et le comptage de mots.
- **deduplicate** — niveaux 1-3 implémentés dans `IngestionService` avant tout
  insert (voir ci-dessous).
- **persist** — `ArticleRepository.create`, statut initial `INGESTED`. Une
  violation de contrainte unique concurrente (deux cycles qui se chevauchent)
  est traitée comme un doublon, pas comme une erreur.

## Isolation par source

Chaque source est fetchée indépendamment (concurrence bornée par
`INGESTION_CONCURRENCY`). Un échec (timeout, 404, XML invalide) est catché,
journalisé dans `SourceSyncLog` avec `status: FAILURE` et un message d'erreur,
et **n'interrompt jamais** le cycle des autres sources. Trois échecs consécutifs
marquent la source comme dégradée dans l'UI Sources (§19 du brief), sans la
désactiver automatiquement.

## Déduplication (multi-niveaux)

| Niveau | Méthode                                                         | Où                                                    |
| ------ | --------------------------------------------------------------- | ----------------------------------------------------- |
| 1      | `canonicalUrl` identique                                        | avant insert (`ArticleRepository.findByCanonicalUrl`) |
| 2      | URL normalisée (tracking params retirés, trailing slash, casse) | étape `normalize`                                     |
| 3      | `hash = sha256(sourceId + normalizedTitle + publishedAt)`       | contrainte unique DB (`articles.hash`)                |
| 4      | similarité de titre (inter-sources, même événement)             | étape `enrichment`, avant Story Engine                |
| 5      | similarité sémantique                                           | réservé pour l'intégration future d'embeddings        |

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
