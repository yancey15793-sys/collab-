import { eq } from 'drizzle-orm';
import type { Article, ArticleEntity, ArticleRepository } from '@briefeed/domain';
import type { Database } from '../client.js';
import { articleEntities, articles } from '../schema.js';

export class DrizzleArticleRepository implements ArticleRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Article | null> {
    const [row] = await this.db.select().from(articles).where(eq(articles.id, id)).limit(1);
    return row ?? null;
  }

  async findByHash(hash: string): Promise<Article | null> {
    const [row] = await this.db.select().from(articles).where(eq(articles.hash, hash)).limit(1);
    return row ?? null;
  }

  async findByCanonicalUrl(canonicalUrl: string): Promise<Article | null> {
    const [row] = await this.db
      .select()
      .from(articles)
      .where(eq(articles.canonicalUrl, canonicalUrl))
      .limit(1);
    return row ?? null;
  }

  async create(article: Omit<Article, 'id'>): Promise<Article> {
    const [row] = await this.db.insert(articles).values(article).returning();
    if (!row) throw new Error('Failed to create article');
    return row;
  }

  async updateStatus(id: string, status: Article['status']): Promise<void> {
    await this.db.update(articles).set({ status }).where(eq(articles.id, id));
  }

  async linkEntity(link: ArticleEntity): Promise<void> {
    await this.db.insert(articleEntities).values(link).onConflictDoNothing();
  }

  async listByStatus(status: Article['status'], limit: number): Promise<Article[]> {
    return this.db.select().from(articles).where(eq(articles.status, status)).limit(limit);
  }
}
