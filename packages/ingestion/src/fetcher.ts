/**
 * Implémentation HTTP de SourceFetcher (fetch conditionnel, timeout, retries).
 * Seule pièce d'I/O réseau du package — parse.ts reste pur et testable séparément.
 */

import { SourceIngestionError } from '@briefeed/shared';
import { parseFeed } from './parse.js';
import type { FetchResult, SourceFetcher } from './index.js';

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

export class NodeRssAtomFetcher implements SourceFetcher {
  async fetch(params: {
    feedUrl: string;
    etag?: string;
    lastModified?: string;
    timeoutMs: number;
  }): Promise<FetchResult | 'NOT_MODIFIED'> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attemptFetch(params);
      } catch (err) {
        lastError = err;
        if (!isRetryable(err) || attempt === MAX_ATTEMPTS) {
          break;
        }
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
      }
    }

    throw new SourceIngestionError(
      `Failed to fetch feed ${params.feedUrl} after ${MAX_ATTEMPTS} attempts`,
      lastError,
    );
  }

  private async attemptFetch(params: {
    feedUrl: string;
    etag?: string;
    lastModified?: string;
    timeoutMs: number;
  }): Promise<FetchResult | 'NOT_MODIFIED'> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Briefeed/0.1 (+https://briefeed.app)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      };
      if (params.etag) headers['If-None-Match'] = params.etag;
      if (params.lastModified) headers['If-Modified-Since'] = params.lastModified;

      // `fetch` suit les redirections HTTP par défaut.
      const response = await fetch(params.feedUrl, { headers, signal: controller.signal });

      if (response.status === 304) {
        return 'NOT_MODIFIED';
      }

      if (!response.ok) {
        throw new HttpStatusError(response.status, params.feedUrl);
      }

      const xml = await response.text();
      const { items } = await parseFeed(xml);

      return {
        items,
        etag: response.headers.get('etag') ?? undefined,
        lastModified: response.headers.get('last-modified') ?? undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    feedUrl: string,
  ) {
    super(`HTTP ${status} fetching ${feedUrl}`);
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof HttpStatusError) {
    // 4xx = erreur côté source (URL cassée, flux désactivé) : inutile de réessayer,
    // sauf 429 (rate limit) qui mérite un retry avec backoff.
    return err.status === 429 || err.status >= 500;
  }
  // Timeout (AbortError) ou erreur réseau (DNS, connexion refusée...) : on retente.
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
