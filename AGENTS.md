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

## Learn from mistakes

When a check fails, a reviewer raises a finding, or you notice a mistake in
your own work, fix it, then ask what led you to it. If `AGENTS.md`, a skill,
its scripts or templates, a prompt, or a doc gave missing, ambiguous, or
wrong guidance, correct that guidance in the same pull request, stating the
general rule rather than the incident. Never weaken a quality gate instead.

## Lighthouse

Keep audits in a self-contained `lighthouse.yml` workflow named `Lighthouse`.
Use native LHCI assertion output for coloured values, and retain report
artifacts after failures. Cache dependencies and the exact Node/Vite+
toolchain, but always collect fresh measurements. Do not introduce a shared
action, reusable Lighthouse workflow, or custom reporter.

## Pull requests

Follow these rules without relying on any instructions outside this
repository:

- Write every commit message and PR title as a Conventional Commit,
  `type(scope): description`, lowercase and imperative, with an allowed type
  (`build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`,
  `revert`, `style`, `test`).

- Open every PR ready for review with `gh pr create`, never as a draft. Keep
  the title and body in step with the net diff.

- Never add agent or tool attribution to commits, PRs, or comments.

- For frontend source changes (components, styles, client behavior, assets),
  follow [frontend-pr-screenshot](.agents/skills/frontend-pr-screenshot/SKILL.md)
  unprompted, even when the rendering is unchanged.

- After opening or pushing, wait for hosted CI to finish. Inspect failed jobs,
  fix the cause, run the local checks (`make qa` and `make hooks`), push,
  and repeat. Skipped, queued, or failing required checks are not success.

- If an automatic AI review (Codex, for the owner) runs on the PR, wait for
  its result instead of requesting one. Fix merited findings, reply to and
  resolve addressed threads, and continue until the review approves the
  current head with no unresolved findings. Never write `@codex` anywhere in
  a PR, even in backticks: it cancels the automatic review. Say "a Codex
  review request" instead.

- If Codex reports exhausted usage, leave the PR open and report it; no other
  reviewer or silence counts as approval. Once usage refreshes, comment
  `@codex review` once; only this case needs the comment.

- Once CI is green and the review gate is met, squash-merge, then verify the
  merged state. Recheck the head, threads, and checks immediately before
  merging, and never bypass branch protections.

- Update a PR branch from `main` only to resolve conflicts or pick up a change
  the PR depends on, never just to bring it up to date.

- Report local validation, hosted CI, review, and merge state separately. If
  an external blocker stops completion, leave the PR open and say so.
