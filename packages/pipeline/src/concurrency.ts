/**
 * Concurrence bornée, sans dépendance externe. Utilisé pour synchroniser N
 * sources en parallèle sans qu'une source lente en bloque des dizaines d'autres,
 * ni que toutes les sources tapent le réseau en même temps (INGESTION_CONCURRENCY).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await fn(item, index);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker);
  await Promise.all(workers);

  return results;
}
