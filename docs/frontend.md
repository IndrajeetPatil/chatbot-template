# Frontend

[Documentation](README.md) · [Project overview](../README.md)

React/Vite provides the interface; the Vercel AI SDK manages chat state and
streaming. See [request routing](getting-started.md#request-routing) and the
[backend contract](backend.md#api).

## Interface

| Light mode                                                           | Dark mode                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ![Chatbot Template light mode UI](images/chatbot-template-light.png) | ![Chatbot Template dark mode UI](images/chatbot-template-dark.png) |

| Area                  | Behavior                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Design                | [Material UI](https://mui.com/material-ui/getting-started/), local Geist fonts, responsive light/dark layouts |
| Interaction reference | [AI Elements](https://elements.ai-sdk.dev/), while retaining one UI toolkit                                   |
| Getting started       | Suggested prompts open a conversation                                                                         |
| Composer              | Model/reasoning choices, message validation, stop generation                                                  |
| Keyboard              | Enter inserts a line; Ctrl+Enter / Cmd+Enter sends                                                            |
| Scrolling             | Replies follow until the reader scrolls up; “Jump to latest” resumes following                                |
| Copy                  | Actions below replies preserve the original Markdown                                                          |

## Markdown and math

| Content                     | Renderer / behavior                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Markdown                    | `react-markdown`; backend instructions request supported formatting                        |
| Code                        | `rehype-highlight` / highlight.js; syntax colors follow the theme                          |
| Languages                   | JavaScript, TypeScript, Python, SQL, CSS, and other common languages                       |
| Unknown / unlabelled fences | Readable plain code                                                                        |
| Math                        | `remark-math` + `rehype-katex`; [supported LaTeX subset](https://katex.org/docs/supported) |
| Incomplete / invalid math   | Remains readable during streaming; renders when valid                                      |
| Wide content                | Code and display equations scroll within the reply                                         |
| Safety                      | Raw HTML and trusted KaTeX commands disabled; fonts/styles bundled locally                 |

| Write                                          | Result                                    |
| ---------------------------------------------- | ----------------------------------------- |
| Language-tagged code fence, such as `python`   | Highlighted code; contents remain literal |
| `$E = mc^2$`                                   | Inline equation                           |
| `$$` on separate lines, or a `math` code fence | Display equation                          |
| `\(...\)` or `\[...\]`                         | Unsupported delimiters                    |
| `\$`                                           | Literal currency dollar sign              |

## Accessibility and web standards

Target: **WCAG 2.1 Level AA**. Use the
[Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) when
reviewing new or changed UI; automated scores do not establish full compliance.

| Review     | Requirements                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Manual     | Keyboard operation, visible focus, loading/error states, reduced motion, resilient layout, semantic controls, concise copy |
| WCAG       | Check Perceivable, Operable, Understandable, and Robust criteria                                                           |
| Lighthouse | Accessibility, best practices, SEO: 100%; performance: ≥85%, all enforced                                                  |
| Contrast   | Separate axe-powered WCAG AA audit in light and dark mode                                                                  |

[The Website Specification](https://specification.website/checklist/) also
informs the web foundations:

| Status                            | Scope                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Implemented                       | Document foundations, security headers, nginx caching/compression, PWA metadata                |
| Source files                      | `frontend/index.html`, `frontend/frontend.nginx.conf`, `frontend/app/favicon/site.webmanifest` |
| Out of scope for the internal SPA | Broader SEO, internationalization, agent-readiness categories                                  |
| Revisit on deployment changes     | HSTS at TLS termination; fonts as WOFF2                                                        |

## Working on the frontend

| Task                                 | Command / guidance                                                    |
| ------------------------------------ | --------------------------------------------------------------------- |
| Development with hot reload          | `make service SERVICE=frontend`                                       |
| Build and preview production assets  | `make frontend-preview`                                               |
| Frontend checks                      | `make qa-frontend`                                                    |
| Proxy and Docker configuration       | [Getting started](getting-started.md)                                 |
| UI changes                           | [Browser and visual testing](development.md#browser-and-visual-tests) |
| Analysis scope or dependency changes | [Fallow policy](development.md#frontend-code-quality-with-fallow)     |
