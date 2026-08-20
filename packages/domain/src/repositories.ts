/**
 * Repository interfaces (ports) — définies par le domaine, implémentées par l'infrastructure
 * (packages/db, via Drizzle). Les Application Services (packages/pipeline, apps/api) dépendent
 * de ces interfaces, jamais de Drizzle directement.
 *
 * NOTE : ce fichier ne contient QUE des signatures. L'implémentation Drizzle arrive en Phase 1+,
 * après validation de l'architecture — voir docs/architecture.md.
 */

import type {
  Article,
  ArticleEntity,
  Entity,
  Source,
  SourceSyncLog,
  Story,
  StoryArticle,
  StoryStatus,
  Trend,
} from './types.js';

export interface SourceRepository {
  findById(id: string): Promise<Source | null>;
  findActive(): Promise<Source[]>;
  create(source: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<Source>;
  update(id: string, patch: Partial<Source>): Promise<Source>;
  delete(id: string): Promise<void>;
}

export interface ArticleRepository {
  findById(id: string): Promise<Article | null>;
  findByHash(hash: string): Promise<Article | null>;
  findByCanonicalUrl(canonicalUrl: string): Promise<Article | null>;
  create(article: Omit<Article, 'id'>): Promise<Article>;
  updateStatus(id: string, status: Article['status']): Promise<void>;
  linkEntity(link: ArticleEntity): Promise<void>;
}

export interface EntityRepository {
  findByNormalizedName(normalizedName: string): Promise<Entity | null>;
  create(entity: Omit<Entity, 'id'>): Promise<Entity>;
  findOrCreate(entity: Omit<Entity, 'id'>): Promise<Entity>;
}

export interface StoryRepository {
  findById(id: string): Promise<Story | null>;
  /**
   * Candidats pour le Story Matching : stories récentes partageant des entités
   * avec le nouvel article, dans la fenêtre temporelle configurée
   * (STORY_CANDIDATE_WINDOW_HOURS). Le scoring de similarité se fait en dehors
   * du repository (StoryEngine), ce repo ne fait que réduire l'espace de recherche.
   */
  findCandidates(params: { entityIds: string[]; sinceHours: number }): Promise<Story[]>;
  create(story: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<Story>;
  attachArticle(link: StoryArticle): Promise<void>;
  updateStatus(id: string, status: StoryStatus): Promise<void>;
  updateCounters(id: string, patch: Partial<Pick<Story, 'sourceCount' | 'articleCount' | 'lastUpdatedAt'>>): Promise<void>;
  listByStatus(status: StoryStatus): Promise<Story[]>;
  listTrending(limit: number): Promise<Story[]>;
}

export interface TrendRepository {
  upsertForStory(trend: Omit<Trend, 'id' | 'calculatedAt'>): Promise<Trend>;
  findLatestForStory(storyId: string): Promise<Trend | null>;
}

export interface SourceSyncLogRepository {
  start(sourceId: string): Promise<SourceSyncLog>;
  finish(id: string, patch: Omit<SourceSyncLog, 'id' | 'sourceId' | 'startedAt'>): Promise<void>;
}
