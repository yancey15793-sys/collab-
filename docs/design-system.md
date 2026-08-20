# Design System — Briefeed

> Note de scope (Phase 0) : aucune implémentation UI à ce stade. Ce document
> fixe la direction pour la Phase 8+, afin que l'engine (déjà validé) informe
> le design plutôt que l'inverse.

## Direction esthétique

Apple editorial + luxury magazine + information dashboard + minimalisme.

Éviter : gradients excessifs, glassmorphism gratuit, ombres lourdes, cartes
partout, interfaces SaaS génériques, couleurs criardes, badges inutiles.

Le design doit être calme, éditorial, dense mais respirant, intelligent,
premium. Les informations importantes ont plus de poids visuel — la hiérarchie
typographique et spatiale porte l'importance, pas la décoration.

Inspiration **fonctionnelle**, pas visuelle : Pollar (clustering, stories, live
coverage, Q&R, sources), Feedly (gestion de sources, dossiers), Apple News
(hiérarchie éditoriale, simplicité), Readwise Reader (lecture, sauvegarde,
recherche). Briefeed ne copie aucune interface — il construit sa propre
identité autour de la personnalisation et des sources choisies par
l'utilisateur.

## Composants spécialisés (pas une carte unique)

```
components/
  ui/        Button, Badge, Avatar, Tabs, Modal, Sheet, Skeleton
  story/     StoryCard, StoryHeader, StoryTimeline, StorySources, StoryRelated
  trend/     TrendCard, TrendIndicator
  article/   ArticleCard, ArticleViewer
  source/    SourceCard, SourceList
  navigation/ AppNavigation, Sidebar, MobileNavigation
```

`StoryCard ≠ ArticleCard ≠ TrendCard`. Une `TrendCard` communique importance +
vitesse + nombre de sources + évolution ; une `StoryCard` communique un objet
de compréhension, pas une simple ligne de flux.

## Principe UI

Avant chaque composant : _"quelle information l'utilisateur doit-il comprendre
ici ?"_ — jamais _"quelle carte pouvons-nous afficher ?"_.

## Densité progressive (règle UX critique)

```
Niveau 1 — titre + importance
Niveau 2 — résumé
Niveau 3 — timeline
Niveau 4 — sources
Niveau 5 — articles originaux
Niveau 6 — données détaillées
```

L'utilisateur ne reçoit jamais toute l'information en même temps.

## Navigation

Home · Live · Discover · Sources · Saved · Ask — fonctionnelle sur mobile,
tablette, desktop, avec priorité donnée à l'usage tablette/iPad en paysage
(exploiter l'espace, ne pas simplement étirer les cartes).

## Design tokens (à créer en Phase 8)

spacing, radius, typography, font sizes, line heights, surface, border,
motion, breakpoints — centralisés, aucune valeur arbitraire dispersée dans le
CSS des composants.

## Accessibilité

WCAG 2.2 AA : navigation clavier, focus states visibles, support lecteur
d'écran, `prefers-reduced-motion` respecté, HTML sémantique, contraste élevé.

## Ordre d'implémentation (Phase 8+)

1. App shell
2. Navigation
3. Story component
4. Story detail
5. Timeline
6. Source list
7. Trend component
8. Assemblage de la Home (en dernier, jamais en premier)
