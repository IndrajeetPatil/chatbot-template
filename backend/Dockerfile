FROM python:3.14-slim-trixie@sha256:44dd04494ee8f3b538294360e7c4b3acb87c8268e4d0a4828a6500b1eff50061

# Install system dependencies and build tools first
# Clean up apt cache in the same layer to keep image size down
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.11.23@sha256:d0a0a753ab981624b49c97abc98821c1c09f4ca69d1ef5cee69c501be3d88479 /uv /bin/uv

WORKDIR /app

COPY . /app/

RUN uv sync --frozen --no-dev

RUN addgroup --system app && adduser --system --ingroup app app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    CORS_ALLOWED_ORIGINS='["http://localhost:3000"]'

EXPOSE 8000

USER app

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
