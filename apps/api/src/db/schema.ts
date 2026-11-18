import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  text,
  pgTable,
  timestamp,
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
    check('users_username_not_blank', sql`btrim(${table.username}) <> ''`),
    check(
      'users_username_not_exceeding',
      sql`length(${table.username}) <= 128`,
    ),
    check('users_email_not_blank', sql`btrim(${table.email}) <> ''`),
    check('users_email_not_exceeding', sql`length(${table.email}) <= 256`),
    check(
      'users_password_hash_not_blank',
      sql`btrim(${table.passwordHash}) <> ''`,
    ),
    check(
      'users_password_hash_not_exceeding',
      sql`length(${table.passwordHash}) <= 256`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
