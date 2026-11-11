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
- `make backend-mutation-test` fails on any surviving mutant. Kill it with such
  an assertion, or delete code that no behavior can observe; never add mutmut
  exclusions just to pass.
- Keep the upstream `ty-pre-commit` hook pinned at a full commit SHA; if its
  bundled uv conflicts, downgrade the project uv pin rather than replacing the
  hook. See [maintenance constraints](docs/development.md#maintenance-constraints).
- Align Markdown tables with `make markdown-format`.

## Before you change

| Area                  | Read first                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                    | [frontend](docs/frontend.md), [Fallow policy](docs/development.md#frontend-code-quality-with-fallow), [visual tests](docs/development.md#browser-and-visual-tests)           |
| API or deployment     | [backend](docs/backend.md), [security](docs/security.md); validation must finish before streaming starts                                                                     |
| Backend tests         | [test guide](docs/backend.md#tests), [mutation testing](docs/backend.md#mutation-testing); regenerate snapshots with `make backend-snapshot-update`                          |
| Backend performance   | [benchmarks](docs/backend.md#benchmarks); CodSpeed reports regressions on PRs                                                                                                |
| CI reporters          | [CI output policy](docs/development.md#ci-output)                                                                                                                            |
| Tools or dependencies | [maintenance constraints](docs/development.md#maintenance-constraints), [supply chain](docs/security.md#supply-chain)                                                        |

## Checks

Run `make qa` and `make hooks` for implementation changes; run the relevant
subset for documentation-only changes. Never lower a threshold or disable a
check to get green. A lint rule may be switched off only with a comment saying
why (see [automated checks](docs/development.md#automated-checks)).

## Pull requests

- Load the shared `pull-requests` skill. Keep the title and body in sync with
  the net diff, update stale metadata without asking, and verify the live values.
- Publish PRs directly as ready for review with `gh pr create`; never use
  `--draft`.
- For every frontend source change (components, styles, client behavior, or
  frontend assets), invoke
  [frontend-pr-screenshot](.agents/skills/frontend-pr-screenshot/SKILL.md) and
  post screenshots to the PR without waiting to be asked. This applies even
  when the rendered appearance is unchanged; developer-tooling-only changes
  do not require screenshots. Verify the uploaded images render in the comment.
- After creating a PR and after each push, wait for CI. Investigate failures,
  make the needed fixes, push, and repeat until all builds and required checks
  pass; never weaken checks to obtain green results.
- Request Codex review when it is not automatic. Evaluate findings, fix merited
  issues, reply and resolve addressed threads, and request another review after
  changes. Repeat until Codex gives a thumbs-up for the current head and no
  unresolved findings remain. An old-head approval or silence is insufficient.
- If Codex reports exhausted usage, take no workaround action: leave the PR
  open, do not merge, and report the review limit. CI work can still finish.
- Once CI is green and Codex is happy with the current head, squash-merge with
  the owner's authenticated `gh` credentials. Recheck head, checks, and review
  immediately before merging; respect branch protection and never bypass it.
