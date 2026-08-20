# Trend Engine

Calcule un score de tendance **explicable** par Story — jamais un simple
compte d'articles. Formule et poids implémentés dès la Phase 0 comme fonction
pure et testée : `packages/domain/src/trend-score.ts`.

```
trendScore = velocity        * 0.25
           + novelty         * 0.20
           + sourceDiversity * 0.20
           + articleVolume   * 0.15
           + confirmation    * 0.10
           + freshness       * 0.10
```

Poids par défaut dans `DEFAULT_TREND_WEIGHTS`, surchargeables via les variables
`TREND_WEIGHT_*` (voir `.env.example`). La fonction retourne aussi le détail
des contributions par facteur (`TrendBreakdown.contributions`) pour que l'UI
puisse répondre à "Pourquoi cette Story est-elle tendance ?" sans recalcul.

## Calcul des métriques normalisées (0..1) — Phase 5

| Métrique          | Calcul proposé (MVP)                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `velocity`        | ratio articles(3h) / articles(3h précédentes), borné et normalisé (sigmoïde ou clamp)                                       |
| `novelty`         | inverse de la récurrence du sujet : décroît si des Stories très similaires ont été créées récemment sur les mêmes entités   |
| `sourceDiversity` | sources distinctes de la Story / sources actives connues dans sa catégorie                                                  |
| `articleVolume`   | `log(articleCount + 1)` normalisé (évite qu'une rafale d'un seul agrégateur domine)                                         |
| `confirmation`    | proportion de sources indépendantes (hors doublons du même groupe éditorial) corroborant, avec un plancher (ex: ≥3 sources) |
| `freshness`       | décroissance exponentielle depuis `lastUpdatedAt` (`e^-λt`)                                                                 |

`userAffinity` (colonne `TREND`) est un signal agrégé, pas un score par
utilisateur — voir `docs/domain-model.md` §Point à challenger. Il n'entre pas
dans la formule ci-dessus (fidèle à l'exemple du brief §13) ; la
personnalisation combine `trendScore` avec `USER_PREFERENCE` séparément, au
niveau de l'Application Service qui sert la Home.

## "Forte Tendance"

Surface éditoriale (pas un flux d'articles) = les N Stories au `trendScore` le
plus élevé, avec un label qualitatif dérivé du score (ex: "Très forte tendance"
au-delà d'un seuil configurable) et le delta depuis le dernier calcul
(comparaison avec le `TREND` précédent de la même Story, table append-only).

## Risques

- `novelty` et `confirmation` sont les métriques les plus dépendantes de
  données historiques suffisantes — dégradées en phase de démarrage (peu de
  Stories archivées pour comparer). Mitigation : valeur par défaut neutre
  (0.5) tant que l'historique est insuffisant, documentée explicitement dans
  le code (pas une approximation silencieuse).
