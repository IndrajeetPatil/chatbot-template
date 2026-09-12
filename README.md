# Chatbot Template

A minimal full-stack chatbot with a React frontend and FastAPI backend,
streaming replies from Azure OpenAI GPT-6 Astra and GPT-5.6 Sol deployments.

- Light and dark themes, responsive layouts, and keyboard controls.
- Model and reasoning choices, streamed responses, stop, regenerate, and copy.
- Syntax-highlighted code and LaTeX equations in Markdown replies.

## See it in action

A local conversation turns projectile-motion equations into a typed Python
function, showing LaTeX and syntax highlighting in dark and light mode.

[Watch the local demo](docs/demo.md)

[Demo transcript and recording notes](docs/demo.md) ·
[Interface screenshots](docs/frontend.md#interface)

## Quick start

Use Python 3.14, uv 0.12.12, Node.js 24, and pnpm 12.4.1.
Copy `backend/.env.example` to `backend/.env` and set your Azure endpoint,
API key, and API version. The resource needs deployments named `gpt-6-astra`
and `gpt-5.6-sol`.

```bash
(cd backend && uv sync --frozen)
(cd frontend && pnpm install --frozen-lockfile)
```

Run the services in two terminals:

```bash
# Terminal 1
cd backend
uv run fastapi dev app/main.py --host 127.0.0.1 --port 8000
```

```bash
# Terminal 2
cd frontend
pnpm run dev
```

Open [localhost:3000/chat](http://localhost:3000/chat).
See [getting started](docs/getting-started.md) for Docker, runtime pins, and
proxy configuration. Review [deployment security](docs/security.md) before
exposing the app.

## Documentation

| Guide | What you will find |
| --- | --- |
| [Getting started](docs/getting-started.md) | Setup, configuration, local development, Docker |
| [Frontend](docs/frontend.md) | Interface, Markdown rendering, accessibility |
| [Backend](docs/backend.md) | Configuration, API, streaming, validation |
| [Development](docs/development.md) | Commands, testing, coverage, naming, hooks, CI |
| [Security](docs/security.md) | Credentials, deployment boundaries, supply chain, scans |

Run `make qa` for local quality checks and `make hooks` for all pre-commit hooks.
Agent-specific instructions live in [AGENTS.md](AGENTS.md).
