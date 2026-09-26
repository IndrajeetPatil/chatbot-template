# Chatbot Template

React/Vite frontend + FastAPI backend, streaming Azure OpenAI replies.
Start with [README.md](README.md) and the [documentation index](docs/README.md).

## Gotchas

- The frontend toolchain is Vite+ (`vp`), configured in `frontend/vite.config.ts`.
  Use `vp` commands (`vp test`, `vp lint`, `vp run <script>`, `vp exec <bin>`,
  `vp pm <command>`) rather than calling pnpm, Node.js, or Vitest directly.
- If `pyrefly` (backend type coverage) and `ty` disagree, `ty` wins.
- Coverage gates invite filler tests. Meet them by asserting behavior at
  boundaries we own (the outbound request, the streamed output, the logged
  event), never by executing lines, recomputing expected values, or asserting a
  dependency's internals.
- Keep the upstream `ty-pre-commit` hook pinned at a full commit SHA; if its
  bundled uv conflicts, downgrade the project uv pin rather than replacing the
  hook. See [maintenance constraints](docs/development.md#maintenance-constraints).
- Align Markdown tables with `make markdown-format`.

## Before you change

| Area                  | Read first                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                    | [frontend](docs/frontend.md), [Fallow policy](docs/development.md#frontend-code-quality-with-fallow), [visual tests](docs/development.md#browser-and-visual-tests)           |
| API or deployment     | [backend](docs/backend.md), [security](docs/security.md); validation must finish before streaming starts                                                                     |
| Backend tests         | [test guide](docs/backend.md#tests); regenerate snapshots with `make backend-snapshot-update`                                                                                |
| CI reporters          | [CI output policy](docs/development.md#ci-output)                                                                                                                            |
| Tools or dependencies | [maintenance constraints](docs/development.md#maintenance-constraints), [supply chain](docs/security.md#supply-chain)                                                        |

## Checks

Run `make qa` and `make hooks` for implementation changes; run the relevant
subset for documentation-only changes. Never lower a threshold or disable a
check to get green. A lint rule may be switched off only with a comment saying
why (see [automated checks](docs/development.md#automated-checks)).

## Pull requests

Keep the title and body in sync with the net diff, update stale metadata
without asking, and verify the live values after editing. Unless asked, do not
wait for CI after pushing; share the PR or workflow link instead.
