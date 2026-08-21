import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Article,
  ArticleEntity,
  ArticleRepository,
  Entity,
  EntityRepository,
} from '@briefeed/domain';
import type { EntityExtractor, ExtractableArticle, ExtractedEntity } from '@briefeed/enrichment';
import { EnrichmentService } from '../enrichment-service.js';

// ---------------------------------------------------------------------------
// Fakes en mémoire — mêmes conventions que ingestion-service.test.ts.
// ---------------------------------------------------------------------------

class InMemoryArticleRepository implements ArticleRepository {
  articles: Article[] = [];
  links: ArticleEntity[] = [];
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
  async linkEntity(link: ArticleEntity) {
    this.links.push(link);
  }
  async listByStatus(status: Article['status'], limit: number) {
    return this.articles.filter((a) => a.status === status).slice(0, limit);
  }
}

class InMemoryEntityRepository implements EntityRepository {
  entities: Entity[] = [];
  async findByNormalizedName(normalizedName: string) {
    return this.entities.find((e) => e.normalizedName === normalizedName) ?? null;
  }
  async create(entity: Omit<Entity, 'id'>): Promise<Entity> {
    const created = { ...entity, id: randomUUID() };
    this.entities.push(created);
    return created;
  }
  async findOrCreate(entity: Omit<Entity, 'id'>): Promise<Entity> {
    const existing = this.entities.find(
      (e) => e.normalizedName === entity.normalizedName && e.type === entity.type,
    );
    if (existing) return existing;
    return this.create(entity);
  }
}

class FakeExtractor implements EntityExtractor {
  constructor(
    readonly name: string,
    private readonly result: ExtractedEntity[] | (() => never),
  ) {}
  extract(_article: ExtractableArticle): Promise<ExtractedEntity[]> {
    if (typeof this.result === 'function') return Promise.resolve(this.result());
    return Promise.resolve(this.result);
  }
}

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: randomUUID(),
    sourceId: randomUUID(),
    title: 'Google announces new AI model',
    url: 'https://example.com/google-ai',
    canonicalUrl: 'https://example.com/google-ai',
    author: null,
    description: 'Google unveils a new model.',
    content: null,
    imageUrl: null,
    publishedAt: new Date('2026-08-18T10:00:00Z'),
    fetchedAt: new Date('2026-08-18T10:01:00Z'),
    language: 'en',
    hash: 'hash-1',
    wordCount: 42,
    readingTime: 1,
    status: 'INGESTED',
    ...overrides,
  };
}

const GOOGLE_ENTITY: ExtractedEntity = {
  name: 'Google',
  normalizedName: 'google',
  type: 'COMPANY',
  confidence: 0.9,
};

// ---------------------------------------------------------------------------

describe('EnrichmentService', () => {
  let articleRepo: InMemoryArticleRepository;
  let entityRepo: InMemoryEntityRepository;

  beforeEach(() => {
    articleRepo = new InMemoryArticleRepository();
    entityRepo = new InMemoryEntityRepository();
  });

  function service(primary: EntityExtractor, fallback: EntityExtractor) {
    return new EnrichmentService({
      primaryExtractor: primary,
      fallbackExtractor: fallback,
      articleRepository: articleRepo,
      entityRepository: entityRepo,
      concurrency: 3,
    });
  }

  it('links extracted entities and marks the article ENRICHED', async () => {
    const article = await articleRepo.create(makeArticle());
    const primary = new FakeExtractor('groq', [GOOGLE_ENTITY]);
    const fallback = new FakeExtractor('heuristic', []);

    const summary = await service(primary, fallback).enrichArticle(article);

    expect(summary).toMatchObject({
      articleId: article.id,
      extractorUsed: 'groq',
      entitiesLinked: 1,
      status: 'SUCCESS',
    });
    expect(entityRepo.entities).toHaveLength(1);
    expect(articleRepo.links).toHaveLength(1);
    expect((await articleRepo.findById(article.id))?.status).toBe('ENRICHED');
  });

  it('falls back to the secondary extractor when the primary throws (ADR-0006)', async () => {
    const article = await articleRepo.create(makeArticle());
    const primary = new FakeExtractor('groq', () => {
      throw new Error('Groq unavailable');
    });
    const fallback = new FakeExtractor('heuristic', [GOOGLE_ENTITY]);

    const summary = await service(primary, fallback).enrichArticle(article);

    expect(summary.extractorUsed).toBe('heuristic');
    expect(summary.status).toBe('SUCCESS');
    expect((await articleRepo.findById(article.id))?.status).toBe('ENRICHED');
  });

  it('marks the article FAILED (never throws) when both extractors fail', async () => {
    const article = await articleRepo.create(makeArticle());
    const primary = new FakeExtractor('groq', () => {
      throw new Error('Groq unavailable');
    });
    const fallback = new FakeExtractor('heuristic', () => {
      throw new Error('heuristic crashed too');
    });

    const summary = await service(primary, fallback).enrichArticle(article);

    expect(summary.status).toBe('FAILURE');
    expect(summary.errorMessage).toContain('heuristic crashed too');
    expect((await articleRepo.findById(article.id))?.status).toBe('FAILED');
  });

  it('reuses an existing entity across two articles instead of duplicating it', async () => {
    const a1 = await articleRepo.create(makeArticle());
    const a2 = await articleRepo.create(makeArticle({ hash: 'hash-2' }));
    const extractor = new FakeExtractor('heuristic', [GOOGLE_ENTITY]);
    const svc = service(extractor, extractor);

    await svc.enrichArticle(a1);
    await svc.enrichArticle(a2);

    expect(entityRepo.entities).toHaveLength(1);
    expect(articleRepo.links).toHaveLength(2);
  });

  it('enrichPending processes only INGESTED articles, bounded by batchSize', async () => {
    await articleRepo.create(makeArticle({ status: 'ENRICHED', hash: 'already-done' }));
    await articleRepo.create(makeArticle({ hash: 'pending-1' }));
    await articleRepo.create(makeArticle({ hash: 'pending-2' }));
    const extractor = new FakeExtractor('heuristic', [GOOGLE_ENTITY]);

    const summaries = await service(extractor, extractor).enrichPending(1);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.status).toBe('SUCCESS');
  });
});
