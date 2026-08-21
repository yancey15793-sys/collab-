/**
 * Briefeed Worker — Phase 1 : ingestion RSS/Atom.
 *
 * Processus séparé de l'API : tourne sur un intervalle configurable
 * (INGESTION_INTERVAL_MINUTES) pour ne jamais bloquer les requêtes HTTP de
 * l'API. StoryEngine/TrendEngine/AI Synthesis rejoindront ce cycle en Phases 3-6.
 */

import {
  createDbClient,
  DrizzleArticleRepository,
  DrizzleEntityRepository,
  DrizzleSourceRepository,
  DrizzleSourceSyncLogRepository,
} from '@briefeed/db';
import {
  GroqEntityExtractor,
  HeuristicEntityExtractor,
  type EntityExtractor,
} from '@briefeed/enrichment';
import { NodeRssAtomFetcher } from '@briefeed/ingestion';
import { EnrichmentService, IngestionService, mapWithConcurrency } from '@briefeed/pipeline';

const INTERVAL_MS = Number(process.env.INGESTION_INTERVAL_MINUTES ?? 15) * 60_000;
const TIMEOUT_MS = Number(process.env.INGESTION_TIMEOUT_MS ?? 10_000);
const CONCURRENCY = Number(process.env.INGESTION_CONCURRENCY ?? 5);
const ENRICHMENT_CONCURRENCY = Number(process.env.ENRICHMENT_CONCURRENCY ?? 3);
const ENRICHMENT_BATCH_SIZE = Number(process.env.ENRICHMENT_BATCH_SIZE ?? 50);

function log(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ service: 'briefeed-worker', ...payload }));
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log({
      level: 'error',
      stage: 'startup',
      message:
        'DATABASE_URL manquant — voir docs/decisions/0007-postgres-dev-environment.md. ' +
        'Le worker ne peut pas démarrer sans base de données.',
    });
    process.exit(1);
  }

  const db = createDbClient(databaseUrl);
  const ingestionService = new IngestionService({
    fetcher: new NodeRssAtomFetcher(),
    sourceRepository: new DrizzleSourceRepository(db),
    articleRepository: new DrizzleArticleRepository(db),
    syncLogRepository: new DrizzleSourceSyncLogRepository(db),
    timeoutMs: TIMEOUT_MS,
  });
  const sourceRepository = new DrizzleSourceRepository(db);

  // ADR-0006 : Groq si une clé est configurée, sinon l'heuristique sert de
  // primaire ET de repli directement — inutile de tenter un appel réseau
  // voué à l'échec à chaque article tant qu'aucune clé n'est fournie.
  const heuristicExtractor = new HeuristicEntityExtractor();
  const groqApiKey = process.env.GROQ_API_KEY;
  const primaryExtractor: EntityExtractor = groqApiKey
    ? new GroqEntityExtractor(
        groqApiKey,
        process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
        TIMEOUT_MS,
      )
    : heuristicExtractor;
  if (!groqApiKey) {
    log({
      level: 'warn',
      stage: 'startup',
      message:
        "GROQ_API_KEY manquant — extraction d'entités en mode heuristique uniquement (ADR-0006).",
    });
  }
  const enrichmentService = new EnrichmentService({
    primaryExtractor,
    fallbackExtractor: heuristicExtractor,
    articleRepository: new DrizzleArticleRepository(db),
    entityRepository: new DrizzleEntityRepository(db),
    concurrency: ENRICHMENT_CONCURRENCY,
  });

  async function runCycle() {
    const startedAt = Date.now();
    const sources = await sourceRepository.findActive();
    log({ stage: 'cycle_start', sourceCount: sources.length });

    const summaries = await mapWithConcurrency(sources, CONCURRENCY, (source) =>
      ingestionService.syncSource(source),
    );

    for (const summary of summaries) {
      log({ stage: 'source_sync', ...summary });
    }

    log({
      stage: 'cycle_end',
      durationMs: Date.now() - startedAt,
      sourcesProcessed: summaries.length,
      failures: summaries.filter((s) => s.status === 'FAILURE').length,
    });

    await runEnrichment();
  }

  async function runEnrichment() {
    const startedAt = Date.now();
    const summaries = await enrichmentService.enrichPending(ENRICHMENT_BATCH_SIZE);

    for (const summary of summaries) {
      log({ stage: 'article_enrichment', ...summary });
    }

    log({
      stage: 'enrichment_end',
      durationMs: Date.now() - startedAt,
      articlesProcessed: summaries.length,
      failures: summaries.filter((s) => s.status === 'FAILURE').length,
    });
  }

  await runCycle();
  setInterval(() => {
    runCycle().catch((err) => log({ level: 'error', stage: 'cycle', error: String(err) }));
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error('Briefeed worker crashed', err);
  process.exit(1);
});
