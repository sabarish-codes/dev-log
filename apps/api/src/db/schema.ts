import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  text,
  primaryKey,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('users_email_lower').on(sql`lower(${table.email})`),
    check('users_username_not_blank', sql`btrim(username) <> ''`),
    check('users_username_not_exceeding', sql`length(username) <= 128`),
    check('users_email_not_blank', sql`btrim(email) <> ''`),
    check('users_email_not_exceeding', sql`length(email) <= 256`),
    check('users_password_hash_not_blank', sql`btrim(password_hash) <> ''`),
    check(
      'users_password_hash_not_exceeding',
      sql`length(password_hash) <= 256`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const projects = pgTable(
  'projects',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('projects_id_user_id_uq').on(table.id, table.userId),
    uniqueIndex('projects_user_name_uq').on(
      table.userId,
      sql`lower(${table.name})`,
    ),
    check('projects_name_not_blank', sql`btrim(name) <> ''`),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export const tags = pgTable(
  'tags',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('tags_id_user_id_uq').on(table.id, table.userId),
    uniqueIndex('tags_user_name_uq').on(
      table.userId,
      sql`lower(${table.name})`,
    ),
    check('tags_name_not_blank', sql`btrim(name) <> ''`),
  ],
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export const logs = pgTable(
  'logs',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: bigint('project_id', { mode: 'number' }),
    title: text('title').notNull(),
    type: text('type').notNull(), // 'bug' | 'error' | 'config' | 'discovery'
    errorMsg: text('error_msg'),
    whatHappened: text('what_happened'),
    fixTakeaway: text('fix_takeaway').notNull(),
    link: text('link'),
    date: date('date')
      .notNull()
      .default(sql`CURRENT_DATE`),
    timespentMinutes: integer('timespent_minutes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()), // Requirement 2: Drizzle auto-update hook
  },
  (table) => [
    index('logs_user_id_idx').on(table.userId),
    index('logs_project_id_idx').on(table.projectId),
    unique('logs_id_user_id_uq').on(table.id, table.userId),
    foreignKey({
      columns: [table.projectId, table.userId],
      foreignColumns: [projects.id, projects.userId],
      name: 'logs_project_user_fk',
    }).onDelete('set null'),
    check('logs_title_not_blank', sql`btrim(title) <> ''`),
    check(
      'logs_type_valid',
      sql`type IN ('bug', 'error', 'config', 'discovery')`,
    ),
    check('logs_fix_takeaway_not_blank', sql`btrim(fix_takeaway) <> ''`),
    check('logs_timespent_positive', sql`timespent_minutes > 0`),
  ],
);

export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;

export const logsTags = pgTable(
  'logs_tags',
  {
    logId: bigint('log_id', { mode: 'number' }).notNull(),
    tagId: bigint('tag_id', { mode: 'number' }).notNull(),
    userId: bigint('user_id', { mode: 'number' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.logId, table.tagId] }),
    index('logs_tags_tag_id_idx').on(table.tagId),
    foreignKey({
      columns: [table.logId, table.userId],
      foreignColumns: [logs.id, logs.userId],
      name: 'logs_tags_log_user_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tagId, table.userId],
      foreignColumns: [tags.id, tags.userId],
      name: 'logs_tags_tag_user_fk',
    }).onDelete('cascade'),
  ],
);

export type LogTag = typeof logsTags.$inferSelect;
export type NewLogTag = typeof logsTags.$inferInsert;
