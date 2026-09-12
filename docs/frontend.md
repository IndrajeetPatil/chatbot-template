# Frontend

[Documentation](README.md) · [Project overview](../README.md)

The Vite React app uses the Vercel AI SDK for chat state and streamed replies.
The browser sends requests to `/api/v1/chat` on the same origin; see the
[backend guide](backend.md) for the request and streaming contract.

## Interface

| Light mode                                                                | Dark mode                                                               |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| ![Chatbot Template light mode UI](images/chatbot-template-light.png) | ![Chatbot Template dark mode UI](images/chatbot-template-dark.png) |

The UI is built with [Material
UI](https://mui.com/material-ui/getting-started/) components, with a restrained
light/dark palette, locally bundled Geist typography, and responsive layouts.
It takes interaction cues from Vercel's [AI Elements](https://elements.ai-sdk.dev/)
while keeping one UI toolkit. Suggested prompts start a conversation; the
composer exposes model and reasoning choices, message validation, and a stop
action backed by the AI SDK. Enter inserts a new line; Ctrl+Enter or Cmd+Enter
sends. Replies follow the scroll position until the reader scrolls up, with a
"Jump to latest" action to resume following. Copy actions sit below replies so
they do not obscure the text.

## Markdown and math

Assistant replies use `react-markdown` with `rehype-highlight` (highlight.js)
for language-tagged code fences and `remark-math` / `rehype-katex` for LaTeX.
The backend asks the model to use these supported Markdown delimiters.
Syntax colors adapt to the selected light/dark theme. Common languages such as
JavaScript, TypeScript, Python, SQL, and CSS are supported; unknown or unlabelled
fences remain readable plain code. Use `$E = mc^2$` for inline math and `$$` on
separate lines for display equations (or a `math` code fence). KaTeX supports a
[documented subset of LaTeX](https://katex.org/docs/supported); `\(...\)` and
`\[...\]` delimiters are not parsed. Escape literal currency dollars as `\$`.
Code contents stay literal, and copying a reply preserves its original Markdown.
KaTeX styles/fonts are bundled locally, raw HTML is not enabled, and trusted
KaTeX commands are disabled. Incomplete or invalid math remains readable while
streaming and renders once valid. Wide code and display equations scroll
horizontally within the reply.

## Accessibility and web standards

Frontend interface work uses Vercel's [Web Interface
Guidelines](https://vercel.com/design/guidelines) as the review baseline for
new and changed UI. Treat those guidelines as the target for interaction
details such as keyboard operability, visible focus states, loading and error
states, reduced-motion support, resilient layout, semantic controls, and
concise action copy.

The project targets **WCAG 2.1 Level AA** compliance. Reviewers should test
against WCAG 2.1 AA success criteria across the four POUR principles
(Perceivable, Operable, Understandable, and Robust). Lighthouse CI enforces a
perfect score (100%) for accessibility, best-practices, and SEO, with
performance at ≥ 85% as a hard failure. A separate axe-powered contrast audit
checks WCAG AA colour contrast in both light and dark mode. Automated checks do
not cover every AA criterion, so manual verification is also required for new UI.

The app has also been reviewed against [The Website
Specification](https://specification.website/checklist/), a broad checklist of
web good practices. The relevant items — document foundations, security
response headers, nginx caching and compression, and PWA metadata — are
implemented in `frontend/index.html`, `frontend/frontend.nginx.conf`, and
`frontend/app/favicon/site.webmanifest`. The SEO, internationalisation, and
agent-readiness categories are intentionally out of scope for an internal
chatbot SPA. Deferred items to revisit if deployment changes: HSTS (depends on
where TLS terminates), and shipping fonts as WOFF2.

## Working on the frontend

Run `pnpm run dev` from `frontend/` for hot reload, or use `make frontend-build`
and `pnpm run start` for a production preview. Both use port 3000.
See [getting started](getting-started.md) for proxy configuration and Docker.

Run `make qa-frontend` for frontend checks. Follow the
[browser and visual testing workflow](development.md#browser-and-visual-tests)
after UI changes, and read the [Fallow policy](development.md#frontend-code-quality-with-fallow)
before changing analysis scope or dependencies.
