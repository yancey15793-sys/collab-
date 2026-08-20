/**
 * Domain types — le vocabulaire métier de Briefeed.
 *
 * Règle : ce fichier ne dépend d'AUCUNE infrastructure (pas de Drizzle, pas de Fastify,
 * pas de React). Il décrit ce qu'est une Story, un Article, une Entity — pas comment
 * ils sont stockés ou affichés. packages/db implémente ces types via Drizzle ;
 * apps/api et apps/web ne font que les consommer.
 */

// ---------------------------------------------------------------------------
// Enums métier
// ---------------------------------------------------------------------------

export type ArticleStatus = 'INGESTED' | 'NORMALIZED' | 'ENRICHED' | 'CLUSTERED' | 'FAILED';

export type EntityType =
  | 'PERSON'
  | 'COMPANY'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'PRODUCT'
  | 'SPORT'
  | 'EVENT';

/**
 * Cycle de vie d'une Story. Les transitions sont gérées exclusivement par
 * `story-lifecycle.ts` — jamais assignées directement ailleurs dans le code.
 */
export type StoryStatus = 'DISCOVERED' | 'ACTIVE' | 'DEVELOPING' | 'STABLE' | 'DORMANT' | 'ARCHIVED';

export type SummaryType = 'HEADLINE' | 'BRIEF' | 'OVERVIEW' | 'DIGEST' | 'DETAILED';

/**
 * Niveau de certitude d'une affirmation à l'intérieur d'une synthèse IA.
 * Vit dans le JSON structuré d'AI_SUMMARY.content (validé par Zod), pas en colonne DB.
 */
export type ClaimConfidence = 'CONFIRMED' | 'REPORTED' | 'UNCERTAIN' | 'DISPUTED';

export type SourceSyncStatus = 'SUCCESS' | 'PARTIAL' | 'FAILURE';

// ---------------------------------------------------------------------------
// Entités
// ---------------------------------------------------------------------------

export interface Source {
  id: string;
  name: string;
  feedUrl: string;
  websiteUrl: string | null;
  language: string | null;
  country: string | null;
  category: string | null;
  favicon: string | null;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Article {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  canonicalUrl: string | null;
  author: string | null;
  description: string | null;
  content: string | null;
  imageUrl: string | null;
  publishedAt: Date;
  fetchedAt: Date;
  language: string | null;
  hash: string;
  wordCount: number | null;
  readingTime: number | null;
  status: ArticleStatus;
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  normalizedName: string;
  description: string | null;
}

export interface ArticleEntity {
  articleId: string;
  entityId: string;
  confidence: number; // 0..1
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  parentTopicId: string | null;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: StoryStatus;
  importanceScore: number;
  trendScore: number;
  noveltyScore: number;
  velocityScore: number;
  sourceCount: number;
  articleCount: number;
  firstSeenAt: Date;
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryArticle {
  storyId: string;
  articleId: string;
  relevanceScore: number; // 0..1
}

export interface StoryEntity {
  storyId: string;
  entityId: string;
  confidence: number;
}

export interface StoryTopic {
  storyId: string;
  topicId: string;
  confidence: number;
}

export interface Event {
  id: string;
  storyId: string;
  title: string;
  description: string | null;
  timestamp: Date;
  importance: number;
  sourceArticleId: string;
}

export interface Trend {
  id: string;
  storyId: string;
  score: number;
  velocity: number;
  novelty: number;
  sourceDiversity: number;
  articleVelocity: number;
  /**
   * Signal agrégé, cross-utilisateurs (PAS un score personnalisé par utilisateur).
   * Voir docs/decisions/0008-trend-vs-personalization.md — le classement personnalisé
   * combine ce score global avec USER_PREFERENCE à la lecture, sans le stocker ici.
   */
  userAffinity: number;
  calculatedAt: Date;
}

export interface User {
  id: string;
  locale: string;
  timezone: string;
  createdAt: Date;
}

export interface UserSource {
  userId: string;
  sourceId: string;
}

export interface UserFolder {
  id: string;
  userId: string;
  name: string;
}

export interface UserFolderSource {
  folderId: string;
  sourceId: string;
}

export interface UserSavedArticle {
  userId: string;
  articleId: string;
}

export interface UserSavedStory {
  userId: string;
  storyId: string;
}

export interface UserPreference {
  userId: string;
  topicId: string;
  weight: number; // -1..1, ajusté par les signaux implicites + explicites
}

export interface AiSummary {
  id: string;
  storyId: string;
  type: SummaryType;
  content: AiSummaryContent;
  model: string;
  promptVersion: string;
  createdAt: Date;
}

/**
 * Forme structurée et validée (Zod) d'une synthèse IA.
 * Jamais de texte libre non typé persisté sans passer par ce schéma.
 */
export interface AiSummaryContent {
  headline: string;
  summary: string;
  keyPoints: string[];
  whatChanged: string | null;
  claims: Array<{
    text: string;
    confidence: ClaimConfidence;
    sourceArticleIds: string[];
  }>;
  sources: string[]; // sourceId[]
}

export interface SourceSyncLog {
  id: string;
  sourceId: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: SourceSyncStatus;
  articlesFetched: number;
  articlesNew: number;
  errorMessage: string | null;
}
