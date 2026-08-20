# ADR-0004 — Pipeline séquentiel (pas de file de messages) pour le MVP

## Statut
Proposé.

## Contexte
Le pipeline cible (§4 du brief) a 13 étapes. Une architecture événementielle
(chaque étape publie un événement, la suivante le consomme via une queue —
BullMQ/Redis, ou équivalent) est la solution la plus scalable à terme, mais
ajoute une dépendance d'infrastructure (Redis) et de la complexité opérationnelle.

## Décision
Pour le MVP, le worker exécute le pipeline de façon **séquentielle et
synchrone** au sein d'un même cycle planifié (ingestion → ... → trend →
synthèse), par lots bornés, sans file de messages.

## Raisons
- Respecte la règle "ne pas sur-engineer" (§49) : la charge attendue au MVP
  (quelques dizaines de sources) ne justifie pas une infrastructure de queue.
- Chaque étape reste un service/interface isolé et testable
  (`StoryEngine`, `TrendEngine`, `EventEngine` dans `packages/pipeline`) : le
  passage à une architecture événementielle plus tard ne change que
  l'orchestrateur, pas la logique métier de chaque étape.

## Conséquences
- Le temps d'un cycle worker augmente linéairement avec le nombre de sources —
  acceptable au MVP, à surveiller (observabilité §36) au-delà.
- Migration future : introduire une queue (BullMQ + Redis, ou un service géré)
  quand le volume de sources/articles le justifie, sans réécrire
  `StoryEngine`/`TrendEngine`/`EventEngine`.
