import { eq } from 'drizzle-orm';
import type { SourceSyncLog, SourceSyncLogRepository } from '@briefeed/domain';
import type { Database } from '../client.js';
import { sourceSyncLogs } from '../schema.js';

export class DrizzleSourceSyncLogRepository implements SourceSyncLogRepository {
  constructor(private readonly db: Database) {}

  async start(sourceId: string): Promise<SourceSyncLog> {
    const [row] = await this.db
      .insert(sourceSyncLogs)
      .values({ sourceId, articlesFetched: 0, articlesNew: 0 })
      .returning();
    if (!row) throw new Error('Failed to start source sync log');
    return row;
  }

  async finish(
    id: string,
    patch: Omit<SourceSyncLog, 'id' | 'sourceId' | 'startedAt'>,
  ): Promise<void> {
    await this.db
      .update(sourceSyncLogs)
      .set({ ...patch, finishedAt: patch.finishedAt ?? new Date() })
      .where(eq(sourceSyncLogs.id, id));
  }
}
