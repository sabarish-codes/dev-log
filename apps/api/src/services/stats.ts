import { eq, sql } from 'drizzle-orm';
import { db } from '../config/drizzle.js';
import { logs } from '../db/schema.js';
export async function getUserStats(userId: number) {
  const [result] = await db
    .select({
      totalLogs: sql<number>`count(${logs.id})::int`,
      totalTimespentMinutes: sql<number>`coalesce(sum(${logs.timespentMinutes}), 0)::int`,
    })
    .from(logs)
    .where(eq(logs.userId, userId));
  return {
    totalLogs: result?.totalLogs ?? 0,
    totalTimespentMinutes: result?.totalTimespentMinutes ?? 0,
  };
}
