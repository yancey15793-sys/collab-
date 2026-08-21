/**
 * Application Services — orchestrent le pipeline Ingestion → ... → Trend Engine.
 *
 * IngestionService (Phase 1) est implémenté. StoryEngine/TrendEngine/EventEngine
 * restent des CONTRATS à ce stade (Phases 3-5) : chaque étape du diagramme du
 * brief (§4) devient une interface pour pouvoir la tester isolément et remplacer
 * une stratégie (ex: matching heuristique → matching par embeddings) sans
 * toucher à l'orchestrateur. Voir docs/story-engine.md et docs/trend-engine.md.
 */

import type { Article, Entity, Story } from '@briefeed/domain';

export { IngestionService } from './ingestion-service.js';
export type { IngestionServiceDeps, SourceSyncSummary } from './ingestion-service.js';
export { EnrichmentService } from './enrichment-service.js';
export type { EnrichmentServiceDeps, ArticleEnrichmentSummary } from './enrichment-service.js';
export { mapWithConcurrency } from './concurrency.js';

/** Stratégie de matching Story — MVP = heuristique (entités + titre + temps), future = embeddings (pgvector). */
export interface StoryMatchingStrategy {
  scoreCandidate(
    article: Article,
    candidateStory: Story,
    articleEntities: Entity[],
  ): Promise<number>;
}

export interface StoryEngine {
  /** Rattache l'article à une Story existante, ou en crée une nouvelle. Retourne la Story affectée. */
  process(article: Article): Promise<Story>;
}

export interface TrendEngine {
  recalculate(storyId: string): Promise<void>;
}

export interface EventEngine {
  detectEvents(storyId: string): Promise<void>;
}
