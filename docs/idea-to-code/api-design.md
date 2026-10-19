# Developer Logbook: API Design

High-level API design: resources, URLs, and conventions. Payloads, query params, and the OpenAPI spec are designed per slice as each feature is built.

## 1. Versioning

Version in the path: `/api/v1`.

## 2. Conventions

| Topic         | Decision                                              |
| ------------- | ----------------------------------------------------- |
| Format        | JSON (`Content-Type: application/json`)               |
| Naming        | `camelCase`                                           |
| Timestamps    | ISO 8601, UTC                                         |
| Auth          | Bearer access token (`Authorization: Bearer <token>`) |
| Ownership     | Every resource is scoped to the logged-in user        |
| Errors        | `{ "error": { "code", "message", "details?" } }`      |
| Lists         | `{ "data": [...], "meta": {...} }`                    |
| Rate limiting | Global limiter, applied before the router             |
| Health        | `/health`, outside `/v1` (already implemented)        |

## 3. Endpoints

### Auth

| Method | URL                     | Purpose                 |
| ------ | ----------------------- | ----------------------- |
| `POST` | `/api/v1/auth/register` | Sign up                 |
| `POST` | `/api/v1/auth/login`    | Log in                  |
| `POST` | `/api/v1/auth/logout`   | Log out                 |
| `POST` | `/api/v1/auth/refresh`  | Rotate the access token |
| `GET`  | `/api/v1/auth/me`       | Fetch the current user  |

### Logs

| Method   | URL                 | Purpose                                                 |
| -------- | ------------------- | ------------------------------------------------------- |
| `GET`    | `/api/v1/logs`      | List the user's logs (search, filter, sort, pagination) |
| `POST`   | `/api/v1/logs`      | Create a log                                            |
| `GET`    | `/api/v1/logs/{id}` | Fetch one log                                           |
| `PATCH`  | `/api/v1/logs/{id}` | Edit a log                                              |
| `DELETE` | `/api/v1/logs/{id}` | Delete a log                                            |

### Projects, tags, stats

| Method | URL                | Purpose                                     |
| ------ | ------------------ | ------------------------------------------- |
| `GET`  | `/api/v1/projects` | List the user's projects                    |
| `GET`  | `/api/v1/tags`     | List the user's tags                        |
| `GET`  | `/api/v1/stats`    | Total log count and total debugging minutes |

Projects and tags are read-only. They are created through logs.

## 4. Public endpoints

No token needed: `register`, `login`, `refresh`.

All other endpoints require a valid access token.

## 5. Slice plan

Each slice adds its payloads, query params, status codes, and OpenAPI paths when it is built.

| #   | Slice          | Endpoints             |
| --- | -------------- | --------------------- |
| 1   | Auth           | `/auth/*`             |
| 2   | Logs           | `/logs`, `/logs/{id}` |
| 3   | Projects, tags | `/projects`, `/tags`  |
| 4   | Stats          | `/stats`              |
