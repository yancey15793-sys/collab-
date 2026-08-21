/**
 * Extraction d'entités via Groq (JSON forcé, validé par Zod — ADR-0006).
 * Toute panne (réseau, timeout, JSON hors-schéma) lève AiSynthesisError plutôt
 * que de retourner un résultat partiel silencieux — c'est à l'appelant
 * (EnrichmentService) de décider du repli vers HeuristicEntityExtractor.
 */

import { AiSynthesisError } from '@briefeed/shared';
import type { EntityExtractor, ExtractableArticle, ExtractedEntity } from './index.js';
import { normalizeEntityName } from './normalize-entity-name.js';
import { extractedEntitiesSchema } from './schema.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `Tu extrais les entités nommées d'un article de presse.
Réponds UNIQUEMENT en JSON valide de la forme :
{"entities":[{"name":"...","type":"PERSON|COMPANY|ORGANIZATION|LOCATION|PRODUCT|SPORT|EVENT","confidence":0.0-1.0}]}
Règles :
- Maximum 15 entités, les plus importantes pour comprendre le sujet de l'article.
- "name" doit être la forme telle qu'elle apparaît dans le texte (pas de traduction).
- "confidence" reflète ta certitude sur le TYPE assigné, pas sur l'existence de l'entité.
- N'invente aucune entité absente du texte.`;

export class GroqEntityExtractor implements EntityExtractor {
  readonly name = 'groq';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
  ) {}

  async extract(article: ExtractableArticle): Promise<ExtractedEntity[]> {
    const text = [article.title, article.description, article.content]
      .filter((part): part is string => Boolean(part))
      .join('\n\n')
      .slice(0, 6000); // borne le coût/latence par article — au-delà, le titre+description suffit

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
        }),
      });

      if (!response.ok) {
        throw new AiSynthesisError(
          `Groq HTTP ${response.status}`,
          await response.text().catch(() => undefined),
        );
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = body.choices?.[0]?.message?.content;
      if (!raw) {
        throw new AiSynthesisError('Groq response missing message content');
      }

      const parsed = extractedEntitiesSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        throw new AiSynthesisError('Groq response failed schema validation', parsed.error);
      }

      return parsed.data.entities.map((e) => ({
        name: e.name,
        normalizedName: normalizeEntityName(e.name),
        type: e.type,
        confidence: e.confidence,
      }));
    } catch (err) {
      if (err instanceof AiSynthesisError) throw err;
      throw new AiSynthesisError('Groq entity extraction failed', err);
    } finally {
      clearTimeout(timer);
    }
  }
}
