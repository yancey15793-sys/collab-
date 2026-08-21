import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Article,
  ArticleEntity,
  ArticleRepository,
  Source,
  SourceRepository,
  SourceSyncLog,
  SourceSyncLogRepository,
} from '@briefeed/domain';
import type { FetchResult, RawFeedItem, SourceFetcher } from '@briefeed/ingestion';
import { IngestionService } from '../ingestion-service.js';

// ---------------------------------------------------------------------------
// Fakes en mémoire — implémentent les interfaces de packages/domain, aucune DB
// n'est nécessaire pour tester l'orchestration.
// ---------------------------------------------------------------------------

class InMemorySourceRepository implements SourceRepository {
  constructor(private sources: Map<string, Source>) {}
  async findById(id: string) {
    return this.sources.get(id) ?? null;
  }
  async findActive() {
    return [...this.sources.values()].filter((s) => s.active);
  }
  async create(): Promise<Source> {
    throw new Error('not used in these tests');
  }
  async update(id: string, patch: Partial<Source>): Promise<Source> {
    const existing = this.sources.get(id);
    if (!existing) throw new Error(`Source ${id} not found`);
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.sources.set(id, updated);
    return updated;
  }
  async delete(id: string) {
    this.sources.delete(id);
  }
}

class InMemoryArticleRepository implements ArticleRepository {
  articles: Article[] = [];
  async findById(id: string) {
    return this.articles.find((a) => a.id === id) ?? null;
  }
  async findByHash(hash: string) {
    return this.articles.find((a) => a.hash === hash) ?? null;
  }
  async findByCanonicalUrl(canonicalUrl: string) {
    return this.articles.find((a) => a.canonicalUrl === canonicalUrl) ?? null;
  }
  async create(article: Omit<Article, 'id'>): Promise<Article> {
    const created = { ...article, id: randomUUID() };
    this.articles.push(created);
    return created;
  }
  async updateStatus(id: string, status: Article['status']) {
    const article = this.articles.find((a) => a.id === id);
    if (article) article.status = status;
  }
  async linkEntity(_link: ArticleEntity) {
    // non utilisé en Phase 1
  }
  async listByStatus(status: Article['status'], limit: number) {
    return this.articles.filter((a) => a.status === status).slice(0, limit);
  }
}

class InMemorySyncLogRepository implements SourceSyncLogRepository {
  logs = new Map<string, SourceSyncLog>();
  async start(sourceId: string): Promise<SourceSyncLog> {
    const log: SourceSyncLog = {
      id: randomUUID(),
      sourceId,
      startedAt: new Date(),
      finishedAt: null,
      status: null,
      articlesFetched: 0,
      articlesNew: 0,
      errorMessage: null,
    };
    this.logs.set(log.id, log);
    return log;
  }
  async finish(id: string, patch: Omit<SourceSyncLog, 'id' | 'sourceId' | 'startedAt'>) {
    const existing = this.logs.get(id);
    if (!existing) throw new Error(`Log ${id} not found`);
    this.logs.set(id, { ...existing, ...patch });
  }
}

class FakeFetcher implements SourceFetcher {
  constructor(private readonly result: FetchResult | 'NOT_MODIFIED' | (() => never)) {}
  async fetch(): Promise<FetchResult | 'NOT_MODIFIED'> {
    if (typeof this.result === 'function') return this.result();
    return this.result;
  }
}

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: randomUUID(),
    name: 'Example News',
    feedUrl: 'https://example.com/feed.xml',
    websiteUrl: 'https://example.com',
    language: 'en',
    country: 'US',
    category: 'technology',
    favicon: null,
    description: null,
    active: true,
    etag: null,
    lastModified: null,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeItem(overrides: Partial<RawFeedItem> = {}): RawFeedItem {
  return {
    title: 'Apple accélère son offensive IA',
    link: 'https://example.com/apple-ai',
    description: 'Apple announces new AI features.',
    publishedAt: new Date('2026-08-18T10:02:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------

describe('IngestionService.syncSource', () => {
  let sourceRepo: InMemorySourceRepository;
  let articleRepo: InMemoryArticleRepository;
  let syncLogRepo: InMemorySyncLogRepository;
  let source: Source;

  beforeEach(() => {
    source = makeSource();
    sourceRepo = new InMemorySourceRepository(new Map([[source.id, source]]));
    articleRepo = new InMemoryArticleRepository();
    syncLogRepo = new InMemorySyncLogRepository();
  });

  function service(fetcher: SourceFetcher) {
    return new IngestionService({
      fetcher,
      sourceRepository: sourceRepo,
      articleRepository: articleRepo,
      syncLogRepository: syncLogRepo,
      timeoutMs: 5000,
    });
  }

  it('persists new articles and reports them as new', async () => {
    const fetcher = new FakeFetcher({
      items: [makeItem()],
      etag: 'W/"abc"',
      lastModified: 'Tue, 18 Aug 2026 10:00:00 GMT',
    });

    const summary = await service(fetcher).syncSource(source);

    expect(summary).toMatchObject({
      sourceId: source.id,
      status: 'SUCCESS',
      articlesFetched: 1,
      articlesNew: 1,
      errorMessage: null,
    });
    expect(articleRepo.articles).toHaveLength(1);
    expect(articleRepo.articles[0]?.title).toBe('Apple accélère son offensive IA');

    const updatedSource = await sourceRepo.findById(source.id);
    expect(updatedSource?.etag).toBe('W/"abc"');
    expect(updatedSource?.lastSyncedAt).toBeInstanceOf(Date);
  });

  it('skips an item that is already known by canonical URL (dedup level 1-2)', async () => {
    await articleRepo.create({
      sourceId: source.id,
      title: 'Old title',
      url: 'https://example.com/apple-ai',
      canonicalUrl: 'https://example.com/apple-ai',
      author: null,
      description: null,
      content: null,
      imageUrl: null,
      publishedAt: new Date(),
      fetchedAt: new Date(),
      language: 'en',
      hash: 'unrelated-hash',
      wordCount: null,
      readingTime: null,
      status: 'INGESTED',
    });

    const fetcher = new FakeFetcher({ items: [makeItem()] });
    const summary = await service(fetcher).syncSource(source);

    expect(summary.articlesFetched).toBe(1);
    expect(summary.articlesNew).toBe(0);
    expect(articleRepo.articles).toHaveLength(1); // pas de doublon inséré
  });

  it('handles NOT_MODIFIED (HTTP 304) without touching articles', async () => {
    const fetcher = new FakeFetcher('NOT_MODIFIED');
    const summary = await service(fetcher).syncSource(source);

    expect(summary).toMatchObject({ status: 'SUCCESS', articlesFetched: 0, articlesNew: 0 });
    expect(articleRepo.articles).toHaveLength(0);

    const updatedSource = await sourceRepo.findById(source.id);
    expect(updatedSource?.lastSyncedAt).toBeInstanceOf(Date);
  });

  it('never throws when the fetcher fails, and reports FAILURE instead', async () => {
    const fetcher = new FakeFetcher(() => {
      throw new Error('feed unreachable');
    });

    const summary = await service(fetcher).syncSource(source);

    expect(summary.status).toBe('FAILURE');
    expect(summary.errorMessage).toContain('feed unreachable');
    expect(articleRepo.articles).toHaveLength(0);
  });

  it('records a finished sync log with the same outcome as the returned summary', async () => {
    const fetcher = new FakeFetcher({ items: [makeItem()] });
    const summary = await service(fetcher).syncSource(source);

    const [log] = [...syncLogRepo.logs.values()];
    expect(log?.status).toBe(summary.status);
    expect(log?.finishedAt).toBeInstanceOf(Date);
    expect(log?.articlesNew).toBe(1);
  });
});
