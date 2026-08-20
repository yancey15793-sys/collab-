# ADR-0001 — npm workspaces plutôt que pnpm

## Statut
Proposé.

## Contexte
Le brief mentionne pnpm comme option ("Zustand ou équivalent", workflow §38
demande de "vérifier Node/npm/pnpm"). L'environnement de développement inspecté
dispose de Node v26.7.0 et npm 11.19.0, mais pas de pnpm installé.

## Décision
Utiliser les **workspaces npm natifs** pour le monorepo plutôt que pnpm ou
Turborepo.

## Raisons
- Zéro dépendance supplémentaire à installer sur la machine de dev.
- npm 11 gère correctement les workspaces (hoisting, `--workspace`, filtres).
- Le monorepo reste petit (7-8 packages) : pas besoin des optimisations de
  cache/build de pnpm ou Turborepo à ce stade.

## Conséquences
- Réversible : migrer vers pnpm plus tard ne change que le lockfile et les
  commandes CLI, pas la structure des packages.
- Si le monorepo grossit significativement (temps de build, CI), réévaluer
  avec Turborepo ou Nx.
