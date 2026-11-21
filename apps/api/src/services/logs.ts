import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../config/drizzle.js';
import { logs, logsTags, projects, tags } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';

export interface CreateLogInput {
  title: string;
  type: 'bug' | 'error' | 'config' | 'discovery';
  errorMsg?: string | null;
  whatHappened?: string | null;
  fixTakeaway: string;
  link?: string | null;
  date: string; // YYYY-MM-DD
  timespentMinutes: number;
  project?: string | null;
  tags?: string[];
}

export async function createLog(userId: number, input: CreateLogInput) {
  return await db.transaction(async (tx) => {
    // 1. Find-or-create Project (case-insensitive)
    let projectId: number | null = null;
    let projectName: string | null = null;

    if (input.project && input.project.trim()) {
      const cleanProject = input.project.trim();
      const [existingProject] = await tx
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(
          and(
            eq(projects.userId, userId),
            sql`lower(${projects.name}) = lower(${cleanProject})`,
          ),
        )
        .limit(1);

      if (existingProject) {
        projectId = existingProject.id;
        projectName = existingProject.name;
      } else {
        const [newProject] = await tx
          .insert(projects)
          .values({ userId, name: cleanProject })
          .returning({ id: projects.id, name: projects.name });
        projectId = newProject.id;
        projectName = newProject.name;
      }
    }

    // 2. Insert Log
    const [newLog] = await tx
      .insert(logs)
      .values({
        userId,
        projectId,
        title: input.title.trim(),
        type: input.type,
        errorMsg: input.errorMsg?.trim() || null,
        whatHappened: input.whatHappened?.trim() || null,
        fixTakeaway: input.fixTakeaway.trim(),
        link: input.link?.trim() || null,
        date: input.date,
        timespentMinutes: input.timespentMinutes,
      })
      .returning();

    // 3. Find-or-create Tags & attach to junction table
    const resultTags: string[] = [];
    if (input.tags && input.tags.length > 0) {
      // Deduplicate tags case-insensitively
      const uniqueTagNames = Array.from(
        new Map(
          input.tags
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => [t.toLowerCase(), t]),
        ).values(),
      );

      for (const tagName of uniqueTagNames) {
        const [existingTag] = await tx
          .select({ id: tags.id, name: tags.name })
          .from(tags)
          .where(
            and(
              eq(tags.userId, userId),
              sql`lower(${tags.name}) = lower(${tagName})`,
            ),
          )
          .limit(1);

        let tagId: number;
        let finalTagName: string;

        if (existingTag) {
          tagId = existingTag.id;
          finalTagName = existingTag.name;
        } else {
          const [newTag] = await tx
            .insert(tags)
            .values({ userId, name: tagName })
            .returning({ id: tags.id, name: tags.name });
          tagId = newTag.id;
          finalTagName = newTag.name;
        }

        // Link in junction table
        await tx.insert(logsTags).values({
          logId: newLog.id,
          tagId,
          userId,
        });

        resultTags.push(finalTagName);
      }
    }

    return {
      ...newLog,
      project: projectName,
      tags: resultTags,
    };
  });
}

export async function getLogs(userId: number) {
  return await db
    .select({
      id: logs.id,
      userId: logs.userId,
      projectId: logs.projectId,
      project: projects.name,
      title: logs.title,
      type: logs.type,
      errorMsg: logs.errorMsg,
      whatHappened: logs.whatHappened,
      fixTakeaway: logs.fixTakeaway,
      link: logs.link,
      date: logs.date,
      timespentMinutes: logs.timespentMinutes,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
      tags: sql<string[]>`coalesce(
        json_agg(distinct ${tags.name}) filter (where ${tags.name} is not null),
        '[]'::json
      )`,
    })
    .from(logs)
    .leftJoin(projects, eq(logs.projectId, projects.id))
    .leftJoin(logsTags, eq(logs.id, logsTags.logId))
    .leftJoin(tags, eq(logsTags.tagId, tags.id))
    .where(eq(logs.userId, userId))
    .groupBy(logs.id, projects.name)
    .orderBy(desc(logs.date), desc(logs.createdAt));
}

export async function getLogById(userId: number, logId: number) {
  const [log] = await db
    .select({
      id: logs.id,
      userId: logs.userId,
      projectId: logs.projectId,
      project: projects.name,
      title: logs.title,
      type: logs.type,
      errorMsg: logs.errorMsg,
      whatHappened: logs.whatHappened,
      fixTakeaway: logs.fixTakeaway,
      link: logs.link,
      date: logs.date,
      timespentMinutes: logs.timespentMinutes,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
      tags: sql<string[]>`coalesce(
        json_agg(distinct ${tags.name}) filter (where ${tags.name} is not null),
        '[]'::json
      )`,
    })
    .from(logs)
    .leftJoin(projects, eq(logs.projectId, projects.id))
    .leftJoin(logsTags, eq(logs.id, logsTags.logId))
    .leftJoin(tags, eq(logsTags.tagId, tags.id))
    .where(and(eq(logs.id, logId), eq(logs.userId, userId)))
    .groupBy(logs.id, projects.name)
    .limit(1);
  if (!log) {
    throw new AppError('Log not found', 404);
  }
  return log;
}
