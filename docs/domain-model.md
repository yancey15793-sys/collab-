# Domain Model — Briefeed

Vue conceptuelle du modèle. Le schéma physique est `packages/db/src/schema.ts` ;
les types TypeScript sont `packages/domain/src/types.ts`.

## Vue d'ensemble

```
SOURCE ──< ARTICLE >── ENTITY ──< STORY_ENTITY >── STORY ──< EVENT
                          │                          │  │
                          │                          │  └──< TREND (append-only)
                          │                          │
                     ARTICLE_ENTITY            STORY_ARTICLE >── ARTICLE
                                                      │
                                                STORY_TOPIC >── TOPIC
                                                      │
USER ──< USER_SOURCE                          AI_SUMMARY
     ──< USER_FOLDER ──< USER_FOLDER_SOURCE
     ──< USER_SAVED_ARTICLE
     ──< USER_SAVED_STORY
     ──< USER_PREFERENCE >── TOPIC
```

## Entités (fidèles au brief, avec extensions justifiées)

Toutes les entités du brief (§7) sont implémentées telles quelles. Extensions
ajoutées et pourquoi :

| Ajout                     | Raison                                                                                                                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TOPIC` (+ `STORY_TOPIC`) | Le brief distingue "Vos sujets" / Discover (catégories curées : Technologie > AI, Cybersecurity...) des `ENTITY` extraites automatiquement (personnes, entreprises...). Sans `TOPIC`, `USER_PREFERENCE.topic` resterait une string libre non normalisée — invérifiable et non explorable dans Discover. |
| `SOURCE_SYNC_LOG`         | Le brief demande d'afficher "dernière synchronisation" et "état du feed" par source (§19), et des logs structurés d'ingestion (§36). Une table dédiée rend cet état interrogeable par l'UI, pas seulement journalisé.                                                                                   |

## Table par table (résumé)

- **SOURCE** — un flux RSS/Atom suivi par le système (indépendant des utilisateurs : catalogue global).
- **ARTICLE** — unité publiée, dédupliquée par `hash` (niveau 3) et `url`/`canonicalUrl` (niveaux 1-2).
- **ENTITY** — personne, entreprise, organisation, lieu, produit, sport, événement — extraite des articles.
- **ARTICLE_ENTITY** — lien article↔entité avec score de confiance (0..1).
- **TOPIC** — taxonomie curée, hiérarchique (`parentTopicId`), pour Discover et la personnalisation.
- **STORY** — objet de compréhension central. `importanceScore` (poids éditorial) est
  volontairement distinct de `trendScore` (vitesse) : une Story peut être importante
  sans accélérer, ou tendance sans être éditorialement prioritaire.
- **STORY_ARTICLE** — rattachement article→Story avec `relevanceScore` (résultat du Story Engine).
- **STORY_ENTITY**, **STORY_TOPIC** — agrégation des entités/topics au niveau Story (dénormalisation utile pour le matching et Discover).
- **EVENT** — un développement daté à l'intérieur d'une Story (timeline).
- **TREND** — snapshot **append-only** du Trend Engine. On garde l'historique
  pour calculer des deltas ("+42% depuis 3h") sans recalcul rétroactif.
- **USER**, **USER_SOURCE**, **USER_FOLDER(\_SOURCE)**, **USER_SAVED\_(ARTICLE\|STORY)**, **USER_PREFERENCE** — personnalisation, fidèles au brief.
- **AI_SUMMARY** — synthèse structurée et versionnée (`model` + `promptVersion`), clé de cache unique `(storyId, type, promptVersion)`.

## Point à challenger : `TREND.userAffinity`

Le brief liste `userAffinity` comme colonne de `TREND` (§7) mais l'exclut de la
formule de trend score donnée en exemple (§13). Ambiguïté réelle : un
`trendScore` **global** (objectif, partagé par tous les utilisateurs, utilisé
pour "Forte Tendance") ne peut pas dépendre d'un score par utilisateur.

Décision prise pour le MVP (à valider) : `TREND.userAffinity` est un **signal
agrégé cross-utilisateurs** (ex: moyenne d'affinité des utilisateurs actifs
suivant les sources/entités de la Story), pas un score personnalisé stocké par
paire (user, story). Le classement réellement personnalisé de la Home
("Vos sujets") combine `trendScore` (global) et `USER_PREFERENCE` **à la
lecture**, dans l'Application Service, sans le persister dans `TREND`.

Alternative possible si le produit veut un vrai score par utilisateur : ajouter
une table `USER_STORY_AFFINITY (userId, storyId, score, calculatedAt)`,
calculée à la demande ou en cache court (TTL). Voir
`docs/decisions/0008-trend-vs-personalization.md`.

## Content types (roadmap, non implémenté au MVP)

Le brief anticipe `VIDEO`/`PODCAST` en plus de `ARTICLE` (§57). Le MVP ne
modélise que `ARTICLE` (seule l'ingestion RSS est en scope). La migration vers
un `CONTENT_ITEM` générique (avec `type: ARTICLE | VIDEO | PODCAST`) est un
renommage/généralisation de table documenté mais non exécuté — voir
`docs/decisions/0009-content-item-future.md`.
