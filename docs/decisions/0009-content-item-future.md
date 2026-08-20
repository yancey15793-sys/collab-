# ADR-0009 — CONTENT_ITEM (VIDEO/PODCAST) différé, non implémenté au MVP

## Statut
Accepté (report explicite).

## Contexte
Le brief anticipe (§57) un modèle généralisé `CONTENT_ITEM` avec
`type: ARTICLE | VIDEO | PODCAST`, tout en demandant explicitement de ne pas
complexifier le MVP (§56, §57 : "ne pas implémenter ces fonctions au MVP").

## Décision
Le MVP modélise uniquement `ARTICLE` (seule l'ingestion RSS/Atom est en
scope). Aucune table `CONTENT_ITEM` n'est créée maintenant.

## Raisons
- Une seule source de contenu (RSS/Atom → texte) au MVP ; généraliser
  prématurément ajouterait une indirection sans bénéfice immédiat (règle §49).
- Le nom de table (`articles`) et son usage (Story Engine, Trend Engine,
  UI) sont suffisamment isolés (via `ArticleRepository`, une interface) pour
  qu'une migration future de renommage/généralisation (`articles` →
  `content_items` + colonne `type`) reste mécanique et localisée, sans
  réécrire le Story Engine ou le Trend Engine.

## Conséquences
- Quand VIDEO/PODCAST entrent en scope : migration Drizzle renommant/étendant
  `articles`, mise à jour de `ArticleRepository` → `ContentItemRepository`,
  sans changement du modèle `Story`/`Event`/`Trend` qui référencent déjà des
  IDs opaques.
