# Getting started

[Documentation](README.md) · [Project overview](../README.md)

## Prerequisites

Clone the repository and use the pinned runtime and package manager versions:

| Runtime / tool | Version source | Current version |
| --- | --- | --- |
| Python | `backend/.python-version` / `backend/pyproject.toml` | 3.14 |
| uv | `backend/pyproject.toml` / `backend/Dockerfile` | 0.12.12 |
| Node.js | `frontend/package.json` / `frontend/.nvmrc` / frontend Docker image | 24 |
| pnpm | `frontend/package.json` / CI workflows | 12.4.1 |

pnpm 12 reads the Node.js 24 runtime declaration from `package.json`. Package
scripts use the project runtime automatically, even when a different Node.js
version is installed globally. The development container installs the pinned
toolchain; see [local tooling requirements](development.md#file-naming) for hooks.

## Configure Azure

Copy `backend/.env.example` to `backend/.env` and set the Azure Foundry resource
endpoint, API key, and API version. The resource must have deployments named
`gpt-6-astra` and `gpt-5.6-sol`. Never commit credentials.

The app defaults to GPT-6 Astra with low reasoning effort. The model picker also
offers GPT-5.6 Sol; reasoning effort can be low, medium, or high. Requests use
`reasoning_effort` instead of `temperature`, which GPT-6 Astra does not support.
See [backend configuration](backend.md#configuration) for the supported settings.

## Local development

Restore dependencies from the repository root:

```bash
(cd backend && uv sync --frozen)
(cd frontend && pnpm install --frozen-lockfile)
```

Start the backend in one terminal:

```bash
cd backend
uv run fastapi dev app/main.py --host 127.0.0.1 --port 8000
```

Start the frontend in another terminal:

```bash
cd frontend
pnpm run dev
```

Open [the chatbot](http://localhost:3000/chat). The backend is available at
`http://localhost:8000`, with [Swagger UI](http://localhost:8000/docs) for
interactive API exploration. Frontend development binds to all interfaces;
append `--host 127.0.0.1` when access should stay on your machine.

For a production frontend preview, run `make frontend-build`, then
`pnpm run start` from `frontend/`. Alternatively, after building, `make run`
starts both servers in the background and writes `backend.pid` and `frontend.pid`.

The browser talks to `/api/v1/chat` on the frontend origin. Vite proxies `/api`
to `http://localhost:8000` by default. To use a different backend, set the
server-side target before starting Vite from `frontend/`:

```bash
CHAT_API_PROXY_TARGET=https://example.com pnpm run dev
```

The same proxy configuration is used by the production preview.

## Docker Compose

After configuring `backend/.env`, build and run both services:

```bash
docker-compose up --build
```

The frontend container proxies `/api` to the backend container. The backend
hostname is not exposed in browser requests, although Compose publishes port
8000 on the host. Review the [deployment security guidance](security.md) before
exposing either service.

The frontend build is multi-stage: its builder installs `devDependencies` to
run `vite build`, while the final nginx runtime has no `node_modules` or dev
tooling. See [frontend.nginx.conf](../frontend/frontend.nginx.conf) for proxying,
SPA fallback, response headers, caching, and compression.

## Next steps

- Read the [frontend](frontend.md) and [backend](backend.md) guides.
- Run `make qa` and follow the [development guide](development.md) before a PR.
- Use `make update-deps` to refresh dependencies and hook revisions. It also
  checks registry revisions of locked packages so patched artifacts can be
  adopted without changing the declared dependency version.
