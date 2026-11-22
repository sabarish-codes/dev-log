import { asc, eq } from 'drizzle-orm';
import { db } from '../config/drizzle.js';
import { tags } from '../db/schema.js';

export async function getUserTags(userId: number) {
  return await db
    .select({
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
    })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
}
