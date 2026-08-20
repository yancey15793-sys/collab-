# ADR-0005 — Matching heuristique (sans embeddings) pour le Story Engine au MVP

## Statut

Proposé.

## Contexte

Le "Semantic Matching" du pipeline cible (§4) suggère une comparaison
sémantique fine, typiquement via des embeddings vectoriels. pgvector est cité
comme extension future possible pour la recherche (§26) et implicitement pour
le clustering.

## Décision

MVP : matching heuristique — chevauchement d'entités (Jaccard), similarité de
titre (tokens/trigrams), proximité temporelle — combiné en un score pondéré
configurable. Pas d'appel à un modèle d'embeddings au MVP.

## Raisons

- Évite une dépendance supplémentaire (modèle d'embeddings, stockage vectoriel,
  coût d'inférence par article) avant d'avoir validé que le reste du pipeline
  fonctionne correctement.
- Le schéma de données n'exclut pas les embeddings : `StoryMatchingStrategy`
  (packages/pipeline) est une interface — une implémentation
  `EmbeddingMatchingStrategy` future peut remplacer la stratégie heuristique
  sans changer `StoryEngine` ni le modèle de données.

## Conséquences

- Qualité de clustering plus faible sur les reformulations fortes ou le
  multilingue (voir `docs/story-engine.md` §Risques).
- Quand le besoin est démontré (volume, langues, qualité perçue), ajouter une
  colonne `embedding vector` sur `articles`/`stories` (pgvector) et une
  nouvelle stratégie, sans migration de rupture.
