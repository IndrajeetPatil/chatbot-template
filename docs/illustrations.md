# Documentation illustrations

These illustrations summarize the request path and quality gates. Technical
details remain in the linked documentation and are the source of truth. Rich
generated artwork supplies the color and depth; editable SVG layers correct
flow labels and align tool names beneath their icons. WebP files are the
published versions.

## Chatbot architecture

![Browser requests pass through Vite or nginx to FastAPI and Azure OpenAI, with streamed replies returning through each layer and credentials staying server-side](images/chatbot-template-architecture.webp)

- **Files:** `docs/images/chatbot-template-architecture.svg` and
  `docs/images/chatbot-template-architecture.webp`
- **Content:** The browser sends `POST /api/v1/chat` through the frontend proxy.
  FastAPI forwards the request to Azure OpenAI for a streaming completion.
  Text deltas return through FastAPI, the proxy, and the browser. Azure
  credentials remain on the server.
- **Artwork prompt:**

  ```text
  Create a polished landscape software architecture illustration with four
  large, softly rounded stages: Browser, Frontend proxy, FastAPI backend, and
  Azure OpenAI. Show a friendly chat interface, frontend server stack, request
  validation, an Azure model endpoint, server-side credentials, and a clear
  left-to-right request path with streaming responses returning to the browser.
  Use rich navy outlines, pale green and sky-blue panels, dimensional product
  symbols, and a warm editorial finish. Keep labels large and avoid extra
  decorative captions. The final SVG corrects the proxy and streaming labels.
  ```

- **Source artwork:** `images/illustration-art/architecture-base.webp`

## Quality harness

![Local entry points and GitHub Actions feed six groups of code, structure, behavior, browser, security, and convention checks, with coverage floors](images/chatbot-template-quality-harness.webp)

- **Files:** `docs/images/chatbot-template-quality-harness.svg` and
  `docs/images/chatbot-template-quality-harness.webp`
- **Content:** Local entry points (`make qa`, `make hooks`, and focused targets)
  and GitHub Actions feed six groups of checks: code and types; structure;
  behavior; browser and accessibility; security and supply chain; conventions
  and review evidence. Backend coverage is 100% for lines and branches.
  Frontend coverage is at least 90% for statements, functions, and lines, and
  75% for branches.
- **Artwork prompt:**

  ```text
  Create a wide, warmly textured software quality infographic. Across the top,
  show local command entry points and GitHub Actions feeding six balanced cards
  for code and types, structure, behavior, browser and accessibility, security
  and supply chain, and conventions and evidence. Put each tool symbol above
  its own name. Finish with a broad coverage panel for backend and frontend
  thresholds. Use dimensional laptop, plant, server, and tool illustrations,
  rounded navy outlines, pale green and blue surfaces, and an editorial finish.
  ```

- **Source artwork:** `images/illustration-art/quality-base.webp`
