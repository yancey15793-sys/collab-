/**
 * Connexion PostgreSQL (Drizzle + postgres-js). Créée paresseusement — importer
 * ce module ne se connecte pas immédiatement, seule la première requête le fait.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export function createDbClient(databaseUrl: string): Database {
  const client = postgres(databaseUrl, { max: 10 });
  return drizzle(client, { schema });
}
