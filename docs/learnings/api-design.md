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
