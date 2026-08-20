# ADR-0002 — Fastify pour l'API

## Statut
Accepté (validé par l'utilisateur le 2026-08-19).

## Contexte
Le brief demande "une API REST proprement typée" en Node.js/TypeScript, sans
imposer de framework.

## Décision
Utiliser **Fastify** plutôt qu'Express ou une solution encore plus légère.

## Raisons
- Validation de schéma native (compatible Zod via un type provider), cohérent
  avec l'exigence de "REST proprement typée" et la validation systématique des
  entrées (règle §53).
- Logger structuré (pino) intégré — répond directement au besoin
  d'observabilité (§36) sans dépendance additionnelle.
- Performances solides et écosystème mature (CORS, plugins).
- Architecture par plugins qui encourage naturellement la séparation
  route/service (aligné avec la règle architecturale §6).

## Conséquences
- Les routes n'appellent que des Application Services (`packages/pipeline`) —
  aucune logique métier dans `apps/api/src`.
- Alternative rejetée : Express (plus simple mais validation/typage moins
  intégrés nativement) ; NestJS (trop de structure imposée pour ce stade).
