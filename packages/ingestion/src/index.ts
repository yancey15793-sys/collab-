/**
 * RSS/Atom Ingestion Engine.
 * Voir docs/ingestion.md pour le pipeline complet (fetch → validate → parse →
 * normalize → sanitize → deduplicate → persist) et la gestion d'erreurs par source.
 *
 * Ce package fournit uniquement l'adaptateur d'infrastructure (I/O réseau + parsing).
 * L'orchestration (appel aux repositories, logs de synchronisation) vit dans
 * `@briefeed/pipeline` — IngestionService — qui dépend de ce contrat, jamais de fetch/XML directement.
 */

export interface RawFeedItem {
  title: string;
  link: string;
  description?: string;
  content?: string;
  author?: string;
  publishedAt: Date;
  imageUrl?: string;
  guid?: string;
}

export interface FetchResult {
  items: RawFeedItem[];
  etag?: string;
  lastModified?: string;
}

/**
 * Une implémentation par format supporté (RSS 2.0, Atom). Isolée pour que
 * l'échec d'une source n'affecte jamais les autres (règle §8 du brief).
 */
export interface SourceFetcher {
  fetch(params: {
    feedUrl: string;
    etag?: string;
    lastModified?: string;
    timeoutMs: number;
  }): Promise<FetchResult | 'NOT_MODIFIED'>;
}

export { NodeRssAtomFetcher } from './fetcher.js';
export { parseFeed } from './parse.js';
export type { ParseResult } from './parse.js';
export { normalizeUrl } from './normalize-url.js';
export { computeArticleHash, normalizeTitle } from './hash.js';
export { sanitizeArticleHtml, stripHtml } from './sanitize.js';
