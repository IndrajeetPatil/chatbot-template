# Development and quality assurance

[Documentation](README.md) · [Project overview](../README.md)

## Automated checks

The frontend and backend services have their own quality checks.
All checks can be run locally with:

``` bash
make qa
```

To refresh backend/frontend dependencies and `prek` hook revisions locally:

``` bash
make update-deps
```

To validate Lighthouse scores against thresholds locally:

``` bash
make lighthouse
```

Lighthouse runs three mobile-throttled samples and asserts the median result.
Performance, accessibility, best-practices, SEO, LCP, CLS, and TBT are all hard
failures. Lighthouse reports must not contain unresolved `runWarnings` or
warn-only assertions.

To validate WCAG AA colour contrast in both UI themes:

``` bash
make contrast-audit
```

New UI changes should still be reviewed against the
[Vercel Web Interface Guidelines](https://vercel.com/design/guidelines), because
many interaction, content, and layout details require
manual judgment. The guidelines are an implementation target, not a blanket
claim that every existing screen is already fully compliant.

## Browser and visual tests

Vitest checks data contracts and interactions with the existing coverage floors.
Playwright checks presentation with reviewed screenshots of the real app in light
and dark mode, at desktop and mobile sizes. API responses are mocked; no backend
or Azure credentials are needed.

``` bash
make test             # backend and frontend unit tests with coverage
make e2e-test         # build + local browser behavior; visuals skip off-Linux
make e2e-test-docker  # build + behavior + visual comparisons in the CI renderer
make e2e-update       # deliberately regenerate visual baselines
```

Use the Docker targets for visual comparisons and updates on every host. They
share a digest-pinned Playwright Linux/amd64 image with CI, including on Apple
Silicon, and keep Linux dependencies in a dedicated Docker volume. The production
preview uses port 3000 and refuses to reuse an existing server.
The container restores generated output ownership to your UID/GID on exit,
including after test failures, so native Linux builds and edits stay writable.

Snapshots cover the greeting, validation, model/reasoning menus, Markdown
conversation, pending response, and request failure. Screenshot assertions wait
for stable rendering with bundled fonts and disabled animations; ordinary test
runs fail on missing baselines and never update them automatically.

After an intentional UI change, run `make e2e-update` and inspect the changed PNGs
in `frontend/e2e-tests/__snapshots__/`. Run `make e2e-test-docker`, then commit
the reviewed baselines with the change. To focus a run, pass
`E2E_ARGS='visual.spec.ts --workers=1'` to either Docker target.
Failure diffs and traces are in `frontend/test-results/`; the HTML report is in
`frontend/playwright-report/`. CI uploads both as the `playwright-report` artifact.

`make qa` and `make qa-frontend` keep their unit-test coverage checks; the separate
browser CI job runs the same `make e2e-test-docker` target. When upgrading
`@playwright/test`, update the image tag and SHA256 digest in
`makefiles/frontend.mk` together and regenerate/review the baselines.

To remove all build artifacts and tool caches for a clean slate (useful
for testing cold-cache behaviour):

``` bash
make clean
```

More specifically:

| Step                     | Frontend                                           | Backend      |
| ------------------------ | -------------------------------------------------- | ------------ |
| Package manager          | pnpm                                               | uv           |
| Formatter                | Biome                                              | Ruff         |
| Linter                   | Biome                                              | Ruff         |
| Import sorter            | Biome                                              | Ruff         |
| Type checker             | TypeScript                                         | ty           |
| Type annotation coverage | type-coverage                                      | typecoverage |
| Security linting         | ESLint (`no-unsanitized`, `react-dom`)             | \-           |
| Codebase analysis        | Fallow                                             | \-           |
| CSS code quality         | @projectwallace/css-code-quality                   | \-           |
| Contrast audit           | axe-core (`color-contrast`) in light and dark mode | \-           |
| Markdown linting         | rumdl                                              | rumdl        |
| File naming              | ls-lint                                            | ls-lint      |
| Pre-commit hooks         | prek                                               | prek         |
| Commit message linting   | commitlint                                         | commitlint   |
| IaC / workflow scan      | Checkov                                            | Checkov      |
| Secret scanning          | Gitleaks                                           | Gitleaks     |
| GitHub Actions audit     | zizmor                                             | zizmor       |
| Container vuln scan      | Trivy                                              | Trivy        |
| Unit testing             | Vitest                                             | pytest       |
| Property-based testing   | fast-check                                         | Hypothesis   |
| Code coverage            | Vitest                                             | coverage.py  |
| Coverage floor           | 90% statements/functions/lines; 75% branches       | 100%         |
| Load testing             | \-                                                 | locust       |
| End-to-end testing       | Playwright                                         | \-           |
| Dependency audit         | pnpm audit                                         | uv audit     |
| Performance / a11y       | Lighthouse CI, axe-core                            | \-           |
| API client               | Vercel AI SDK                                      | openai       |
| API server               | \-                                                 | FastAPI      |
| UI toolkit               | Material UI                                        | \-           |
| Logger                   | \-                                                 | loguru       |

## Frontend code quality with Fallow

[Fallow](https://docs.fallow.tools/) complements Biome, ESLint, TypeScript, and
the test suite with dead-code, dependency, duplication, and complexity checks.
Run it independently with `make fallow` or as part of `make qa` and
`make qa-frontend`. Each run validates the configuration with `fallow doctor`
before running all three analyses with `--fail-on-issues`.

The [frontend configuration](../frontend/.fallowrc.json) enforces a strict policy:

- All explicitly configured dead-code and dependency rules fail as errors,
  including unresolved imports, unused exports/types/packages, and cycles.
- Duplicate detection uses `strict` mode, starting at 50 tokens and 4 lines.
  Fallow's built-in generated-output, test, and mock exclusions remain enabled.
- Function cyclomatic and cognitive complexity must each stay at or below 5.
  Application code, scripts, and tests are checked without blanket test ignores.

The schema comes from the installed package to keep configuration validation
aligned with the lockfile. The app starts at `src/main.tsx`; Fallow discovers
package scripts and test/tool entry points automatically. Only MUI's Emotion
peers and the indirectly loaded React Compiler need dependency exceptions.
CSS is checked by the separate CSS quality and contrast audits.
Keep QA scripts out of the runtime entry list so dev dependencies are classified
correctly. Limit dependency exceptions to `@emotion/react`, `@emotion/styled`
(MUI peers), and `babel-plugin-react-compiler` (loaded by `reactCompilerPreset()`).
Recheck exceptions after upgrades; directly imported QA packages and deleted
mock paths need no exemptions. Do not disable unresolved-import checks.

## CI output

The QA workflow runs the `make qa` gates as separate steps, with coloured output
and the same failure thresholds. Fallow findings appear as GitHub annotations
and a compact report on the run's **Summary** page; `make fallow` retains the full
local report. CSS quality reports distinguish advisory scores and show penalty
details when an enforced threshold fails. Dependency installs retain warnings
and errors, build/Lighthouse details are collapsible, and compact test progress
retains failure diagnostics, annotations, and coverage/HTML artifacts.
Keep all checks and thresholds intact when changing reporting. Fallow validates
configuration with `doctor` and retains `--fail-on-issues --quiet --summary` as
the enforcement gate; do not rely on CI reporter exit codes alone. Health scores
and template statistics are advisory.

Workflows force colour with `FORCE_COLOR`, `CLICOLOR_FORCE`, `UV_COLOR`,
`PREK_COLOR`, Biome's `--colors=force`, zizmor's `--color=always`, and pytest's
`--color=yes`. Pass colour settings into Docker explicitly and mirror the
repository layout so browser annotations include the `frontend/` prefix.

## File naming

[ls-lint 2.3.1](https://ls-lint.org/2.3/configuration/the-basics.html) enforces
`.ls-lint.yml` across the repository:

| Layer                                                     | Convention                            | Example                                          |
| --------------------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| Python modules and tests                                  | snake_case; `__init__.py` allowed     | `azure_client.py`, `test_main.py`                |
| Python package directories                                | snake_case                            | `backend/app/`                                   |
| React components and page components                      | PascalCase, including colocated tests | `ChatInput.tsx`, `Page.test.tsx`                 |
| Client modules, hooks, and test helpers                   | camelCase, including test suffixes    | `useChatSetup.ts`, `testUtils.tsx`               |
| Vite entry point                                          | `main.tsx`                            | `frontend/src/main.tsx`                          |
| Frontend directories, CSS, fonts, and images              | kebab-case                            | `e2e-tests/`, `geist-mono-vf.woff`               |
| End-to-end tests and JavaScript utility scripts           | kebab-case                            | `chat-page.spec.ts`, `contrast-audit.mjs`        |
| Shell scripts, Make fragments, docs, and config basenames | kebab-case                            | `post-create.sh`, `backend.mk`, `update-deps.md` |

Standard names such as `README.md`, `AGENTS.md`, `Dockerfile`, and tool dotfiles
are preserved. Compound extensions such as `.test.tsx`, `.spec.ts`, `.config.ts`,
and `.d.ts` have explicit rules. Dependencies, generated reports/snapshots, and
vendored agent skills are excluded; source assets are checked.

Run `make file-naming` for naming checks alone. `make lint`, `make qa`,
`make qa-backend`, and `make qa-frontend` also check repository-wide naming.
The `ls-lint` pre-commit hook invokes the same target on the entire tree,
including when only the rules change. Run `prek install` to install the hooks,
`prek run ls-lint --all-files` to run this hook alone, or `make hooks` to run all
pre-commit checks.

The hook requires `make` and `ls-lint` on `PATH`. The development container and
both QA and prek CI workflows install the pinned ls-lint 2.3.1 binary and verify
its SHA256 checksum. For other local environments, use the
[versioned installation instructions](https://ls-lint.org/2.3/getting-started/installation.html)
and verify the release checksum before installing the binary.

The prek CI job uses the action's cached hook environments without a separate
uv setup step: prek manages Python environments, and the upstream ty hook
supplies its own compatible uv. CI pins prek 0.4.11, the newest version in
prek-action v3.0.0's bundled SHA256 table, and runs the pre-commit stage with
coloured output. Local commit-msg and pre-push hooks remain configured in
`prek.toml`.

Commit messages are validated by the `commit-msg` prek hook with commitlint.
The config follows conventional commits and accepts both lowercase and
uppercase commit types, for example `feat: ...` and `FEAT: ...`.

## Maintenance constraints

Type coverage must remain 100% on both sides (`typecoverage` for Python and
`type-coverage --strict` for TypeScript). Backend coverage is 100% lines and
branches; frontend coverage is at least 90% statements/functions/lines and
75% branches. Do not lower these gates to make a change pass.

Retain the upstream `ty-pre-commit` hook pinned to a full commit SHA. If its
bundled uv conflicts with the project requirement, downgrade the project uv pin
to the compatible version and synchronize the Docker image, installer checksum,
and documentation. Do not substitute a local hook.

Pin and SHA256-verify downloaded tools; see [security](security.md).
Unless explicitly requested, do not wait for hosted CI/CD after pushing; report
that checks were triggered and provide the PR or workflow link.

## Command reference

Run these from the repository root; service-specific targets live in
[backend.mk](../makefiles/backend.mk) and [frontend.mk](../makefiles/frontend.mk).

| Command | Purpose |
| --- | --- |
| `make qa` | Format, lint, types, schema, coverage, frontend audits, Checkov |
| `make qa-backend` / `make qa-frontend` | Checks for one service, including its dependency audit |
| `make format` / `make lint` | Formatting / ls-lint, Ruff, Biome, rumdl |
| `make type-check` / `make type-coverage` | Static types / 100% type coverage |
| `make test` | Backend and frontend unit tests with coverage |
| `make backend-validate-api-schema` | Generate and validate OpenAPI without credentials |
| `make backend-load-test` | Start the backend and Locust against it |
| `make fallow` / `make css-quality` | Frontend codebase / CSS analysis |
| `make contrast-audit` / `make lighthouse` | Build and audit the frontend |
| `make e2e-test` / `make e2e-test-docker` | Local browser behavior / pinned visual renderer |
| `make e2e-update` | Regenerate visual baselines for review |
| `make file-naming` / `make markdown-lint` | Repository naming / Markdown checks |
| `make hooks` | All pre-commit hooks across tracked files |
| `make update-deps` | Refresh dependencies, package revisions, and hook pins |
| `make security-scan` / `make secret-scan-ci` | Checkov / full-history Gitleaks with Docker |
| `make docker-build` | Build both service images |
| `make frontend-build` then `make run` | Build frontend, then start both services |
| `make clean` | Remove local dependencies, build output, and tool caches |
