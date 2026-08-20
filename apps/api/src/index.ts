/**
 * Briefeed API — squelette Phase 0.
 *
 * Règle architecturale absolue (brief §6) : aucune logique métier ici.
 * Les routes (Phase 7, voir docs/api.md) ne font qu'appeler des Application
 * Services (packages/pipeline) qui dépendent d'interfaces de repository
 * (packages/domain) implémentées par packages/db. Ce fichier ne fait, pour
 * l'instant, que démarrer le serveur et exposer un healthcheck.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';

const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? '0.0.0.0';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });

  app.get('/health', async () => ({ status: 'ok', service: 'briefeed-api' }));

  // Les routes /api/stories, /api/trends, /api/sources, /api/ask... arrivent
  // en Phase 7, après validation du Story Engine et du Trend Engine (Phases 3-5).

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Briefeed API', err);
  process.exit(1);
});
