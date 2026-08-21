/**
 * Repli heuristique (ADR-0006) : gazetteer restreint + détection de séquences
 * capitalisées. Beaucoup moins précis qu'un LLM (aucune désambiguïsation
 * sémantique réelle), mais 100% local, gratuit, jamais indisponible — garantit
 * qu'un article ENRICHI a toujours au moins des entités de base, jamais aucune.
 * Pur/testable : aucune I/O.
 */

import type { EntityType } from '@briefeed/domain';
import type { EntityExtractor, ExtractableArticle, ExtractedEntity } from './index.js';
import { normalizeEntityName } from './normalize-entity-name.js';

/** Gazetteer minimal — pas d'ambition d'exhaustivité, juste des cas fréquents en actu tech/business. */
const GAZETTEER: Record<string, EntityType> = {
  google: 'COMPANY',
  microsoft: 'COMPANY',
  apple: 'COMPANY',
  amazon: 'COMPANY',
  meta: 'COMPANY',
  openai: 'COMPANY',
  anthropic: 'COMPANY',
  tesla: 'COMPANY',
  nvidia: 'COMPANY',
  'united states': 'LOCATION',
  usa: 'LOCATION',
  france: 'LOCATION',
  china: 'LOCATION',
  europe: 'LOCATION',
  'european union': 'ORGANIZATION',
  eu: 'ORGANIZATION',
  un: 'ORGANIZATION',
  nato: 'ORGANIZATION',
};

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'from',
  'to',
  'of',
  'and',
  'or',
  'but',
  'as',
  'is',
  'was',
  'are',
  'were',
  'how',
  'why',
  'what',
  'when',
  'where',
  'who',
]);

/** Séquence de 1 à 4 mots commençant par une majuscule, hors ponctuation de fin de phrase. */
const CAPITALIZED_SEQUENCE = /\b([A-Z][a-zA-Z0-9&.'-]*(?:\s+[A-Z][a-zA-Z0-9&.'-]*){0,3})\b/g;

export class HeuristicEntityExtractor implements EntityExtractor {
  readonly name = 'heuristic';

  extract(article: ExtractableArticle): Promise<ExtractedEntity[]> {
    const text = [article.title, article.description, article.content]
      .filter((part): part is string => Boolean(part))
      .join('\n');

    const found = new Map<string, ExtractedEntity>();

    for (const match of text.matchAll(CAPITALIZED_SEQUENCE)) {
      const raw = match[1]?.trim();
      if (!raw) continue;

      const words = raw.split(/\s+/);
      // Un seul mot très commun ("The", "It"...) génère trop de bruit — on l'ignore,
      // sauf s'il matche le gazetteer.
      const normalized = normalizeEntityName(raw);
      if (words.length === 1 && STOPWORDS.has(normalized)) continue;
      if (words.every((w) => STOPWORDS.has(w.toLowerCase()))) continue;

      const gazetteerType = GAZETTEER[normalized];
      if (gazetteerType) {
        found.set(normalized, {
          name: raw,
          normalizedName: normalized,
          type: gazetteerType,
          confidence: 0.75,
        });
        continue;
      }

      // Pas de gazetteer match et un seul mot : trop ambigu pour deviner un type fiable, on ignore.
      if (words.length === 1) continue;

      if (!found.has(normalized)) {
        found.set(normalized, {
          name: raw,
          normalizedName: normalized,
          // Meilleure estimation par défaut sans NER réelle : la plupart des séquences
          // multi-mots capitalisées dans l'actu sont des organisations ou des personnes ;
          // ORGANIZATION est le choix le moins mauvais en l'absence de signal fort.
          type: 'ORGANIZATION',
          confidence: 0.35,
        });
      }
    }

    return Promise.resolve([...found.values()]);
  }
}
