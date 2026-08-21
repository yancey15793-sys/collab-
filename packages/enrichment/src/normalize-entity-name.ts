/** Normalise un nom d'entite pour la deduplication ((normalizedName, type) est unique en base). */
export function normalizeEntityName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diacritiques (e.g. "e" accents -> plain)
    .replace(/\s+/g, ' ');
}
