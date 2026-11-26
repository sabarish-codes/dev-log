import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
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
      const uniqueTagNames = normalizeTagNames(input.tags);

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

export interface GetLogsParams {
  q?: string;
  type?: 'bug' | 'error' | 'config' | 'discovery';
  project?: string;
  tags?: string[];
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export function parseSearchWords(q?: string): string[] {
  if (!q || !q.trim()) return [];
  return q.trim().split(/\s+/).filter(Boolean);
}
export function normalizeTagNames(rawTags: string[]): string[] {
  return Array.from(
    new Map(
      rawTags
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => [t.toLowerCase(), t]),
    ).values(),
  );
}

export async function getLogs(userId: number, params: GetLogsParams) {
  const conditions = [eq(logs.userId, userId)];
  // 1. Search (q): every word must match in title, errorMsg, whatHappened, or fixTakeaway
  if (params.q && params.q.trim()) {
    const words = parseSearchWords(params.q);
    for (const word of words) {
      const pattern = `%${escapeLike(word)}%`;
      conditions.push(
        sql`(${logs.title} ilike ${pattern} or ${logs.errorMsg} ilike ${pattern} or ${logs.whatHappened} ilike ${pattern} or ${logs.fixTakeaway} ilike ${pattern})`,
      );
    }
  }
  // 2. Filters
  if (params.type) {
    conditions.push(eq(logs.type, params.type));
  }
  if (params.project && params.project.trim()) {
    const cleanProject = params.project.trim();
    conditions.push(
      sql`exists (
        select 1 from ${projects}
        where ${projects.id} = ${logs.projectId}
          and lower(${projects.name}) = lower(${cleanProject})
      )`,
    );
  }
  if (params.tags && params.tags.length > 0) {
    const lowerTags = params.tags
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (lowerTags.length > 0) {
      conditions.push(
        sql`exists (
          select 1 from ${logsTags}
          inner join ${tags} on ${logsTags.tagId} = ${tags.id}
          where ${logsTags.logId} = ${logs.id}
            and lower(${tags.name}) in (${sql.join(
              lowerTags.map((t) => sql`${t}`),
              sql`, `,
            )})
        )`,
      );
    }
  }
  if (params.from) {
    conditions.push(gte(logs.date, params.from));
  }
  if (params.to) {
    conditions.push(lte(logs.date, params.to));
  }
  const whereClause = and(...conditions);
  // 3. Sort (newest vs oldest with id as stable tiebreaker)
  const isOldest = params.sort === 'oldest';
  const orderBy = isOldest
    ? [asc(logs.date), asc(logs.id)]
    : [desc(logs.date), desc(logs.id)];
  // 4. Pagination
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 10));
  const offset = (page - 1) * limit;
  // Run COUNT and List query
  const [[countResult], rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(logs)
      .where(whereClause),
    db
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
      })
      .from(logs)
      .leftJoin(projects, eq(logs.projectId, projects.id))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
  ]);
  const total = countResult?.total ?? 0;
  if (rows.length === 0) {
    return {
      data: [],
      meta: { total, page, limit },
    };
  }
  // 5. Batch-fetch tags for the page in 1 single query
  const logIds = rows.map((r) => r.id);
  const tagRows = await db
    .select({
      logId: logsTags.logId,
      tagName: tags.name,
    })
    .from(logsTags)
    .innerJoin(tags, eq(logsTags.tagId, tags.id))
    .where(inArray(logsTags.logId, logIds));
  const tagsByLogId = new Map<number, string[]>();
  for (const tr of tagRows) {
    const list = tagsByLogId.get(tr.logId) || [];
    list.push(tr.tagName);
    tagsByLogId.set(tr.logId, list);
  }
  const logsWithTags = rows.map((r) => ({
    ...r,
    tags: tagsByLogId.get(r.id) || [],
  }));
  return {
    data: logsWithTags,
    meta: { total, page, limit },
  };
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

export interface UpdateLogInput {
  title?: string;
  type?: 'bug' | 'error' | 'config' | 'discovery';
  errorMsg?: string | null;
  whatHappened?: string | null;
  fixTakeaway?: string;
  link?: string | null;
  date?: string;
  timespentMinutes?: number;
  project?: string | null;
  tags?: string[];
}
export async function updateLog(
  userId: number,
  logId: number,
  input: UpdateLogInput,
) {
  return await db.transaction(async (tx) => {
    // 1. Check ownership
    const [existing] = await tx
      .select({ id: logs.id, projectId: logs.projectId })
      .from(logs)
      .where(and(eq(logs.id, logId), eq(logs.userId, userId)))
      .limit(1);
    if (!existing) {
      throw new AppError('Log not found', 404);
    }
    // 2. Handle Project update
    let projectId = existing.projectId;
    let projectName: string | null = null;
    if (input.project !== undefined) {
      if (input.project && input.project.trim()) {
        const cleanProject = input.project.trim();
        const [p] = await tx
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(
            and(
              eq(projects.userId, userId),
              sql`lower(${projects.name}) = lower(${cleanProject})`,
            ),
          )
          .limit(1);
        if (p) {
          projectId = p.id;
          projectName = p.name;
        } else {
          const [newP] = await tx
            .insert(projects)
            .values({ userId, name: cleanProject })
            .returning({ id: projects.id, name: projects.name });
          projectId = newP.id;
          projectName = newP.name;
        }
      } else {
        projectId = null;
        projectName = null;
      }
    } else if (projectId) {
      const [p] = await tx
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      projectName = p?.name ?? null;
    }
    // 3. Update Log fields
    const updateFields: Record<string, unknown> = {};
    if (input.title !== undefined) updateFields.title = input.title.trim();
    if (input.type !== undefined) updateFields.type = input.type;
    if (input.errorMsg !== undefined)
      updateFields.errorMsg = input.errorMsg?.trim() || null;
    if (input.whatHappened !== undefined)
      updateFields.whatHappened = input.whatHappened?.trim() || null;
    if (input.fixTakeaway !== undefined)
      updateFields.fixTakeaway = input.fixTakeaway.trim();
    if (input.link !== undefined)
      updateFields.link = input.link?.trim() || null;
    if (input.date !== undefined) updateFields.date = input.date;
    if (input.timespentMinutes !== undefined)
      updateFields.timespentMinutes = input.timespentMinutes;
    if (input.project !== undefined) updateFields.projectId = projectId;
    let updatedLog;
    if (Object.keys(updateFields).length > 0) {
      const [res] = await tx
        .update(logs)
        .set(updateFields)
        .where(and(eq(logs.id, logId), eq(logs.userId, userId)))
        .returning();
      updatedLog = res;
    } else {
      const [res] = await tx
        .select()
        .from(logs)
        .where(and(eq(logs.id, logId), eq(logs.userId, userId)))
        .limit(1);
      updatedLog = res;
    }
    // 4. Replace Tags in the same transaction
    let resultTags: string[] = [];
    if (input.tags !== undefined) {
      await tx
        .delete(logsTags)
        .where(and(eq(logsTags.logId, logId), eq(logsTags.userId, userId)));
      const uniqueTagNames = normalizeTagNames(input.tags);
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
        await tx.insert(logsTags).values({ logId, tagId, userId });
        resultTags.push(finalTagName);
      }
    } else {
      const existingTags = await tx
        .select({ name: tags.name })
        .from(logsTags)
        .innerJoin(tags, eq(logsTags.tagId, tags.id))
        .where(eq(logsTags.logId, logId));
      resultTags = existingTags.map((t) => t.name);
    }
    return {
      ...updatedLog,
      project: projectName,
      tags: resultTags,
    };
  });
}

export async function deleteLog(userId: number, logId: number) {
  const [deleted] = await db
    .delete(logs)
    .where(and(eq(logs.id, logId), eq(logs.userId, userId)))
    .returning({ id: logs.id });
  if (!deleted) {
    throw new AppError('Log not found', 404);
  }
  return deleted;
}
