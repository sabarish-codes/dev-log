# Developer Logbook: Requirements

## 1. Overview

Developers lose hours to the same kinds of problems: a cookie that isn't sent in production, a database connection that fails only inside Docker, a language behavior that surprised them. They fix it, forget it, and months later hit it again and start from zero.

Developer Logbook is a personal engineering memory. It lets you record these moments in under a minute (the error, what happened, and what fixed it) and **find them again in seconds**.

> **Promise:** capture it once, find it when you need it.

### Non-goals

Developer Logbook is not:

- A diary
- A generic notes app
- A place for decisions or learning notes

It only records things that cost you time.

### Where the engineering effort goes

Logging is easy. The value is **retrieval**: finding the right entry quickly as the logbook grows to thousands of entries.

- Auth and CRUD exist so entries can be stored.
- Search, filter, sort, and pagination are the product.

## 2. Actors

| Actor | Description                                          |
| ----- | ---------------------------------------------------- |
| User  | A developer who records and retrieves their own logs |

## 3. Features

### 3.1 Authentication

- JWT-based authentication
- OAuth login

### 3.2 Log Management (CRUD)

- Create, read, update, and delete logs

### 3.3 Retrieval

#### Search

- Keyword
- Multi-keyword
- Exact phrase
- Search across fields
- Typo tolerance

#### Filter

- Type
- Project
- Tags
- Date range
- Any combination of the above

#### Sort

- Newest first
- Oldest first

#### Pagination

- Page navigation
- Results per page
- Result count
- Preserved state (search, filter, sort) across pages
- Empty state with a "clear filters" action

## 4. Log Structure

| Field          | Required | Notes                                                         |
| -------------- | -------- | ------------------------------------------------------------- |
| Title          | Yes      | What you'd search for later                                   |
| Type           | Yes      | `Bug`, `Config`, or `Discovery`                               |
| Error message  | No       | Shown for `Bug` and `Config` only                             |
| What happened  | No       | One box: context, expected vs actual, environment             |
| Fix / Takeaway | Yes      | The solution and why it worked. For `Discovery`, the takeaway |
| Project        | No       | Which project the log belongs to                              |
| Tags           | No       | e.g. `postgres`, `docker`, `auth`                             |
| Links          | No       | Docs, GitHub issues, Stack Overflow                           |
| Date           | No       | When it happened. Defaults to today                           |
| Time spent     | Yes      | Minutes or hours spent debugging                              |

## 5. Versions

### V1: Functional (deployed)

All four retrieval pillars work correctly: search, filter, sort, pagination.
Done when every feature in section 3 works end to end in the deployed app.
No performance targets.

### V2: Measure and optimize at scale

Seed a large dataset, measure V1, then optimize.
Targets are set after the V1 baseline is measured, and are recorded in `docs/performance.md`.
