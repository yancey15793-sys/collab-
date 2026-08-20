# Story Engine

Cœur du produit : décide si un article rejoint une Story existante ou en crée
une nouvelle. **Contrat défini ici, implémentation en Phase 3** (après
validation de l'architecture).

## Algorithme proposé (MVP, sans embeddings)

```
newArticle
  ↓ extract entities (déjà fait en étape Enrichment)
  ↓ find candidate stories
        via StoryRepository.findCandidates({ entityIds, sinceHours: STORY_CANDIDATE_WINDOW_HOURS })
        → réduit l'espace de recherche aux Stories récentes partageant ≥1 entité
  ↓ score each candidate (StoryMatchingStrategy)
        similarity = wEntity * entityOverlap(Jaccard)
                   + wTitle  * titleSimilarity(trigram/token overlap)
                   + wTime   * timeProximity(decay depuis lastUpdatedAt)
  ↓ best = max(candidates, by similarity)
  if best.similarity >= STORY_MATCH_THRESHOLD (env, défaut 0.62)
      attach article to best story (StoryRepository.attachArticle)
      updateCounters (sourceCount, articleCount, lastUpdatedAt)
      nextStoryStatus(...) — voir packages/domain/src/story-lifecycle.ts
  else
      create new Story (status DISCOVERED)
```

Le seuil et les poids (`wEntity`, `wTitle`, `wTime`) sont configurables via
variables d'environnement — jamais codés en dur dans le service, encore moins
dans un composant UI (règle §10 du brief).

`StoryMatchingStrategy` est une interface (`packages/pipeline`) : l'implémentation
MVP est heuristique (lexicale + entités + temps). Une implémentation future
basée sur des embeddings (pgvector, similarité cosinus) peut remplacer la
stratégie MVP sans changer l'orchestrateur `StoryEngine`.

## Story Lifecycle

Implémenté et testé dès la Phase 0 comme fonction pure
(`packages/domain/src/story-lifecycle.ts`), car entièrement spécifié par le
brief (§11) et sans dépendance externe :

```
DISCOVERED → ACTIVE → DEVELOPING → STABLE → DORMANT → ARCHIVED
                                      ↑          │
                                      └── ACTIVE ←┘ (reprise d'activité)
```

Le calcul est réévalué par le worker à chaque cycle pour les Stories non
archivées, à partir de signaux objectifs (nombre de sources, ratio de vélocité
d'articles, heures depuis la dernière mise à jour) — jamais assigné
manuellement par l'UI ou l'API.

## Event Engine (Phase 4)

Détecte les développements discrets à l'intérieur d'une Story (timeline). MVP :
un nouvel `Event` est créé quand un article rattaché à la Story introduit soit
une nouvelle entité majeure absente du contexte précédent, soit un écart
temporel significatif (> N heures) depuis le dernier événement connu — évite de
créer un Event par article (bruit) tout en capturant les vrais tournants
("réaction de Microsoft", "premiers benchmarks"...).

## Risques

- Faux positifs (fusion de sujets distincts) vs faux négatifs (doublons de
  Story) — nécessite des seuils réglables et une suite de tests avec des cas
  réels avant d'ouvrir l'UI.
- Sans embeddings, le matching lexical peine sur les reformulations fortes
  (même événement, titres très différents) ou le multilingue — accepté comme
  limite MVP, mitigé par le poids `entityOverlap` (moins sensible à la
  formulation) et documenté comme axe d'amélioration (pgvector).
