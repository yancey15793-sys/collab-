import { describe, expect, it } from 'vitest';
import { sanitizeArticleHtml, stripHtml } from '../sanitize.js';

describe('sanitizeArticleHtml', () => {
  it('strips script tags', () => {
    const result = sanitizeArticleHtml('<p>Hello</p><script>alert(1)</script>');
    expect(result).toBe('<p>Hello</p>');
  });

  it('keeps a safe allowlist of formatting tags', () => {
    const result = sanitizeArticleHtml('<p>Hello <strong>world</strong></p>');
    expect(result).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('returns null for empty input', () => {
    expect(sanitizeArticleHtml('')).toBeNull();
    expect(sanitizeArticleHtml(undefined)).toBeNull();
    expect(sanitizeArticleHtml(null)).toBeNull();
  });

  it('drops disallowed tags like iframe', () => {
    const result = sanitizeArticleHtml('<iframe src="evil"></iframe><p>ok</p>');
    expect(result).toBe('<p>ok</p>');
  });
});

describe('stripHtml', () => {
  it('returns plain text with all tags removed', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });
});
