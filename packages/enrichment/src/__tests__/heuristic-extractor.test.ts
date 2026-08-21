import { describe, expect, it } from 'vitest';
import { HeuristicEntityExtractor } from '../heuristic-extractor.js';

describe('HeuristicEntityExtractor', () => {
  const extractor = new HeuristicEntityExtractor();

  it('recognizes gazetteer companies with high confidence', async () => {
    const result = await extractor.extract({
      title: 'Google announces new AI model',
      description: null,
      content: null,
    });
    const google = result.find((e) => e.normalizedName === 'google');
    expect(google).toBeDefined();
    expect(google?.type).toBe('COMPANY');
    expect(google?.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('picks up multi-word capitalized sequences as low-confidence organizations', async () => {
    const result = await extractor.extract({
      title: 'European Space Agency confirms new mission',
      description: null,
      content: null,
    });
    const entity = result.find((e) => e.normalizedName === 'european space agency');
    expect(entity).toBeDefined();
    expect(entity?.type).toBe('ORGANIZATION');
    expect(entity?.confidence).toBeLessThan(0.5);
  });

  it('ignores single common capitalized stopwords', async () => {
    const result = await extractor.extract({
      title: 'The market fell sharply this morning',
      description: null,
      content: null,
    });
    expect(result.find((e) => e.normalizedName === 'the')).toBeUndefined();
  });

  it('deduplicates repeated mentions of the same entity', async () => {
    const result = await extractor.extract({
      title: 'Microsoft unveils Microsoft Copilot update',
      description: 'Microsoft says the update improves productivity.',
      content: null,
    });
    const mentions = result.filter((e) => e.normalizedName === 'microsoft');
    expect(mentions).toHaveLength(1);
  });

  it('combines title, description and content', async () => {
    const result = await extractor.extract({
      title: 'A quiet week in tech',
      description: 'Apple is expected to announce updates.',
      content: 'Analysts at Nvidia disagree with the outlook.',
    });
    expect(result.some((e) => e.normalizedName === 'apple')).toBe(true);
    expect(result.some((e) => e.normalizedName === 'nvidia')).toBe(true);
  });

  it('returns an empty array for text with no capitalized sequences', async () => {
    const result = await extractor.extract({
      title: 'markets stay flat overall',
      description: null,
      content: null,
    });
    expect(result).toEqual([]);
  });
});
