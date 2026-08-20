import { eq } from 'drizzle-orm';
import type { Source, SourceRepository } from '@briefeed/domain';
import type { Database } from '../client.js';
import { sources } from '../schema.js';

export class DrizzleSourceRepository implements SourceRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Source | null> {
    const [row] = await this.db.select().from(sources).where(eq(sources.id, id)).limit(1);
    return row ?? null;
  }

  async findActive(): Promise<Source[]> {
    return this.db.select().from(sources).where(eq(sources.active, true));
  }

  async create(source: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<Source> {
    const [row] = await this.db.insert(sources).values(source).returning();
    if (!row) throw new Error('Failed to create source');
    return row;
  }

  async update(id: string, patch: Partial<Source>): Promise<Source> {
    const [row] = await this.db
      .update(sources)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(sources.id, id))
      .returning();
    if (!row) throw new Error(`Source ${id} not found`);
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sources).where(eq(sources.id, id));
  }
}
