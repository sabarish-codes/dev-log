# API Design: What I Learned

Notes from designing the API for **Developer Logbook**. Newest entries go at the bottom.

---

## 1. Designing an API in layers

API design is easier when it is split into layers, each answering one question. Working through them in order keeps the design predictable.

```
1. HTTP        →  what the protocol gives me
2. REST        →  how to model the system on top of it
3. URL         →  how clients address things
4. Payload     →  what the data looks like
5. Collection  →  how list endpoints behave
6. API-wide    →  what applies to every endpoint
7. OpenAPI     →  how I document it all
```

| #   | Layer                 | What it is                                                                                                                                                                                                      |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **HTTP**              | The request-response protocol of the web. Its methods, status codes, and headers are tools to use in the design, not details to work around.                                                                    |
| 2   | **REST**              | An architectural style for client-server applications, built on **resources** and **statelessness**: each request carries everything the server needs, and the server keeps no client session between requests. |
| 3   | **URL**               | Clean, intuitive URL design makes an API predictable. A client should be able to guess an endpoint.                                                                                                             |
| 4   | **Payload**           | How data is structured in requests and responses (JSON).                                                                                                                                                        |
| 5   | **Collection**        | The rules for endpoints that return lists: **pagination**, **filtering**, **sorting**, and **search**. Decide these once so every list endpoint behaves the same way.                                           |
| 6   | **API-wide concerns** | Cross-cutting requirements that apply to the entire API, not to one endpoint. Examples: authentication, error format, versioning, rate limiting.                                                                |
| 7   | **OpenAPI**           | A standard format for describing REST APIs: endpoints, methods, status codes, request payloads, and responses. It can also generate documentation, client code, and validation.                                 |

> **Why the order matters:** each layer limits the next. HTTP gives the vocabulary, REST says how to use it, URLs and payloads are the concrete shape, collection rules keep lists consistent, API-wide concerns cover everything else, and OpenAPI records the result.

---

## 2. HTTP

HTTP is the request-response protocol of the web. Its messages follow a strict layout (text-based in HTTP/1.1; HTTP/2 and 3 carry the same structure in binary).

```
Request  = Method + URL + HTTP version + Headers + optional Body
Response = HTTP version + Status code + Headers + optional Body
```

### Stateless

Every request from the client is treated as independent. The server keeps no client session between requests, so each request must carry a **token or cookie** that proves who the client is. That is how a "session" is mimicked on top of a stateless protocol.

> Stateless does not mean the server stores nothing. Data still lives in the database. It means the server doesn't remember _the client's previous requests_ to handle the current one.

### Methods

The method tells the **intent** of the request.

| Method   | Intent                                                                                  |
| -------- | --------------------------------------------------------------------------------------- |
| `GET`    | Retrieve a representation of a resource.                                                |
| `POST`   | Create a new resource, or trigger a server-side action.                                 |
| `PUT`    | Replace an existing resource entirely, or create it if it doesn't exist at a known URL. |
| `PATCH`  | Apply a partial modification to a resource.                                             |
| `DELETE` | Remove a resource.                                                                      |

### Safe and idempotent

- **Safe:** the method does not modify server state. `GET` is the main example (also `HEAD` and `OPTIONS`).
- **Idempotent:** making the same request multiple times leaves the server in the same state as making it once.

| Method   | Safe | Idempotent |
| -------- | ---- | ---------- |
| `GET`    | Yes  | Yes        |
| `PUT`    | No   | Yes        |
| `DELETE` | No   | Yes        |
| `POST`   | No   | No         |
| `PATCH`  | No   | Depends    |

- Every safe method is also idempotent, but not the other way around.
- `DELETE` is idempotent because the end state is the same: the resource is gone. The response can differ (`204` the first time, `404` after).
- `PATCH` depends on the operation. "Set title to X" is idempotent, "increment count" is not.
- `POST` is not idempotent: sending it twice can create two resources.

### Status codes

The first digit gives the class.

| Class | Meaning                                  |
| ----- | ---------------------------------------- |
| `1xx` | Informational (rarely handled directly). |
| `2xx` | Success.                                 |
| `3xx` | Redirection: further action is needed.   |
| `4xx` | Client-side error.                       |
| `5xx` | Server-side error.                       |

#### 2xx: success

| Code             | Meaning                     | Typical use           |
| ---------------- | --------------------------- | --------------------- |
| `200 OK`         | Standard success.           | `GET`, `PUT`, `PATCH` |
| `201 Created`    | A resource was created.     | `POST`                |
| `204 No Content` | Success, nothing to return. | `DELETE`              |

#### 4xx: client errors

| Code                       | Meaning                                                                    | Typical use                  |
| -------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `400 Bad Request`          | Malformed request or payload.                                              | Invalid JSON, wrong types    |
| `401 Unauthorized`         | Missing or invalid credentials. Really means "unauthenticated".            | No token, expired token      |
| `403 Forbidden`            | Authenticated, but not allowed to access this.                             | Accessing another user's log |
| `404 Not Found`            | Resource doesn't exist.                                                    | Unknown log id               |
| `409 Conflict`             | The request conflicts with the current state.                              | Email already registered     |
| `422 Unprocessable Entity` | Valid syntax and JSON, but the content fails validation or business rules. | Time spent is negative       |
| `429 Too Many Requests`    | Rate limit exceeded.                                                       | Too many login attempts      |

#### 5xx: server errors

| Code                        | Meaning                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| `500 Internal Server Error` | Unexpected server-side error.                                                   |
| `503 Service Unavailable`   | Server temporarily unable to handle requests (overload, crash, or maintenance). |

### Headers

| Header          | Purpose                                                                                |
| --------------- | -------------------------------------------------------------------------------------- |
| `Content-Type`  | Tells the receiving end what type of content is in the body (e.g. `application/json`). |
| `Authorization` | Where the client carries its authentication info (e.g. `Bearer <token>`).              |
| `Location`      | Sent by the server, usually with `201`, giving the exact URL of the created resource.  |

---

## 3. URL and REST API design

A URL is the address of a resource. REST is the style that says an API is made of resources, each with its own URL, and the HTTP method says what to do with it. So REST API design is mostly URL design: first understand the parts of a URL, then apply the REST rules to them.

```
GET    /orders/42    →  read order 42
DELETE /orders/42    →  remove order 42
```

### URL anatomy

A URL points to a specific resource on a server.

```
https://api.example.com/v1/orders/42?status=open
└─┬──┘   └─────┬─────┘ └────┬─────┘ └────┬────┘
scheme       host        path        query string
```

| Part               | What it is                                                     | Example                          |
| ------------------ | -------------------------------------------------------------- | -------------------------------- |
| **Scheme**         | Protocol used to access the resource.                          | `https`                          |
| **Host / domain**  | Server hosting the API.                                        | `api.example.com`                |
| **Path**           | Hierarchical route to the resource.                            | `/v1/orders`                     |
| **Path parameter** | A variable embedded in the path to identify one unique item.   | `/v1/orders/{id}`                |
| **Query string**   | Key-value pairs after `?`, used to filter, sort, and paginate. | `/v1/orders?category=electronic` |

### REST

REST is an architectural style for client-server applications, based on **resources** and **statelessness**.

- **Resource:** a thing the API exposes (a user, an order, a log). It is a noun and has its own URL.
- **Representation:** the client never touches the resource itself, only a representation of it, usually JSON.
- **Method = action:** the URL says _what_, the HTTP method says _what to do with it_.
- **Stateless:** every request carries everything the server needs (see section 2).

### Design rules

#### Naming

- Use **plural, lowercase nouns** for resources.
- Use **hyphens** for multi-word resources.

```
/users
/order-items
```

- A collection and one of its items share the same base: `/orders` and `/orders/{id}`.
- **No verbs in the path.** The HTTP method already states the action.

| Don't                    | Do                  |
| ------------------------ | ------------------- |
| `GET /getOrders`         | `GET /orders`       |
| `POST /createOrder`      | `POST /orders`      |
| `DELETE /deleteOrder/42` | `DELETE /orders/42` |

#### Exception: actions

Some operations can't be expressed by the HTTP methods. For these, a verb is allowed at the end of the path, usually with `POST`.

```
POST /payments/{id}/refund
```

> Before using an action endpoint, check whether it can be modeled as a resource instead. `POST /payments/{id}/refunds` creates a refund, which keeps the URL noun-only and gives you something to `GET` later.

#### Parameters

| Type             | Used for                        | Example                      |
| ---------------- | ------------------------------- | ---------------------------- |
| **Path params**  | Uniquely finding one resource.  | `/orders/{id}`               |
| **Query params** | Filtering, sorting, pagination. | `/orders?sort=-price&page=2` |

- A leading `-` in `sort` is a common convention for descending order, so `-price` means highest price first.

#### Nesting

Nest paths only when they represent a **strong parent-child hierarchy**. Maximum depth is **2**. Prefer shallow.

```
/projects/{projectId}/logs             ✅ depth 2
/users/{userId}/projects/{id}/logs     ❌ too deep
```

- Once a child has a unique id, address it directly: `/logs/{id}` instead of `/projects/{projectId}/logs/{id}`.
- Deep paths force clients to know every ancestor id and make the API harder to change.

---

## 4. Payload design

Payload design is the structure of the data that travels in the request and response bodies. Predictable payloads mean clients never have to guess.

### Format

- For web APIs, **JSON** is the usual choice.
- Declare it with the header `Content-Type: application/json`, on requests with a body and on responses.

### Naming: camelCase

- `camelCase` is the industry standard for JSON keys: `timeSpent`, `errorMessage`, `createdAt`.
- Pick one convention and use it everywhere. Mixing `camelCase` and `snake_case` is the real mistake.
- The database uses `snake_case` (`time_spent`), so the mapping happens once, at the API boundary.

### Dates and times

Standardize on **ISO 8601** strings, always in **UTC**.

| Kind      | Format                 | Example                  |
| --------- | ---------------------- | ------------------------ |
| Timestamp | `YYYY-MM-DDTHH:mm:ssZ` | `"2026-10-20T08:30:00Z"` |
| Date only | `YYYY-MM-DD`           | `"2026-10-20"`           |

- The trailing `Z` means UTC. Never send a timestamp without a zone.
- The server stores and returns UTC (`timestamptz`), and the client converts to the user's local time for display.
- Don't send epoch numbers or custom formats like `20/10/2026`, which are ambiguous.
- Use date-only for values with no time of day, like a log's date.

### Bare data vs envelope

Two ways to shape a response.

**Bare data:** the body is the resource itself.

```json
{ "id": 42, "title": "Cookie not sent in production" }
```

**Envelope:** the data is wrapped, with room for metadata beside it.

```json
{
  "data": [{ "id": 42, "title": "Cookie not sent in production" }],
  "meta": { "total": 312, "page": 2, "limit": 20 }
}
```

|          | Pros                                   | Cons                                                    |
| -------- | -------------------------------------- | ------------------------------------------------------- |
| Bare     | Simple, less nesting.                  | Nowhere to add metadata later without breaking clients. |
| Envelope | Extensible: pagination, counts, links. | Slightly more verbose.                                  |

- Lists usually need metadata (result count, page), so they fit the envelope.
- Whichever you choose, **use it consistently** across every endpoint.

### Predictable error schema

Every error, from any endpoint, has the same shape. The client then needs one error handler.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "timeSpent", "message": "Must be greater than 0" }]
  }
}
```

| Field     | Purpose                                                               |
| --------- | --------------------------------------------------------------------- |
| `code`    | Stable machine-readable identifier. Clients branch on this.           |
| `message` | Human-readable summary. Can change without breaking clients.          |
| `details` | Optional list of specific problems, like per-field validation errors. |

- Match the HTTP status code to the error: `422` for validation, `404` for a missing log, and so on (see section 2).
- Never leak internals (stack traces, SQL) in an error body.
- There is also a standard, **RFC 9457 Problem Details** (`application/problem+json`). Worth knowing, but a simple custom schema is fine if it stays consistent.

---

## 5. Collection design

### Why

A **collection** = an endpoint that returns a **list** (`GET /orders`).

```
Without rules                    With rules
─────────────                    ──────────
every list endpoint              every list endpoint
has its own params         →     uses the same params
client must learn each           client learns once
```

**Goal:** the same params mean the same thing everywhere.

---

### The flow

Every list request goes through the same steps, in this order:

```
Request
   │
   ▼
1. Validate params   → bad? stop, return 400
   │
   ▼
2. Search            (q)
   │
   ▼
3. Filter            (type, status, dates...)
   │
   ▼
4. Sort              (sort)
   │
   ▼
5. Paginate          (page, perPage)
   │
   ▼
Response = data + meta
```

---

### The 4 pillars

| Pillar     | Question              | Param               |
| ---------- | --------------------- | ------------------- |
| Search     | Contains these words? | `q=cookie`          |
| Filter     | Has these attributes? | `status=open`       |
| Sort       | In what order?        | `sort=-date`        |
| Pagination | Which slice?          | `page=2&perPage=20` |

All are **query params**, all **optional**, all combine.

```
GET /orders?q=shoes&status=open&sort=-date&page=2&perPage=20
```

---

### Rule for every param

Each param needs 4 things. Missing one = guessing.

| Name      | Type    | Default | Limit               |
| --------- | ------- | ------- | ------------------- |
| `page`    | integer | `1`     | min 1               |
| `perPage` | integer | `20`    | max 100             |
| `sort`    | enum    | `-date` | allowed fields only |
| `q`       | string  | none    | max 200 chars       |

> No params at all must still work. Defaults make that possible.

---

### Invalid params

```
page=abc          →  400
perPage=500       →  400
sort=banana       →  400
unknown param     →  400
```

**Reject, don't fix silently.** Silent fixing hides client bugs.

---

### Filtering

**Rule: OR inside one field, AND between fields.**

```
GET /orders?status=open,paid&city=chennai

(status = open OR paid)  AND  (city = chennai)
└────── one field ──────┘      └─ other field ─┘
```

| Case                    | Example                                 |
| ----------------------- | --------------------------------------- |
| Exact match             | `status=open`                           |
| Multi-value (one field) | `status=open,paid`                      |
| Multiple fields         | `status=open&city=chennai`              |
| Range                   | `dateFrom=2026-01-01&dateTo=2026-10-20` |

- Range ends are **inclusive**. Either end can be used alone.
- Multi-value format: **comma-separated**. Pick one format and use it everywhere.

#### Any vs all

Only matters for fields where one item has **many** values (like tags).

```
tags=a,b

any → has a OR b      (wider result)
all → has a AND b     (narrower result)
```

Add a param (`match=any|all`) with a default.

---

### Search

```
q=shoes            one word
q=red shoes        both words (AND)
q="red shoes"      exact phrase
```

- Searches **many fields** at once.
- Case-insensitive.
- Empty `q` = no search.
- Combines with filters using **AND**.

**Typo tolerance** = fuzzy match (`cokie` finds `cookie`). The API only exposes `q`. How it's done inside can change later.

---

### Sorting

```
sort=date     →  oldest first   (ascending)
sort=-date    →  newest first   (descending)
```

- `-` prefix = descending.
- Accept **only allowed fields**. Never paste input into `ORDER BY`.
- **Add a tiebreaker** (`id`). Without it, equal values can repeat or vanish across pages.

```
ORDER BY date DESC, id DESC
```

---

### Pagination

Never return everything. Return a slice.

#### Offset (page number)

```
page=3, perPage=20  →  skip 40, take 20

[ 1-20 ][ 21-40 ][ 41-60 ]...
  p1       p2       p3
```

| Good             | Bad                                               |
| ---------------- | ------------------------------------------------- |
| Simple           | Slow on deep pages (reads then discards rows)     |
| Jump to any page | Shifts when rows are added (duplicates or misses) |
| Easy total count | Count query is costly at scale                    |

#### Cursor (keyset)

"Give me 20 rows **after this row**."

```
page 1 → last row: (date=10 Oct, id=42)
page 2 → cursor = that row
         WHERE (date, id) < (10 Oct, 42)
```

| Good                       | Bad                      |
| -------------------------- | ------------------------ |
| Fast on any page           | No jump to page N        |
| Stable when rows are added | Hard to show total pages |
|                            | More complex             |

#### Which one?

```
Need page numbers / jump / total?  →  Offset
Huge data / infinite scroll?       →  Cursor
Not sure?                          →  Start offset, measure, switch if slow
```

---

### Response shape

```json
{
  "data": [ ... ],
  "meta": {
    "total": 312,
    "page": 2,
    "perPage": 20,
    "totalPages": 16
  }
}
```

- `total` = matches for the current filters, not the whole table.
- `page` and `perPage` = the values actually used, including defaults.
- Cursor version: `meta` has `nextCursor` and `hasMore` instead.

---

### Empty result

```
No matches  →  200 OK + "data": [] + total: 0
```

- **Not an error.** `404` means the endpoint doesn't exist, not that a search found nothing.
- A page past the last one → also `200` with empty `data`.

---

### Keeping state across pages

The API is **stateless**, so the server forgets between requests.

```
Client sends ALL params on EVERY request
Client keeps them in its URL (refresh, back button and shared links work)
```

- Search, filter, or sort changes → reset `page` to 1.
- "Clear filters" = request with no params (defaults apply).

---

### Design checklist (use this on any requirement)

Ask these for each need:

| Need            | Questions                                                                |
| --------------- | ------------------------------------------------------------------------ |
| **Search**      | Which fields? One word, many, or exact phrase? Typos allowed?            |
| **Filter**      | Which fields? One value or many? Any or all? Ranges?                     |
| **Sort**        | Which fields allowed? Default order? Tiebreaker?                         |
| **Pagination**  | Page numbers needed? Total needed? Data size? Default and max `perPage`? |
| **Every param** | Name? Type? Default? Limit? What if invalid?                             |
| **Response**    | What goes in `meta`? What does empty look like?                          |
