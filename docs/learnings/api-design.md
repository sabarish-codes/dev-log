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
