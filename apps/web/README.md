# Briefeed — Web (placeholder)

Volontairement vide à ce stade.

Le brief est explicite : _"Ne commence pas par construire des cartes HTML.
Ne commence pas par dessiner une homepage."_ Le scaffold Vite + React + TypeScript
sera créé en **Phase 8**, une fois l'API (Phase 7) disponible — en suivant l'ordre
d'implémentation défini dans `docs/design-system.md` §Design Implementation :

**Exigence produit (confirmée le 2026-08-20) : le site sera une PWA**
(installable, manifest + service worker) — `vite-plugin-pwa` sera ajouté dès
le scaffold initial de la Phase 8, pas rajouté après coup. Compatible sans
réserve avec l'hébergement Vercel décidé en `docs/decisions/0010-hosting-deployment.md`.

**Comportement offline (confirmé) : cache des dernières données consultées.**
Le service worker met en cache (stratégie stale-while-revalidate ou
network-first selon la ressource) les stories/articles déjà chargés par
l'utilisateur — consultables hors-ligne, sans nouveau contenu tant que la
connexion n'est pas rétablie. Implication pour l'API (Phase 7) : prévoir des
réponses cache-friendly (ETags/headers de cache cohérents) pour que le
service worker puisse s'appuyer dessus plutôt que réinventer un cache
applicatif séparé.

1. App shell
2. Navigation
3. Story component
4. Story detail
5. Timeline
6. Source list
7. Trend component
8. Assemblage de la Home

Voir `docs/architecture.md` pour la vue d'ensemble et `docs/decisions/` pour les
choix déjà actés (stack, structure).
