import { describe, expect, it } from 'vitest';
import { parseFeed } from '../parse.js';

const RSS2_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example News</title>
    <item>
      <title>Apple accélère son offensive IA</title>
      <link>https://example.com/apple-ai</link>
      <description>Apple announces new AI features.</description>
      <pubDate>Mon, 18 Aug 2026 10:02:00 GMT</pubDate>
      <author>jane@example.com (Jane Doe)</author>
      <guid>apple-ai-1</guid>
    </item>
    <item>
      <!-- item sans titre : doit être ignoré -->
      <link>https://example.com/no-title</link>
      <pubDate>Mon, 18 Aug 2026 11:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom Feed</title>
  <entry>
    <title>La Fed prépare une nouvelle décision</title>
    <link href="https://example.com/fed-decision" />
    <id>fed-decision-1</id>
    <updated>2026-08-18T09:00:00Z</updated>
    <content type="html">&lt;p&gt;The Fed is expected to...&lt;/p&gt;</content>
  </entry>
</feed>`;

describe('parseFeed', () => {
  it('parses RSS 2.0 items and skips items missing title or link', async () => {
    const result = await parseFeed(RSS2_SAMPLE);
    expect(result.items).toHaveLength(1);
    expect(result.skippedCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      title: 'Apple accélère son offensive IA',
      link: 'https://example.com/apple-ai',
      guid: 'apple-ai-1',
    });
    expect(result.items[0]?.publishedAt).toBeInstanceOf(Date);
  });

  it('parses Atom entries transparently (same output shape as RSS)', async () => {
    const result = await parseFeed(ATOM_SAMPLE);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe('La Fed prépare une nouvelle décision');
    expect(result.items[0]?.link).toBe('https://example.com/fed-decision');
  });

  it('rejects an empty body', async () => {
    await expect(parseFeed('')).rejects.toThrow();
  });

  it('rejects malformed XML', async () => {
    await expect(parseFeed('<rss><channel><item><title>Broken')).rejects.toThrow();
  });
});
