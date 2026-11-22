import { asc, eq } from 'drizzle-orm';
import { db } from '../config/drizzle.js';
import { projects } from '../db/schema.js';

export async function getUserProjects(userId: number) {
  return await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.name));
}
