/**
 * Briefeed Worker — squelette Phase 0.
 *
 * Processus séparé de l'API : l'ingestion et le pipeline (Story Engine, Trend
 * Engine, AI Synthesis) tournent ici, sur un intervalle configurable
 * (INGESTION_INTERVAL_MINUTES), pour ne jamais bloquer les requêtes HTTP de l'API.
 * Implémentation réelle en Phases 1-6 — voir docs/architecture.md.
 */

const INTERVAL_MS = Number(process.env.INGESTION_INTERVAL_MINUTES ?? 15) * 60_000;

async function runCycle() {
  // TODO Phase 1+ : pour chaque source active (isolée, try/catch individuel) :
  //   fetch → validate → parse → normalize → sanitize → deduplicate → persist
  //   puis Story Engine → Event Engine → Trend Engine → AI Synthesis.
  // eslint-disable-next-line no-console
  console.log('[worker] cycle placeholder — pipeline not yet implemented (Phase 1)');
}

async function main() {
  await runCycle();
  setInterval(() => {
    void runCycle();
  }, INTERVAL_MS);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Briefeed worker crashed', err);
  process.exit(1);
});
