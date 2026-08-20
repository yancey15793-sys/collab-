/**
 * Hiérarchie d'erreurs applicatives partagée entre apps/api et apps/worker.
 * Chaque couche catch et wrap ses erreurs dans un de ces types — jamais de throw
 * de string brute ni de laisser fuiter une erreur d'infra (ex: erreur postgres brute)
 * jusqu'à l'UI. Voir docs/architecture.md §Error Handling.
 */

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Une source RSS est injoignable, malformée, ou dépasse son timeout. Ne doit jamais casser l'ingestion globale. */
export class SourceIngestionError extends AppError {
  readonly code = 'SOURCE_INGESTION_ERROR';
  readonly httpStatus = 502;
}

/** Une ressource (Story, Article, Source...) n'existe pas. */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
}

/** Entrée externe invalide (payload API, RSS malformé, réponse IA hors-schéma). */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
}

/** Groq indisponible, timeout, ou réponse hors-schéma après validation Zod. Ne doit jamais bloquer la lecture des articles. */
export class AiSynthesisError extends AppError {
  readonly code = 'AI_SYNTHESIS_ERROR';
  readonly httpStatus = 502;
}
