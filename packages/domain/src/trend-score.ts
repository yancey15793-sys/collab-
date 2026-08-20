/**
 * Trend Engine — calcul du score de tendance d'une Story.
 * Fonction pure : les coefficients sont injectés (depuis l'environnement, cf. .env.example),
 * jamais codés en dur ici ni dans un composant UI.
 *
 * trendScore = velocity * wV + novelty * wN + sourceDiversity * wS
 *            + articleVolume * wA + confirmation * wC + freshness * wF
 *
 * Toutes les entrées sont normalisées 0..1 par l'appelant (Trend Engine, Phase 5) ;
 * cette fonction ne fait que combiner et documenter la formule pour rester "explicable"
 * (règle produit §13 : l'utilisateur doit pouvoir comprendre pourquoi une Story est tendance).
 */

export interface TrendMetrics {
  velocity: number; // 0..1 — accélération du volume d'articles
  novelty: number; // 0..1 — inverse de la redite (sujet déjà beaucoup couvert récemment)
  sourceDiversity: number; // 0..1 — diversité des sources / sources connues dans la catégorie
  articleVolume: number; // 0..1 — volume normalisé (log-scale en amont pour éviter l'effet rafale)
  confirmation: number; // 0..1 — corroboration inter-sources indépendantes
  freshness: number; // 0..1 — décroissance exponentielle depuis lastUpdatedAt
}

export interface TrendWeights {
  velocity: number;
  novelty: number;
  sourceDiversity: number;
  articleVolume: number;
  confirmation: number;
  freshness: number;
}

export const DEFAULT_TREND_WEIGHTS: TrendWeights = {
  velocity: 0.25,
  novelty: 0.2,
  sourceDiversity: 0.2,
  articleVolume: 0.15,
  confirmation: 0.1,
  freshness: 0.1,
};

export interface TrendBreakdown {
  score: number;
  contributions: Record<keyof TrendMetrics, number>;
}

/**
 * Calcule le score ET le détail des contributions par facteur, pour que l'UI puisse
 * expliquer "pourquoi cette Story est tendance" (règle produit, section 13).
 */
export function calculateTrendScore(
  metrics: TrendMetrics,
  weights: TrendWeights = DEFAULT_TREND_WEIGHTS,
): TrendBreakdown {
  for (const [key, value] of Object.entries(metrics)) {
    if (value < 0 || value > 1) {
      throw new Error(`TrendMetrics.${key} must be normalized between 0 and 1, got ${value}`);
    }
  }

  const contributions: Record<keyof TrendMetrics, number> = {
    velocity: metrics.velocity * weights.velocity,
    novelty: metrics.novelty * weights.novelty,
    sourceDiversity: metrics.sourceDiversity * weights.sourceDiversity,
    articleVolume: metrics.articleVolume * weights.articleVolume,
    confirmation: metrics.confirmation * weights.confirmation,
    freshness: metrics.freshness * weights.freshness,
  };

  const score = Object.values(contributions).reduce((sum, v) => sum + v, 0);

  return { score, contributions };
}
