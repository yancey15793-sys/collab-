/**
 * Parsing RSS 2.0 / Atom → RawFeedItem[]. Fonction pure (pas d'I/O) : reçoit du
 * XML déjà téléchargé, ne fait jamais de requête réseau elle-même — ce qui la
 * rend testable avec de simples fixtures. rss-parser gère RSS 2.0 et Atom de
 * façon transparente (auto-détection du format).
 */

import Parser from 'rss-parser';
import { ValidationError } from '@briefeed/shared';
import type { RawFeedItem } from './index.js';

const parser = new Parser({ timeout: 0 }); // timeout géré par le fetcher, pas ici

export interface ParseResult {
  items: RawFeedItem[];
  /** Items présents dans le flux mais ignorés faute de titre ou de lien exploitable. */
  skippedCount: number;
}

export async function parseFeed(xml: string): Promise<ParseResult> {
  if (!xml || xml.trim().length === 0) {
    throw new ValidationError('Empty feed body');
  }

  let feed: Parser.Output<Record<string, unknown>>;
  try {
    feed = await parser.parseString(xml);
  } catch (err) {
    throw new ValidationError('Malformed RSS/Atom feed', err);
  }

  const items: RawFeedItem[] = [];
  let skippedCount = 0;

  for (const raw of feed.items ?? []) {
    const title = raw.title?.trim();
    const link = raw.link?.trim();

    if (!title || !link) {
      skippedCount += 1;
      continue;
    }

    const publishedAt = parseDate(raw.isoDate ?? raw.pubDate);

    items.push({
      title,
      link,
      description: asString(raw.contentSnippet) ?? asString(raw.summary),
      content: asString(raw.content) ?? asString(raw['content:encoded']),
      author: asString(raw.creator) ?? asString(raw.author),
      publishedAt: publishedAt ?? new Date(),
      imageUrl: extractImageUrl(raw),
      guid: asString(raw.guid) ?? asString(raw.id),
    });
  }

  return { items, skippedCount };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractImageUrl(raw: Record<string, unknown>): string | undefined {
  const enclosure = raw.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && enclosure.type?.startsWith('image/')) {
    return enclosure.url;
  }
  const mediaContent = raw['media:content'] as { $?: { url?: string } } | undefined;
  return mediaContent?.$?.url;
}
