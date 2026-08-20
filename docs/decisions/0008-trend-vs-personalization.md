# ADR-0008 — TREND global vs. personnalisation par utilisateur

## Statut
Proposé — signalé comme point à challenger dans `docs/domain-model.md`.

## Contexte
Le brief liste `userAffinity` comme colonne de l'entité `TREND` (§7, une table
sans `userId`) mais l'exclut de la formule de trend score donnée en exemple
(§13). Un `trendScore` affiché sur "Forte Tendance" doit être objectif et
partagé par tous les utilisateurs ; un score d'affinité est par nature
individuel. Les deux ne peuvent pas cohabiter sans ambiguïté dans une table
sans clé utilisateur.

## Décision
- `TREND` reste globale (pas de `userId`), calculée uniquement à partir de
  `velocity/novelty/sourceDiversity/articleVolume/confirmation/freshness`
  (formule §13).
- `TREND.userAffinity` est réinterprétée comme un **signal agrégé
  cross-utilisateurs** (ex: moyenne d'affinité des utilisateurs actifs pour
  les entités/topics de la Story) — informatif, pas utilisé dans le calcul du
  `trendScore` public.
- La personnalisation réelle par utilisateur (ordre de la Home, section "Vos
  sujets") combine `trendScore` (global) avec `USER_PREFERENCE` **à la
  lecture**, dans l'Application Service qui sert la Home — jamais stockée de
  façon persistante par paire (user, story) au MVP.

## Alternative rejetée (pour le MVP)
Table `USER_STORY_AFFINITY (userId, storyId, score)` — cardinalité
utilisateurs × stories potentiellement grande, calcul continu coûteux pour un
bénéfice non démontré au stade MVP. Réévaluer si la personnalisation devient
insuffisante en calcul à la volée.

## Conséquences
- Nécessite validation produit explicite (c'est un écart d'interprétation par
  rapport à une lecture littérale du brief) avant implémentation Phase 5/14.
