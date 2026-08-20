/**
 * Story Lifecycle — machine à états pure (aucune I/O, aucune dépendance).
 * Appelée périodiquement par le worker (Phase 3+) pour chaque Story active,
 * et après chaque rattachement d'article.
 *
 * Transitions autorisées :
 *
 *   DISCOVERED → ACTIVE     (une 2e source corrobore)
 *   ACTIVE     → DEVELOPING (volume d'articles en forte hausse — cf. Trend Engine)
 *   DEVELOPING → STABLE     (le flux ralentit mais la story reste récente)
 *   STABLE     → DORMANT    (aucune activité depuis STORY_DORMANT_AFTER_HOURS)
 *   DORMANT    → ACTIVE     (reprise d'activité — une story dormante peut se réveiller)
 *   DORMANT    → ARCHIVED   (aucune activité depuis STORY_ARCHIVE_AFTER_DAYS)
 *   STABLE     → ARCHIVED   (cas direct si l'inactivité dépasse le seuil d'archivage)
 */

import type { StoryStatus } from './types.js';

export interface StoryLifecycleSignals {
  currentStatus: StoryStatus;
  sourceCount: number;
  hoursSinceLastUpdate: number;
  /** Ratio articles(dernières 3h) / articles(3h précédentes). >1 = accélération. */
  articleVelocityRatio: number;
  dormantAfterHours: number;
  archiveAfterHours: number;
}

export function nextStoryStatus(signals: StoryLifecycleSignals): StoryStatus {
  const {
    currentStatus,
    sourceCount,
    hoursSinceLastUpdate,
    articleVelocityRatio,
    dormantAfterHours,
    archiveAfterHours,
  } = signals;

  // Archivage : priorité sur tout le reste, quel que soit l'état courant (sauf déjà archivé).
  if (currentStatus !== 'ARCHIVED' && hoursSinceLastUpdate >= archiveAfterHours) {
    return 'ARCHIVED';
  }

  switch (currentStatus) {
    case 'DISCOVERED':
      return sourceCount >= 2 ? 'ACTIVE' : 'DISCOVERED';

    case 'ACTIVE':
      if (hoursSinceLastUpdate >= dormantAfterHours) return 'DORMANT';
      return articleVelocityRatio > 1.5 ? 'DEVELOPING' : 'ACTIVE';

    case 'DEVELOPING':
      if (hoursSinceLastUpdate >= dormantAfterHours) return 'DORMANT';
      return articleVelocityRatio <= 1.0 ? 'STABLE' : 'DEVELOPING';

    case 'STABLE':
      return hoursSinceLastUpdate >= dormantAfterHours ? 'DORMANT' : 'STABLE';

    case 'DORMANT':
      // Reprise d'activité : nouvel article récent (hoursSinceLastUpdate proche de 0).
      return hoursSinceLastUpdate < 1 ? 'ACTIVE' : 'DORMANT';

    case 'ARCHIVED':
      return 'ARCHIVED'; // état terminal — pas de réanimation automatique

    default: {
      const exhaustive: never = currentStatus;
      throw new Error(`Unhandled story status: ${String(exhaustive)}`);
    }
  }
}
