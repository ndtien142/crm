import { and, eq, isNull } from 'drizzle-orm';
import type { AuthRepository, RefreshSession } from '@firecare/types';
import type { Db } from '../index';
import { refreshSessions } from '../schema';

type Row = typeof refreshSessions.$inferSelect;

function toSession(row: Row): RefreshSession {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: Db) {}

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<RefreshSession> {
    const [row] = await this.db.insert(refreshSessions).values(input).returning();
    return toSession(row!);
  }

  async findSessionByHash(tokenHash: string): Promise<RefreshSession | null> {
    const [row] = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.tokenHash, tokenHash))
      .limit(1);
    return row ? toSession(row) : null;
  }

  async revokeSession(id: string): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(refreshSessions.id, id));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(and(eq(refreshSessions.userId, userId), isNull(refreshSessions.revokedAt)));
  }
}
