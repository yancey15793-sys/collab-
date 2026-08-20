/**
 * IngestionService — Application Service orchestrant un cycle de synchronisation
 * pour UNE source : fetch (conditionnel) → dédup niveaux 1-3 → sanitize → persist
 * → mise à jour de la source (etag/lastModified/lastSyncedAt) → log de sync.
 *
 * Règle absolue : cette méthode ne lève JAMAIS d'exception vers l'appelant. Une
 * source cassée retourne un `SourceSyncSummary` avec status FAILURE — le worker
 * peut boucler sur toutes les sources sans qu'une seule panne n'interrompe les
 * autres (brief §8, §35).
 */

import type {
  Article,
  Source,
  SourceRepository,
  ArticleRepository,
  SourceSyncLogRepository,
  SourceSyncStatus,
} from '@briefeed/domain';
import {
  computeArticleHash,
  normalizeTitle,
  normalizeUrl,
  sanitizeArticleHtml,
  stripHtml,
  type RawFeedItem,
  type SourceFetcher,
} from '@briefeed/ingestion';

const WORDS_PER_MINUTE = 200;

export interface IngestionServiceDeps {
  fetcher: SourceFetcher;
  sourceRepository: SourceRepository;
  articleRepository: ArticleRepository;
  syncLogRepository: SourceSyncLogRepository;
  timeoutMs: number;
}

export interface SourceSyncSummary {
  sourceId: string;
  status: SourceSyncStatus;
  articlesFetched: number;
  articlesNew: number;
  errorMessage: string | null;
}

export class IngestionService {
  constructor(private readonly deps: IngestionServiceDeps) {}

  async syncSource(source: Source): Promise<SourceSyncSummary> {
    const log = await this.deps.syncLogRepository.start(source.id);

    try {
      const result = await this.deps.fetcher.fetch({
        feedUrl: source.feedUrl,
        etag: source.etag ?? undefined,
        lastModified: source.lastModified ?? undefined,
        timeoutMs: this.deps.timeoutMs,
      });

      if (result === 'NOT_MODIFIED') {
        await this.deps.sourceRepository.update(source.id, { lastSyncedAt: new Date() });
        return this.finish(log.id, source.id, {
          status: 'SUCCESS',
          articlesFetched: 0,
          articlesNew: 0,
          errorMessage: null,
        });
      }

      let articlesNew = 0;
      for (const item of result.items) {
        const created = await this.persistItem(source, item);
        if (created) articlesNew += 1;
      }

      await this.deps.sourceRepository.update(source.id, {
        etag: result.etag ?? source.etag,
        lastModified: result.lastModified ?? source.lastModified,
        lastSyncedAt: new Date(),
      });

      return this.finish(log.id, source.id, {
        status: 'SUCCESS',
        articlesFetched: result.items.length,
        articlesNew,
        errorMessage: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return this.finish(log.id, source.id, {
        status: 'FAILURE',
        articlesFetched: 0,
        articlesNew: 0,
        errorMessage,
      });
    }
  }

  private async finish(
    logId: string,
    sourceId: string,
    summary: Omit<SourceSyncSummary, 'sourceId'>,
  ): Promise<SourceSyncSummary> {
    try {
      await this.deps.syncLogRepository.finish(logId, { ...summary, finishedAt: new Date() });
    } catch {
      // Un échec d'écriture du log ne doit jamais masquer/aggraver le résultat réel du cycle.
    }
    return { sourceId, ...summary };
  }

  /** @returns true si un nouvel article a été créé, false s'il s'agissait d'un doublon. */
  private async persistItem(source: Source, item: RawFeedItem): Promise<boolean> {
    const canonicalUrl = normalizeUrl(item.link);

    // Déduplication niveaux 1-2 : URL canonique / normalisée déjà connue.
    if (await this.deps.articleRepository.findByCanonicalUrl(canonicalUrl)) {
      return false;
    }

    const hash = computeArticleHash({
      sourceId: source.id,
      normalizedTitle: normalizeTitle(item.title),
      publishedAt: item.publishedAt,
    });

    // Déduplication niveau 3 : contenu identique déjà ingéré pour cette source.
    if (await this.deps.articleRepository.findByHash(hash)) {
      return false;
    }

    const content = sanitizeArticleHtml(item.content);
    const description = stripHtml(item.description);
    // Le comptage de mots se fait sur du texte brut (HTML retiré), jamais sur le HTML source.
    const wordCount = computeWordCount(stripHtml(item.content) ?? description);

    const article: Omit<Article, 'id'> = {
      sourceId: source.id,
      title: item.title,
      url: item.link,
      canonicalUrl,
      author: item.author ?? null,
      description,
      content,
      imageUrl: item.imageUrl ?? null,
      publishedAt: item.publishedAt,
      fetchedAt: new Date(),
      language: source.language,
      hash,
      wordCount,
      readingTime: wordCount ? Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)) : null,
      status: 'INGESTED',
    };

    try {
      await this.deps.articleRepository.create(article);
      return true;
    } catch (err) {
      // Course entre deux cycles concurrents insérant le même article : la
      // contrainte unique DB (hash/url) gagne, ce n'est pas une vraie erreur.
      if (isUniqueViolation(err)) return false;
      throw err;
    }
  }
}

function computeWordCount(text: string | null | undefined): number | null {
  if (!text) return null;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 ? words.length : null;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
