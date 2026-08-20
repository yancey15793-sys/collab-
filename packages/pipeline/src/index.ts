/**
 * Application Services — orchestrent le pipeline Ingestion → ... → Trend Engine.
 * CONTRAT SEULEMENT à ce stade (Phase 0). Implémentation en Phases 2 à 5.
 *
 * Chaque étape du diagramme du brief (§4) devient une interface `PipelineStage`
 * pour pouvoir la tester isolément et remplacer une stratégie (ex: matching
 * heuristique → matching par embeddings) sans toucher à l'orchestrateur.
 * Voir docs/story-engine.md et docs/trend-engine.md pour le détail des algorithmes proposés.
 */

import type { Article, Entity, Story } from '@briefeed/domain';

/** Stratégie de matching Story — MVP = heuristique (entités + titre + temps), future = embeddings (pgvector). */
export interface StoryMatchingStrategy {
  scoreCandidate(article: Article, candidateStory: Story, articleEntities: Entity[]): Promise<number>;
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
