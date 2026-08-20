/**
 * Schémas Zod validant TOUTE sortie Groq avant persistance (règle §22/24 du brief :
 * l'IA n'est jamais la source de vérité, et jamais acceptée aveuglément).
 * Miroir exact de AiSummaryContent (packages/domain/src/types.ts).
 */

import { z } from 'zod';

export const claimConfidenceSchema = z.enum(['CONFIRMED', 'REPORTED', 'UNCERTAIN', 'DISPUTED']);

export const aiSummaryContentSchema = z.object({
  headline: z.string().min(1).max(200),
  summary: z.string().min(1),
  keyPoints: z.array(z.string()).max(10),
  whatChanged: z.string().nullable(),
  claims: z.array(
    z.object({
      text: z.string(),
      confidence: claimConfidenceSchema,
      sourceArticleIds: z.array(z.string().uuid()),
    }),
  ),
  sources: z.array(z.string().uuid()),
});

export type AiSummaryContentParsed = z.infer<typeof aiSummaryContentSchema>;

export const askResponseSchema = z.object({
  answer: z.string(),
  citedStoryIds: z.array(z.string().uuid()),
  citedSourceIds: z.array(z.string().uuid()),
  confidence: claimConfidenceSchema,
});

export type AskResponseParsed = z.infer<typeof askResponseSchema>;
