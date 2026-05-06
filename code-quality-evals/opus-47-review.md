# Code Quality Review — Claude Opus 4.7 — Actionable Items

## API contract and maintainability

1. Generate a shared API contract from FastAPI's OpenAPI output and consume it
   on the frontend to reduce schema drift risk.
2. Split backend routes into a `routers/` structure before `main.py` becomes a
   larger catch-all module.

## Testing

1. Raise frontend branch coverage, especially around streaming error behavior.

## Error handling and resilience

1. Add client retry or backoff behavior for transient rate-limit failures.
2. Add a circuit breaker around Azure OpenAI failures.
3. Surface Azure SDK retries in logs, or make retry behavior more explicit to
   operators.
4. Surface streaming failures to the frontend with a sentinel token, trailer,
   or equivalent contract instead of relying on truncated responses.
5. Stop silently dropping whitespace-only messages inside mixed requests;
   either reject them consistently or log the discard explicitly.
6. Make `max_retries` configurable through settings instead of hard-coding it.
7. Set an explicit Azure client timeout instead of relying on the SDK default.
8. Document or refactor Azure client caching so test isolation and worker
   behavior are explicit.

## Security and configuration

1. Tighten or explicitly justify wildcard CORS methods and headers.
2. Document `CORS_ALLOWED_ORIGINS` clearly in `.env.example` and fail startup
   in production if it is not set appropriately.

## Documentation

1. Add ADRs for non-obvious architectural choices.
2. Add API request and response examples beyond Swagger.
3. Add short docstrings to nuanced tests where the contract is not obvious.

## Performance and observability

1. Log token usage instead of relying on returned-character counts.
2. Evaluate whether repeated-prompt caching is worthwhile for development or
   demo scenarios.
3. Make the frontend throttle value configurable instead of hard-coded.
4. Add an explicit frontend bundle-size or performance budget in CI.

## Dependency hygiene

1. Decide whether Python dependencies need upper bounds in addition to the
   lockfile and document that policy clearly.
2. Consider adding backend dead-code detection beyond Ruff's unused-import
   checks.
