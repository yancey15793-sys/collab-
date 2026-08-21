import { z } from 'zod';

/** Doit rester synchronisé avec EntityType (packages/domain/src/types.ts) — pas d'import croisé de type vers valeur ici, valeurs dupliquées volontairement. */
const entityTypeSchema = z.enum([
  'PERSON',
  'COMPANY',
  'ORGANIZATION',
  'LOCATION',
  'PRODUCT',
  'SPORT',
  'EVENT',
]);

/** Sortie JSON forcée attendue de Groq — rejetée (pas de fallback silencieux) si hors-schéma, voir ADR-0006. */
export const extractedEntitiesSchema = z.object({
  entities: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        type: entityTypeSchema,
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(30),
});

export type ExtractedEntitiesPayload = z.infer<typeof extractedEntitiesSchema>;
