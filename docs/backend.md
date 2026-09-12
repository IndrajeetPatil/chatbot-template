# Backend

[Documentation](README.md) · [Project overview](../README.md)

The FastAPI service validates chat requests and streams Azure OpenAI text to
the React frontend. The monorepo keeps it separate from the Vite/nginx frontend;
both development and Docker use a same-origin `/api` proxy in front of it.
See [getting started](getting-started.md) to run the services.

## Source map

| File | Responsibility |
| --- | --- |
| [main.py](../backend/app/main.py) | FastAPI routes, request validation, CORS, rate limiting, Markdown instructions |
| [azure_client.py](../backend/app/azure_client.py) | Cached Azure client, streaming completions, logging |
| [config.py](../backend/app/config.py) | Environment settings and startup validation |
| [entities.py](../backend/app/entities.py) | Model, reasoning effort, and message role enums |
| [tests](../backend/tests) | Unit and property-based tests |

## Configuration

Settings read environment variables and `backend/.env` when started from the
backend directory. Azure values must be nonempty unless `TESTING=true`.

| Variable | Meaning / default |
| --- | --- |
| `AZURE_OPENAI_ENDPOINT` | Azure resource endpoint; required |
| `AZURE_OPENAI_API_KEY` | Azure resource key; required, server-side only |
| `AZURE_OPENAI_API_VERSION` | Azure API version; the example uses `2024-09-01-preview` |
| `CORS_ALLOWED_ORIGINS` | JSON list; defaults to `["http://localhost:3000"]` |
| `CHAT_RATE_LIMIT` | Per-client-address chat limit; defaults to `10/minute` |
| `TESTING` | Defaults to `false`; permits missing credentials in tests, without mocking Azure |

`DEBUG` and `ALLOWED_HOSTS` in the example environment file are not consumed by
the current settings model; they do not enable debug mode or host filtering.
Settings and the Azure client are cached: restart the backend after changes.

## API

| Endpoint | Behavior |
| --- | --- |
| `GET /health` | Returns `{"status":"ok"}`; does not contact Azure |
| `POST /api/v1/chat` | Streams the assistant response as `text/plain; charset=utf-8` |
| `GET /docs` | Interactive Swagger UI |
| `GET /openapi.json` | Generated OpenAPI schema |

Example request body:

```json
{
  "messages": [{ "role": "user", "content": "Explain Python generators." }],
  "model": "gpt-6-astra",
  "reasoning_effort": "low"
}
```

The frontend's AI SDK messages can instead provide text parts:

```json
{
  "messages": [
    { "role": "user", "parts": [{ "type": "text", "text": "Explain gravity." }] }
  ]
}
```

Requests accept 1–50 messages, up to 50 text parts per message, and at most
32,000 characters per message, including joined parts. `content` takes precedence
when both representations are present. Accepted roles are `system`, `user`, and
`assistant`. Whitespace-only messages are omitted; an entirely empty conversation
returns HTTP 400 before the stream starts. Schema violations return HTTP 422;
rate-limit failures return HTTP 429.

Models are `gpt-6-astra` (default) and `gpt-5.6-sol`; reasoning effort is `low`
(default), `medium`, or `high`. The server prepends Markdown formatting
instructions so code and equations match the [frontend renderer](frontend.md).

The response is a plain-text stream consumed by `TextStreamChatTransport`, not
SSE or a JSON envelope. Azure failures are logged and re-raised; failures after
response headers have been sent interrupt the stream rather than becoming a
new JSON error response. Preserve validation before stream startup.

## Checks

Run `make qa-backend` for naming, Ruff, ty, dependency audit, tests, and type
coverage. `make backend-validate-api-schema` validates schema generation without
Azure credentials. `make backend-load-test` starts FastAPI and Locust against
the local API; chat load can consume Azure quota.

Backend line and branch coverage must remain 100%, as must type annotation
coverage. See [development](development.md) for the shared policies and
[security](security.md) for credential and deployment boundaries.
