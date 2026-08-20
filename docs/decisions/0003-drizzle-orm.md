# ADR-0003 — Drizzle ORM plutôt que Prisma

## Statut
Accepté (validé par l'utilisateur le 2026-08-19).

## Contexte
Le brief propose "Drizzle ORM ou Prisma" pour PostgreSQL.

## Décision
Utiliser **Drizzle**.

## Raisons
- Le schéma est du TypeScript exécutable (pas un DSL séparé comme
  `schema.prisma`) — cohérent avec la règle "TypeScript strict partout" (§53)
  et facilite le partage de types entre `packages/db` et `packages/domain`.
- Requêtes proches du SQL, utile pour les besoins spécifiques du Story
  Engine/Trend Engine (agrégations, fenêtres temporelles, futur
  `tsvector`/`pgvector`) sans passer par un DSL qui les masquerait.
- Pas de moteur de requête binaire séparé (contrairement à Prisma) — plus
  simple à déployer.
- `drizzle-kit` génère les migrations SQL versionnées, lisibles et auditable.

## Conséquences
- Les repository implementations (`packages/db`) écrivent des requêtes plus
  verbeuses qu'avec le client Prisma, en échange d'un contrôle plus direct.
- Migration vers pgvector (colonnes `vector`) documentée et supportée
  nativement par l'écosystème Drizzle via des extensions de type.
