FROM python:3.15-slim-trixie@sha256:533b0b2f9b5d46fd097091cf826f27902f1d6c3bca714b6dc74551356aa97a51 AS builder

COPY --from=ghcr.io/astral-sh/uv:0.13.5@sha256:32a7bb39b496babbd997b0a39a4d66c126bdaf5661b302bf6f06abda8deca6ff /uv /bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev

FROM python:3.15-slim-trixie@sha256:533b0b2f9b5d46fd097091cf826f27902f1d6c3bca714b6dc74551356aa97a51 AS runtime

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY app /app/app

# Dependencies are installed by uv in the builder; omit unused system pip and
# its separately vendored packages from the runtime image.
RUN python -m pip uninstall --yes pip \
    && addgroup --system app && adduser --system --ingroup app app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    CORS_ALLOWED_ORIGINS='["http://localhost:3000"]'

EXPOSE 8000

USER app

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
