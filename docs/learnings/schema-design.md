# Schema Design: What I Learned

Notes from designing the database schema for **Developer Logbook**. Newest entries go at the bottom.

---

## 1. Many-to-many relationships

### The problem

I was stuck on M:N relationships. I thought I needed to store an array of ids in a column, but that approach is poor: the database can't enforce that the ids exist, and querying it is awkward.

### The fix: junction tables

A junction table sits between the two tables and holds one foreign key to each side.

```sql
CREATE TABLE log_tags (
  log_id BIGINT NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (log_id, tag_id)
);
```

- The composite primary key also stops the same tag being attached to a log twice.
- **Foreign key placement:** in a 1:N relationship the foreign key always goes on the _many_ side. In M:N, both foreign keys live in the junction table.

### Inserting: find-or-create + transaction

I was stuck again on how inserts would work. The answer:

1. **Find-or-create:** look up each tag, and create it if it doesn't exist.
2. Insert the log.
3. Insert the rows into the junction table.
4. Wrap all of it in a **transaction**, so a log is never saved with only some of its tags.

---

## 2. Primary key choice

### `bigint`

- 8 bytes, so 2^63 - 1 possible values.
- Preferred when a regular `int` could run out, such as huge counters.
- **Rule:** a foreign key must match its primary key's type. Only a `bigint` foreign key points to a `bigint` primary key.

### `uuidv4`

- Unique ids generated independently, with no central coordinator needed.
- Fully random, so inserts land all over the index. This makes it a poor fit for indexing and slows writes.

### `uuidv7`

- Puts a timestamp at the front of the id, so ids are roughly sequential.
- Index-friendly, because new rows append near the end of the index.

### Comparison

| Type     | Size     | Ordered | Needs coordination          | Index-friendly |
| -------- | -------- | ------- | --------------------------- | -------------- |
| `bigint` | 8 bytes  | Yes     | Yes (database generates it) | Yes            |
| `uuidv4` | 16 bytes | No      | No                          | No             |
| `uuidv7` | 16 bytes | Yes     | No                          | Yes            |

It came down to `bigint` or `uuidv7`.

### Decision: `bigint`

The requirements have no distributed system overhead and no client-side id generation. The app mostly retrieves logs, and that needs to stay fast at scale.

---

## 3. Foreign keys and ON DELETE

### What a foreign key is

A column (or columns) that points to the primary key of another table. It enforces **referential integrity**: a child row can't reference a parent that doesn't exist.

### ON DELETE: what happens to the child when the parent is deleted?

| Option                | Behavior                                                                                                         | Use when                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `NO ACTION` (default) | Blocks deleting a parent that a child still references.                                                          | The parent must never disappear while children exist.               |
| `RESTRICT`            | Same block, but checked immediately. `NO ACTION` can be deferred to the end of a transaction, `RESTRICT` cannot. | You want the failure right away.                                    |
| `CASCADE`             | Deletes all children along with the parent.                                                                      | The child has no meaning without the parent (e.g. `log_tags` rows). |
| `SET NULL`            | Sets the child's foreign key column to `NULL`.                                                                   | The child must survive without the parent. Needs a nullable column. |

> **Careful with `CASCADE`:** it is clean, but it silently deletes data. Use it only when losing the children is truly fine.

### My case: `projects` and `logs`

- `projects` is the parent. `logs` has a `project_id` column pointing to it.
- Users never create a project directly. A project is created **indirectly** when a log names one (find-or-create, same pattern as tags).
- Editing the project name inside a log creates another project internally.
- So projects can only be created, never deleted. There is no delete-project feature.

That narrows it down to `RESTRICT` vs `SET NULL`. Since the project is **optional** and `project_id` is already nullable, I'm choosing `SET NULL`: if a project row is ever removed (manual cleanup, admin work), the logs survive instead of blocking the delete or vanishing.

```sql
ALTER TABLE logs
  ADD COLUMN project_id BIGINT
  REFERENCES projects(id) ON DELETE SET NULL;
```

---

## 4. Constraints

Constraints let the database reject bad data itself, instead of relying on app code to catch it.

| Constraint | What it does                                                           |
| ---------- | ---------------------------------------------------------------------- |
| `NOT NULL` | Prevents null values from being inserted.                              |
| `UNIQUE`   | Makes sure all values in a column are unique. Null values are allowed. |
| `CHECK`    | Checks a custom boolean expression. Keeps the data tight.              |
| `DEFAULT`  | Fallback value used when the column is left out of the insert.         |
| Composite  | A `UNIQUE` (or primary key) across multiple columns.                   |

### Details worth remembering

- **`UNIQUE` and nulls:** in Postgres, nulls count as distinct from each other, so a unique column can hold many nulls.
- **`CHECK` and nulls:** a check passes when the expression evaluates to `NULL`. Pair it with `NOT NULL` if the column must always have a valid value.
- **`DEFAULT`:** applies only when the column is omitted. Explicitly inserting `NULL` does not trigger it.
- **Composite unique:** the _combination_ must be unique, not each column on its own. `UNIQUE (user_id, name)` allows two users to each have a tag called `docker`, but not one user to have it twice.

### In Developer Logbook

```sql
CREATE TABLE logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT        NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN ('Bug', 'Config', 'Discovery')),
  error_message TEXT,
  fix           TEXT        NOT NULL,
  time_spent    INTEGER     NOT NULL CHECK (time_spent > 0),  -- minutes
  logged_on     DATE        NOT NULL DEFAULT CURRENT_DATE,
  -- error message only makes sense for Bug and Config
  CHECK (type <> 'Discovery' OR error_message IS NULL)
);

CREATE TABLE tags (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  name    TEXT   NOT NULL,
  UNIQUE (user_id, name)  -- composite
);
```

---

## 5. Data types

### String

| Type         | Notes                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `char(n)`    | Always pads with spaces up to `n` characters. Avoid it.                                                            |
| `varchar(n)` | Same storage as `text`, plus a length limit. Use it when the limit is a real rule, like a status code or pin code. |
| `text`       | No performance penalty. Holds dynamic values up to 1 GB.                                                           |

**Prefer `text` in most cases.** If you need a length limit, `text` with a `CHECK` does the same job.

### Time

| Type          | Notes                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `timestamp`   | Stores the date and time with no knowledge of time zones. This can cause bugs in distributed systems.            |
| `timestamptz` | Stores an exact moment in time (internally UTC). Postgres converts it to the session time zone when you read it. |

**Prefer `timestamptz` in most cases.**

> `timestamptz` does not remember the time zone you inserted with. It only stores the moment, and the time zone you see comes from the session setting.

### JSON

| Type    | Notes                                                                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `json`  | Stores the text exactly as given, so it has to be parsed on every retrieval. Slow.                                                                                                         |
| `jsonb` | Stores a parsed binary form. Whitespace is removed, key order is not kept, and duplicate keys are dropped. Fast to retrieve, can be indexed (GIN), and supports containment checks (`@>`). |

**Prefer `jsonb` over `json`.** Use `json` only if you must preserve the exact original text.

### Fixed values

Three ways to restrict a column to a set of allowed values:

| Option                     | Pros                                                                                   | Cons                                                              |
| -------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `CHECK (col IN (...))`     | Simplest. Easy to change: drop and re-add the constraint.                              | No separate type, and no table to list the values from.           |
| `ENUM`                     | Type safe and simple. Reusable across tables.                                          | Painful to change: values can be added, but removing one is hard. |
| Lookup table + foreign key | Easy to migrate, since values are just rows. Can carry extra data (label, sort order). | Needs a join to read the value.                                   |

#### Which one to use

- **Values can change without a code deploy, or carry extra data?** Lookup table.
- **Small fixed set used in one column?** `CHECK`. This is the default pick.
- **Same fixed set shared across several tables?** `ENUM`.

```sql
type TEXT NOT NULL CHECK (type IN ('Bug', 'Config', 'Discovery'))
```

---

## 6. Cross-user integrity

### The problem

A plain foreign key checks that the parent exists, not who owns it.

```
logs (project_id = 1, user_id = B)  ──►  projects (id = 1, user_id = A)   -- accepted
```

### The fix: composite foreign keys

```sql
-- parents: projects, tags, logs
unique (id, user_id)

-- child
foreign key (project_id, user_id) references projects (id, user_id)
  on delete set null (project_id)
```

```
Before:  log.project_id ──► projects.id
After:   (log.project_id, log.user_id) ──► (projects.id, projects.user_id)
```

- `unique (id, user_id)` adds no new restriction. Postgres only requires an FK to point at unique columns.
- Null `project_id` skips the check, so logs without a project work.
- `set null (project_id)` nulls only that column. Plain `set null` would also null `user_id` (NOT NULL → error). Needs Postgres 15+.

### Which FKs are composite

```
COMPOSITE   logs → projects, logs_tags → logs, logs_tags → tags
PLAIN       logs / projects / tags → users
```

**Rule:** child points at `users` → plain. Child points at an owned table → composite.

- `logs_tags.user_id` is a copy of the owner, used only for the ownership check. Insert it from the logged-in user, never from the request.
- Test: insert a log for B pointing at A's project. It must fail.

---
