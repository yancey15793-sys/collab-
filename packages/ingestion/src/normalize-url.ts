/**
 * Déduplication niveau 2 (docs/ingestion.md) : normalisation d'URL.
 * Retire les paramètres de tracking connus, le trailing slash, force le host
 * en minuscules — sans changer la sémantique de la page pointée.
 */

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
]);

export function normalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    // URL malformée : on la retourne telle quelle, l'appelant décide si c'est fatal.
    return rawUrl.trim();
  }

  url.hostname = url.hostname.toLowerCase();
  url.protocol = url.protocol.toLowerCase();

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  // Ordonne les params restants pour que deux URLs équivalentes normalisent pareil.
  url.searchParams.sort();

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  url.hash = '';

  return url.toString();
}
