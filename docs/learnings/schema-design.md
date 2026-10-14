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
