import { describe, expect, it } from 'vitest';
import { DEFAULT_TREND_WEIGHTS, calculateTrendScore } from '../trend-score.js';

describe('calculateTrendScore', () => {
  it('returns 0 when all metrics are 0', () => {
    const result = calculateTrendScore({
      velocity: 0,
      novelty: 0,
      sourceDiversity: 0,
      articleVolume: 0,
      confirmation: 0,
      freshness: 0,
    });
    expect(result.score).toBe(0);
  });

  it('returns 1 when all metrics are 1 and default weights sum to 1', () => {
    const weightSum = Object.values(DEFAULT_TREND_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(weightSum).toBeCloseTo(1, 5);

    const result = calculateTrendScore({
      velocity: 1,
      novelty: 1,
      sourceDiversity: 1,
      articleVolume: 1,
      confirmation: 1,
      freshness: 1,
    });
    expect(result.score).toBeCloseTo(1, 5);
  });

  it('exposes per-factor contributions for explainability', () => {
    const result = calculateTrendScore({
      velocity: 1,
      novelty: 0,
      sourceDiversity: 0,
      articleVolume: 0,
      confirmation: 0,
      freshness: 0,
    });
    expect(result.contributions.velocity).toBeCloseTo(0.25, 5);
    expect(result.score).toBeCloseTo(0.25, 5);
  });

  it('rejects out-of-range metrics', () => {
    expect(() =>
      calculateTrendScore({
        velocity: 1.5,
        novelty: 0,
        sourceDiversity: 0,
        articleVolume: 0,
        confirmation: 0,
        freshness: 0,
      }),
    ).toThrow();
  });

  it('respects custom weights', () => {
    const result = calculateTrendScore(
      { velocity: 1, novelty: 1, sourceDiversity: 0, articleVolume: 0, confirmation: 0, freshness: 0 },
      { velocity: 0.5, novelty: 0.5, sourceDiversity: 0, articleVolume: 0, confirmation: 0, freshness: 0 },
    );
    expect(result.score).toBeCloseTo(1, 5);
  });
});
