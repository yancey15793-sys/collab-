/**
 * Déduplication niveau 3 (docs/ingestion.md) : hash de contenu.
 * Pur, testable sans I/O.
 */

import { createHash } from 'node:crypto';

export function computeArticleHash(params: {
  sourceId: string;
  normalizedTitle: string;
  publishedAt: Date;
}): string {
  const raw = `${params.sourceId}::${params.normalizedTitle}::${params.publishedAt.toISOString()}`;
  return createHash('sha256').update(raw).digest('hex');
}

/** Normalise un titre pour le hash : minuscules, espaces compressés, ponctuation de bord retirée. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}
