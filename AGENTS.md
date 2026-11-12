# Chatbot Template

React/Vite frontend + FastAPI backend, streaming Azure OpenAI replies.
Start with the [documentation index](docs/README.md).

## Gotchas

- The frontend toolchain is Vite+ (`vp`), configured in `frontend/vite.config.ts`.
  Use `vp` commands (`vp test`, `vp lint`, `vp run <script>`, `vp exec <bin>`,
  `vp pm <command>`) rather than calling pnpm, Node.js, or Vitest directly.
- If `pyrefly` (backend type coverage) and `ty` disagree, `ty` wins.
- Meet coverage and mutation gates by asserting behavior at boundaries we own
  (the outbound request, the streamed output, the logged event), not by
  executing lines, recomputing expected values, or asserting a dependency's
  internals. If no behavior can observe a surviving mutant, delete the code;
  do not add mutmut exclusions.

## Before you change

| Area                  | Read first                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI                    | [frontend](docs/frontend.md), [Fallow policy](docs/development.md#frontend-code-quality-with-fallow), [visual tests](docs/development.md#browser-and-visual-tests) |
| API or deployment     | [backend](docs/backend.md), [security](docs/security.md); validation must finish before streaming starts                                                           |
| Backend tests         | [test guide](docs/backend.md#tests), [mutation testing](docs/backend.md#mutation-testing); regenerate snapshots with `make backend-snapshot-update`                |
| Backend performance   | [benchmarks](docs/backend.md#benchmarks); CodSpeed reports regressions on PRs                                                                                      |
| CI reporters          | [CI output policy](docs/development.md#ci-output)                                                                                                                  |
| Tools or dependencies | [maintenance constraints](docs/development.md#maintenance-constraints), [supply chain](docs/security.md#supply-chain)                                              |

## Checks

Run `make qa` and `make hooks` for implementation changes, or the relevant
subset for documentation-only changes; `make markdown-format` aligns Markdown
tables. Never lower a threshold or disable a check to get green. Switch a lint
rule off only with a comment saying why.

## Pull requests

- Use the shared `pull-requests` skill when available. Keep the title and body
  in sync with the net diff, updating stale metadata without asking.
- Open PRs ready for review, never as drafts.
- For frontend source changes (components, styles, client behavior, assets),
  follow [frontend-pr-screenshot](.agents/skills/frontend-pr-screenshot/SKILL.md)
  unprompted, even when the rendering is unchanged.
- After each push, wait for CI and fix failures until required checks pass.
- Request Codex review if it is not automatic. Fix merited findings, reply to
  and resolve addressed threads, and re-request review after changes, until
  Codex approves the current head with no unresolved findings. If Codex usage is
  exhausted, leave the PR open and report it.
- When CI is green and Codex has approved the current head, recheck both and
  squash-merge with the owner's `gh` credentials, respecting branch protection.
