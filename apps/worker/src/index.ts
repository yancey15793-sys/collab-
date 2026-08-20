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
  DrizzleSourceRepository,
  DrizzleSourceSyncLogRepository,
} from '@briefeed/db';
import { NodeRssAtomFetcher } from '@briefeed/ingestion';
import { IngestionService, mapWithConcurrency } from '@briefeed/pipeline';

const INTERVAL_MS = Number(process.env.INGESTION_INTERVAL_MINUTES ?? 15) * 60_000;
const TIMEOUT_MS = Number(process.env.INGESTION_TIMEOUT_MS ?? 10_000);
const CONCURRENCY = Number(process.env.INGESTION_CONCURRENCY ?? 5);

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
