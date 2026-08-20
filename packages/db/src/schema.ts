/**
 * Briefeed — schéma Drizzle (PostgreSQL).
 *
 * Ce fichier est la source de vérité du modèle de données physique.
 * Voir docs/domain-model.md pour la vue conceptuelle et les décisions de conception.
 *
 * Conventions :
 * - PK = uuid (gen_random_uuid()) sauf tables de jointure pures (PK composite).
 * - Toutes les FK vers ARTICLE/STORY/SOURCE en cascade delete (le contenu dérivé
 *   ne doit pas survivre à la suppression de sa source de vérité).
 * - Les scores (importance, trend, relevance, confidence...) sont des `real` 0..1
 *   (ou non bornés pour importanceScore, cf. commentaire).
 */

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const articleStatusEnum = pgEnum('article_status', [
  'INGESTED',
  'NORMALIZED',
  'ENRICHED',
  'CLUSTERED',
  'FAILED',
]);

export const entityTypeEnum = pgEnum('entity_type', [
  'PERSON',
  'COMPANY',
  'ORGANIZATION',
  'LOCATION',
  'PRODUCT',
  'SPORT',
  'EVENT',
]);

export const storyStatusEnum = pgEnum('story_status', [
  'DISCOVERED',
  'ACTIVE',
  'DEVELOPING',
  'STABLE',
  'DORMANT',
  'ARCHIVED',
]);

export const summaryTypeEnum = pgEnum('summary_type', [
  'HEADLINE',
  'BRIEF',
  'OVERVIEW',
  'DIGEST',
  'DETAILED',
]);

export const sourceSyncStatusEnum = pgEnum('source_sync_status', ['SUCCESS', 'PARTIAL', 'FAILURE']);

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    feedUrl: text('feed_url').notNull(),
    websiteUrl: text('website_url'),
    language: text('language'),
    country: text('country'),
    category: text('category'),
    favicon: text('favicon'),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    /** Fetch conditionnel (HTTP 304) — voir docs/ingestion.md. */
    etag: text('etag'),
    lastModified: text('last_modified'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    feedUrlUnique: uniqueIndex('sources_feed_url_unique').on(t.feedUrl),
  }),
);

export const sourceSyncLogs = pgTable('source_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: sourceSyncStatusEnum('status'),
  articlesFetched: integer('articles_fetched').notNull().default(0),
  articlesNew: integer('articles_new').notNull().default(0),
  errorMessage: text('error_message'),
});

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    canonicalUrl: text('canonical_url'),
    author: text('author'),
    description: text('description'),
    content: text('content'),
    imageUrl: text('image_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    language: text('language'),
    /** sha256(sourceId + normalizedTitle + publishedAt) — dédup niveau 3. */
    hash: text('hash').notNull(),
    wordCount: integer('word_count'),
    readingTime: integer('reading_time'),
    status: articleStatusEnum('status').notNull().default('INGESTED'),
  },
  (t) => ({
    hashUnique: uniqueIndex('articles_hash_unique').on(t.hash),
    urlUnique: uniqueIndex('articles_url_unique').on(t.url),
  }),
);

// ---------------------------------------------------------------------------
// Entities & Topics
// ---------------------------------------------------------------------------

export const entities = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: entityTypeEnum('type').notNull(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    description: text('description'),
  },
  (t) => ({
    normalizedNameTypeUnique: uniqueIndex('entities_normalized_name_type_unique').on(
      t.normalizedName,
      t.type,
    ),
  }),
);

export const articleEntities = pgTable(
  'article_entities',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    confidence: real('confidence').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.articleId, t.entityId] }),
  }),
);

/** Taxonomie curée (Discover) — distincte des entités extraites automatiquement. */
export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    parentTopicId: uuid('parent_topic_id'),
  },
  (t) => ({
    slugUnique: uniqueIndex('topics_slug_unique').on(t.slug),
  }),
);

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const stories = pgTable(
  'stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary'),
    status: storyStatusEnum('status').notNull().default('DISCOVERED'),
    /** Poids éditorial 0..1 — distinct du trendScore (vitesse) : une Story peut être importante sans être "en accélération". */
    importanceScore: real('importance_score').notNull().default(0),
    trendScore: real('trend_score').notNull().default(0),
    noveltyScore: real('novelty_score').notNull().default(0),
    velocityScore: real('velocity_score').notNull().default(0),
    sourceCount: integer('source_count').notNull().default(0),
    articleCount: integer('article_count').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex('stories_slug_unique').on(t.slug),
  }),
);

export const storyArticles = pgTable(
  'story_articles',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    relevanceScore: real('relevance_score').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.storyId, t.articleId] }),
  }),
);

export const storyEntities = pgTable(
  'story_entities',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    confidence: real('confidence').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.storyId, t.entityId] }),
  }),
);

export const storyTopics = pgTable(
  'story_topics',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    confidence: real('confidence').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.storyId, t.topicId] }),
  }),
);

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  importance: real('importance').notNull().default(0),
  sourceArticleId: uuid('source_article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
});

/**
 * Snapshot du Trend Engine à un instant T. Table append-only : on garde l'historique
 * pour pouvoir tracer l'évolution ("+42% depuis 3h") sans recalcul rétroactif.
 * userAffinity ici = signal agrégé cross-utilisateurs, PAS un score par utilisateur
 * (voir docs/decisions/0008-trend-vs-personalization.md).
 */
export const trends = pgTable('trends', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  score: real('score').notNull(),
  velocity: real('velocity').notNull(),
  novelty: real('novelty').notNull(),
  sourceDiversity: real('source_diversity').notNull(),
  articleVelocity: real('article_velocity').notNull(),
  userAffinity: real('user_affinity').notNull().default(0),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Users & Personalization
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  locale: text('locale').notNull().default('fr'),
  timezone: text('timezone').notNull().default('Europe/Paris'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userSources = pgTable(
  'user_sources',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.sourceId] }),
  }),
);

export const userFolders = pgTable('user_folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const userFolderSources = pgTable(
  'user_folder_sources',
  {
    folderId: uuid('folder_id')
      .notNull()
      .references(() => userFolders.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.folderId, t.sourceId] }),
  }),
);

export const userSavedArticles = pgTable(
  'user_saved_articles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.articleId] }),
  }),
);

export const userSavedStories = pgTable(
  'user_saved_stories',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.storyId] }),
  }),
);

/** weight ∈ [-1, 1] : ajusté par les signaux implicites (lecture, dismiss...) + explicites. */
export const userPreferences = pgTable(
  'user_preferences',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    weight: real('weight').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.topicId] }),
  }),
);

// ---------------------------------------------------------------------------
// AI Summaries
// ---------------------------------------------------------------------------

export const aiSummaries = pgTable(
  'ai_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    type: summaryTypeEnum('type').notNull(),
    /** AiSummaryContent (packages/domain) — validé par Zod avant persistance. */
    content: text('content').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Une synthèse identique (même story, type, version de prompt) ne doit pas être
    // régénérée : c'est la clé du cache AI (section 33 du brief).
    cacheKey: uniqueIndex('ai_summaries_cache_key').on(t.storyId, t.type, t.promptVersion),
  }),
);

// ---------------------------------------------------------------------------
// Relations (pour les requêtes Drizzle `with: {...}`)
// ---------------------------------------------------------------------------

export const storiesRelations = relations(stories, ({ many }) => ({
  storyArticles: many(storyArticles),
  storyEntities: many(storyEntities),
  storyTopics: many(storyTopics),
  events: many(events),
  trends: many(trends),
  aiSummaries: many(aiSummaries),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  source: one(sources, { fields: [articles.sourceId], references: [sources.id] }),
  articleEntities: many(articleEntities),
  storyArticles: many(storyArticles),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  articles: many(articles),
  syncLogs: many(sourceSyncLogs),
}));

export const storyArticlesRelations = relations(storyArticles, ({ one }) => ({
  story: one(stories, { fields: [storyArticles.storyId], references: [stories.id] }),
  article: one(articles, { fields: [storyArticles.articleId], references: [articles.id] }),
}));

// `sql` est ré-exporté pour les futurs besoins de requêtes brutes (full-text search, cf. docs/architecture.md §Recherche).
export { sql };
