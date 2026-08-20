import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../normalize-url.js';

describe('normalizeUrl', () => {
  it('strips known tracking params', () => {
    expect(normalizeUrl('https://example.com/a?utm_source=twitter&id=42')).toBe(
      'https://example.com/a?id=42',
    );
  });

  it('removes trailing slash (except root)', () => {
    expect(normalizeUrl('https://example.com/a/')).toBe('https://example.com/a');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('lowercases the hostname', () => {
    expect(normalizeUrl('https://Example.COM/a')).toBe('https://example.com/a');
  });

  it('drops the fragment', () => {
    expect(normalizeUrl('https://example.com/a#section')).toBe('https://example.com/a');
  });

  it('makes two equivalent URLs converge to the same normalized form', () => {
    const a = normalizeUrl('https://example.com/a/?utm_campaign=x&id=1');
    const b = normalizeUrl('https://EXAMPLE.com/a?id=1&utm_source=y');
    expect(a).toBe(b);
  });

  it('returns malformed input unchanged rather than throwing', () => {
    expect(normalizeUrl('not a url')).toBe('not a url');
  });
});
