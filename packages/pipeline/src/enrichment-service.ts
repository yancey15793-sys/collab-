/**
 * EnrichmentService — Application Service orchestrant l'étape ENRICHISSEMENT /
 * ENTITY EXTRACTION : pour chaque article INGESTED, extrait les entités
 * (extracteur primaire, repli automatique si échec — ADR-0006), les persiste
 * (findOrCreate + lien ArticleEntity), puis fait passer l'article à ENRICHED
 * (ou FAILED si les deux extracteurs échouent).
 *
 * Règle absolue, comme IngestionService : l'échec d'UN article (extraction
 * hors-ligne, entité malformée...) ne doit jamais interrompre le traitement
 * des autres — voir mapWithConcurrency plus bas.
 */

import type { Article, ArticleRepository, EntityRepository } from '@briefeed/domain';
import type { EntityExtractor, ExtractedEntity } from '@briefeed/enrichment';
import { mapWithConcurrency } from './concurrency.js';

export interface EnrichmentServiceDeps {
  /** Tenté en premier (ex: GroqEntityExtractor). */
  primaryExtractor: EntityExtractor;
  /** Utilisé si le primaire échoue (ex: HeuristicEntityExtractor) — jamais absent en pratique. */
  fallbackExtractor: EntityExtractor;
  articleRepository: ArticleRepository;
  entityRepository: EntityRepository;
  concurrency: number;
}

export interface ArticleEnrichmentSummary {
  articleId: string;
  extractorUsed: string;
  entitiesLinked: number;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage: string | null;
}

export class EnrichmentService {
  constructor(private readonly deps: EnrichmentServiceDeps) {}

  /** Traite jusqu'à `batchSize` articles INGESTED en attente. */
  async enrichPending(batchSize: number): Promise<ArticleEnrichmentSummary[]> {
    const articles = await this.deps.articleRepository.listByStatus('INGESTED', batchSize);
    return mapWithConcurrency(articles, this.deps.concurrency, (article) =>
      this.enrichArticle(article),
    );
  }

  async enrichArticle(article: Article): Promise<ArticleEnrichmentSummary> {
    const input = {
      title: article.title,
      description: article.description,
      content: article.content,
    };

    let extracted: ExtractedEntity[];
    let extractorUsed = this.deps.primaryExtractor.name;
    try {
      extracted = await this.deps.primaryExtractor.extract(input);
    } catch {
      extractorUsed = this.deps.fallbackExtractor.name;
      try {
        extracted = await this.deps.fallbackExtractor.extract(input);
      } catch (err) {
        await this.safeUpdateStatus(article.id, 'FAILED');
        return {
          articleId: article.id,
          extractorUsed,
          entitiesLinked: 0,
          status: 'FAILURE',
          errorMessage: err instanceof Error ? err.message : String(err),
        };
      }
    }

    let entitiesLinked = 0;
    for (const candidate of extracted) {
      try {
        const entity = await this.deps.entityRepository.findOrCreate({
          type: candidate.type,
          name: candidate.name,
          normalizedName: candidate.normalizedName,
          description: candidate.description ?? null,
        });
        await this.deps.articleRepository.linkEntity({
          articleId: article.id,
          entityId: entity.id,
          confidence: candidate.confidence,
        });
        entitiesLinked += 1;
      } catch {
        // Une entité malformée/en conflit ne doit pas faire échouer les autres.
      }
    }

    await this.safeUpdateStatus(article.id, 'ENRICHED');
    return {
      articleId: article.id,
      extractorUsed,
      entitiesLinked,
      status: 'SUCCESS',
      errorMessage: null,
    };
  }

  private async safeUpdateStatus(articleId: string, status: Article['status']): Promise<void> {
    try {
      await this.deps.articleRepository.updateStatus(articleId, status);
    } catch {
      // Ne doit jamais masquer/aggraver le résultat réel de l'extraction.
    }
  }
}
