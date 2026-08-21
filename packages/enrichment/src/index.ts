/**
 * Enrichissement — étape ENRICHISSEMENT / ENTITY EXTRACTION du pipeline
 * (voir docs/enrichment.md et docs/decisions/0006-groq-entity-extraction-fallback.md).
 *
 * Ce package fournit uniquement des adaptateurs d'infrastructure (extraction
 * de texte → entités structurées), sans dépendance framework. L'orchestration
 * (repositories, statut d'article) vit dans `@briefeed/pipeline` — EnrichmentService.
 *
 * Deux implémentations du même contrat `EntityExtractor`, interchangeables :
 * - GroqEntityExtractor : appel Groq (JSON forcé, validé par Zod)
 * - HeuristicEntityExtractor : gazetteer + séquences capitalisées, aucune I/O
 * ADR-0006 : la seconde sert de repli automatique si la première échoue.
 */

import type { EntityType } from '@briefeed/domain';

export interface ExtractableArticle {
  title: string;
  description: string | null;
  content: string | null;
}

export interface ExtractedEntity {
  name: string;
  normalizedName: string;
  type: EntityType;
  /** Confiance de l'extraction, 0..1 — devient ArticleEntity.confidence. */
  confidence: number;
  description?: string;
}

export interface EntityExtractor {
  /** Identifiant court pour les logs ('groq' | 'heuristic'). */
  readonly name: string;
  extract(article: ExtractableArticle): Promise<ExtractedEntity[]>;
}

export { normalizeEntityName } from './normalize-entity-name.js';
export { HeuristicEntityExtractor } from './heuristic-extractor.js';
export { GroqEntityExtractor } from './groq-extractor.js';
export { extractedEntitiesSchema } from './schema.js';
