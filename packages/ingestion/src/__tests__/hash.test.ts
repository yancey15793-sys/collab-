import { describe, expect, it } from 'vitest';
import { computeArticleHash, normalizeTitle } from '../hash.js';

describe('normalizeTitle', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeTitle('  Apple  Accélère   Son Offensive IA  ')).toBe(
      'apple accélère son offensive ia',
    );
  });
});

describe('computeArticleHash', () => {
  const publishedAt = new Date('2026-08-18T10:02:00Z');

  it('is deterministic for identical inputs', () => {
    const a = computeArticleHash({ sourceId: 's1', normalizedTitle: 'apple ai', publishedAt });
    const b = computeArticleHash({ sourceId: 's1', normalizedTitle: 'apple ai', publishedAt });
    expect(a).toBe(b);
  });

  it('differs when the source changes', () => {
    const a = computeArticleHash({ sourceId: 's1', normalizedTitle: 'apple ai', publishedAt });
    const b = computeArticleHash({ sourceId: 's2', normalizedTitle: 'apple ai', publishedAt });
    expect(a).not.toBe(b);
  });

  it('differs when the title changes', () => {
    const a = computeArticleHash({ sourceId: 's1', normalizedTitle: 'apple ai', publishedAt });
    const b = computeArticleHash({ sourceId: 's1', normalizedTitle: 'apple ai v2', publishedAt });
    expect(a).not.toBe(b);
  });
});
