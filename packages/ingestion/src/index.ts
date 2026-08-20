/**
 * RSS/Atom Ingestion Engine — CONTRAT SEULEMENT, implémentation en Phase 1.
 * Voir docs/ingestion.md pour le pipeline complet (fetch → validate → parse →
 * normalize → sanitize → deduplicate → persist) et la gestion d'erreurs par source.
 *
 * Ce fichier fixe la frontière : le Worker appelle `SourceFetcher`, jamais un
 * client HTTP ou un parseur XML directement.
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
  fetch(params: { feedUrl: string; etag?: string; lastModified?: string; timeoutMs: number }): Promise<
    FetchResult | 'NOT_MODIFIED'
  >;
}
