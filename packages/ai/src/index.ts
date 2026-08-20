/**
 * AI Synthesis — CONTRAT SEULEMENT à ce stade (Phase 0). Implémentation en Phase 6.
 * Voir docs/ai.md pour le pipeline (structured data → context builder → Groq →
 * JSON structuré → validation Zod → persist → render) et la gestion des prompts versionnés.
 */

export * from './schemas.js';

export interface SynthesisContext {
  storyId: string;
  storyTitle: string;
  timeline: Array<{ title: string; timestamp: string }>;
  articles: Array<{ id: string; title: string; sourceName: string; publishedAt: string }>;
}

export interface SynthesisProvider {
  readonly promptVersion: string;
  readonly model: string;
  synthesize(context: SynthesisContext): Promise<unknown>; // validé par aiSummaryContentSchema par l'appelant
}
