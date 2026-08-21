import { and, eq } from 'drizzle-orm';
import type { Entity, EntityRepository } from '@briefeed/domain';
import type { Database } from '../client.js';
import { entities } from '../schema.js';

export class DrizzleEntityRepository implements EntityRepository {
  constructor(private readonly db: Database) {}

  async findByNormalizedName(normalizedName: string): Promise<Entity | null> {
    const [row] = await this.db
      .select()
      .from(entities)
      .where(eq(entities.normalizedName, normalizedName))
      .limit(1);
    return row ?? null;
  }

  async create(entity: Omit<Entity, 'id'>): Promise<Entity> {
    const [row] = await this.db.insert(entities).values(entity).returning();
    if (!row) throw new Error('Failed to create entity');
    return row;
  }

  /**
   * Idempotent : (normalizedName, type) est unique en base (voir schema.ts).
   * En cas de course entre deux appels concurrents, le conflit retombe sur une
   * lecture plutôt que de propager l'erreur de contrainte unique.
   */
  async findOrCreate(entity: Omit<Entity, 'id'>): Promise<Entity> {
    const [row] = await this.db
      .select()
      .from(entities)
      .where(
        and(eq(entities.normalizedName, entity.normalizedName), eq(entities.type, entity.type)),
      )
      .limit(1);
    if (row) return row;

    try {
      return await this.create(entity);
    } catch {
      const [existing] = await this.db
        .select()
        .from(entities)
        .where(
          and(eq(entities.normalizedName, entity.normalizedName), eq(entities.type, entity.type)),
        )
        .limit(1);
      if (existing) return existing;
      throw new Error(`Failed to find or create entity ${entity.normalizedName}/${entity.type}`);
    }
  }
}
