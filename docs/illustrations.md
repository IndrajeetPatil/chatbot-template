# Documentation illustrations

These illustrations summarize the request path and quality gates. Technical
details remain in the linked documentation and are the source of truth.

## Chatbot architecture

![Browser requests pass through Vite or nginx to FastAPI and Azure OpenAI, with streamed replies returning through each layer and credentials staying server-side](images/chatbot-template-architecture.webp)

- **File:** `docs/images/chatbot-template-architecture.webp`
- **Prompt:** A wide, polished technical infographic showing Browser → Frontend
  proxy → FastAPI backend → Azure OpenAI. Show React and Material UI in the
  browser, Vite and nginx at the proxy, validation, rate limiting, and formatting
  in FastAPI, and server-side Azure credentials connected only to FastAPI. Show
  the request flowing right and the text stream returning left through all four
  stages. Use a clean white canvas, pale green and blue panels, navy outlines,
  and restrained teal and blue arrows. Include recognizable product logos and
  simple interface icons. Set the exact labels to Browser, Frontend proxy,
  FastAPI backend, Azure OpenAI, React · Material UI, Vite · nginx, POST
  /api/v1/chat, Text deltas, Plain-text stream, Streamed reply, and Server-side
  credentials.
- **Icon source:** Generated as part of the illustration; labels and surrounding
  documentation carry the technical meaning.

## Quality harness

![Local entry points and GitHub Actions feed six groups of code, structure, behavior, browser, security, and convention checks, with coverage floors](images/chatbot-template-quality-harness.webp)

- **File:** `docs/images/chatbot-template-quality-harness.webp`
- **Prompt:** A landscape editorial infographic with two inputs—local entry
  points (`make qa`, `make hooks`, focused targets) and GitHub Actions (QA,
  tests, security, Docker)—feeding six equally weighted groups: Code & types
  (Ruff, Oxlint, ty, TypeScript); Structure (Fallow, CSS quality); Behavior
  (pytest, Vitest, OpenAPI); Browser & accessibility (Playwright, axe,
  Lighthouse); Security & supply chain (Gitleaks, Checkov, Trivy); Conventions
  & evidence (prek, rumdl, ls-lint, coverage). Preserve the documented backend
  and frontend coverage thresholds. Use pale green and blue panels, navy text,
  readable labels, and small tool icons.
- **Icon source:** Generated as part of the illustration; labels and surrounding
  documentation carry the technical meaning.
