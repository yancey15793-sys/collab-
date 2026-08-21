# Enrichissement — Extraction d'entités

**Implémenté (Phase 2).** Contrat : `packages/enrichment/src/index.ts`
(`EntityExtractor`). Deux implémentations interchangeables du même contrat :
`GroqEntityExtractor` et `HeuristicEntityExtractor`. Orchestration :
`packages/pipeline` (`EnrichmentService`). Décision : ADR-0006.

## Pipeline

```
articles INGESTED
  ↓ extraction (primaire, ex: Groq — JSON forcé, validé par Zod)
  ↓ échec/timeout/hors-schéma → repli automatique (heuristique)
  ↓ findOrCreate par entité ((normalizedName, type) unique en base)
  ↓ ArticleEntity (lien + confidence)
  ↓ statut article → ENRICHED (ou FAILED si les deux extracteurs échouent)
```

## Sélection de l'extracteur primaire

`apps/worker` choisit au démarrage :

- **`GROQ_API_KEY` présente** → `GroqEntityExtractor` en primaire,
  `HeuristicEntityExtractor` en repli.
- **`GROQ_API_KEY` absente** → `HeuristicEntityExtractor` sert de primaire
  **et** de repli directement (évite un appel réseau voué à l'échec à chaque
  article). C'est le mode actuel — aucune clé Groq n'a encore été fournie.

Dans les deux cas, un échec de l'extracteur primaire **par article** (pas au
niveau du process) déclenche le repli — un article qui fait échouer Groq
n'empêche pas les suivants d'être traités normalement.

## GroqEntityExtractor

Appel direct à l'API Groq (`chat/completions`, `response_format: json_object`,
`temperature: 0`), sans SDK — un simple `fetch` avec timeout
(`AbortController`, même valeur que `INGESTION_TIMEOUT_MS`). Texte envoyé =
titre + description + contenu, tronqué à 6000 caractères (coût/latence
bornés). Toute réponse hors-schéma (validée par `extractedEntitiesSchema`,
Zod) est **rejetée**, jamais acceptée partiellement — cohérent avec la règle
"l'IA n'est pas la source de vérité" appliquée aux affirmations, pas aux
outils (ADR-0006).

## HeuristicEntityExtractor

Aucune I/O, 100% local :

1. **Gazetteer** restreint (grandes entreprises tech, quelques
   organisations/lieux fréquents en actu) → confiance 0.75.
2. **Séquences capitalisées** de 2 à 4 mots hors gazetteer → typées
   `ORGANIZATION` par défaut (meilleure estimation sans NER réelle, pas de
   signal fort pour deviner PERSON vs COMPANY vs autre) → confiance 0.35.
3. Mots capitalisés isolés hors gazetteer ignorés (trop ambigus : début de
   phrase, mot générique...).

Précision très inférieure à un LLM — c'est un filet de sécurité (ADR-0006),
pas une stratégie d'extraction visée à terme.

## Déduplication des entités

`entities` a une contrainte unique sur `(normalizedName, type)`
(`packages/db/src/schema.ts`). `EntityRepository.findOrCreate` s'appuie
dessus : deux articles mentionnant "Google" convergent vers la même ligne
`Entity`, seul le lien `ArticleEntity` (avec sa propre `confidence`) diffère
par article.

## Statuts d'article traversés

`INGESTED` (Phase 1) → `ENRICHED` (succès, même si 0 entité trouvée — ce
n'est pas un échec) → `CLUSTERED` (Story Engine, à venir). `FAILED`
uniquement si **les deux** extracteurs échouent pour un même article — ne
bloque jamais le traitement des autres articles ou sources (règle §35 du
brief).

## Ce qui reste à faire

- Exercer `GroqEntityExtractor` contre une vraie clé (jamais testé en
  conditions réelles, seulement via des fakes en test).
- Déduplication niveaux 4-5 (titre/similarité sémantique — voir
  `docs/ingestion.md`), toujours reportée.
- Classification de topic (`Topic`/`StoryTopic`) — pas encore abordée.
