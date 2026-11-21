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

- Keep `.github/workflows/actions.lock` in sync with the workflows: after any
  `uses:` change, run `vp run actions-lock` (or `make actions-lock`; needs the
  `gh-actions-lock` version pinned in `scripts/actions-lock.sh`). Never edit it
  by hand.

- Do not use reusable workflows (e.g. from `IndrajeetPatil/workflows`); they are
  not appropriate for a template repository. Keep all workflows standalone and
  self-contained so downstream repositories created from this template remain
  fully independent.

- In `.github/workflows/qa.yml`, run backend and frontend checks as aggregate
  steps calling `make qa-backend` and `make qa-frontend`, rather than splitting
  them into separate steps for each tool.

## Before you change

| Area                  | Read first                                                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation art     | [Documentation illustrations](.agents/skills/documentation-illustrations/SKILL.md)                                                                                                                                                                                                                                        |
| UI                    | [design](DESIGN.md), [frontend](docs/frontend.md), [frontend quality checks](docs/frontend.md#frontend-quality-checks), [Fallow policy](docs/development.md#frontend-code-quality-with-fallow), [visual tests](docs/development.md#browser-and-visual-tests), [modern web platform](docs/frontend.md#modern-web-platform) |
| API or deployment     | [backend](docs/backend.md), [security](docs/security.md); validation must finish before streaming starts                                                                                                                                                                                                                  |
| Backend tests         | [test guide](docs/backend.md#tests), [mutation testing](docs/backend.md#mutation-testing); regenerate snapshots with `make backend-snapshot-update`                                                                                                                                                                       |
| Backend performance   | [benchmarks](docs/backend.md#benchmarks); CodSpeed reports regressions on PRs                                                                                                                                                                                                                                             |
| CI reporters          | [CI output policy](docs/development.md#ci-output)                                                                                                                                                                                                                                                                         |
| Tools or dependencies | [maintenance constraints](docs/development.md#maintenance-constraints), [supply chain](docs/security.md#supply-chain)                                                                                                                                                                                                     |

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

- Codex reviews every PR automatically and decides itself whether later pushes
  need another review, so never comment `@codex review`. Fix merited findings
  and reply to and resolve addressed threads until Codex approves with no
  unresolved findings.

- If Codex usage is exhausted, leave the PR open and report it. Once usage
  refreshes, comment `@codex review` once; only this case needs the comment.

- Never write `@codex` anywhere else in a PR title, body, or comment, not
  even inside backticks: Codex treats any mention as a task request and skips
  its automatic review.

- When CI is green and Codex has approved, recheck both and
  squash-merge with the owner's `gh` credentials, respecting branch protection.
