---
name: address-review
description: Address code review comments and reply to them
disable-model-invocation: true
---

# Address Code Review Comments

Check the code review comments and see if any of them have merit. If yes, fix
them. Regardless, reply to all comments on my behalf. Once you have replied to a
comment, also resolve the comment. If you have made any changes to address
review feedback, run `make qa` to confirm the checks still pass, then commit and
push the changes. Use the gh CLI to fetch comments; I have already authenticated
myself.

When a comment concerns a version or tooling inconsistency (e.g. pnpm, Node),
search the entire repository for every place that version is declared and fix all
of them in one go — not just the specific line the reviewer flagged.

For pnpm, the canonical version lives in `frontend/package.json`
(`packageManager`). The workflows read it via `pnpm/action-setup`'s
`package_json_file` input, and `.devcontainer/post-create.sh` derives the local
install version from the same field. Do not mirror pnpm versions into workflow
files.

For Node.js, the canonical version lives in `frontend/.nvmrc` and must stay in
sync with the `node:<version>-trixie-slim` builder image in
`frontend/Dockerfile`. The workflows use `node-version-file:
"frontend/.nvmrc"`.

For Python, keep `backend/pyproject.toml`, `backend/uv.lock`, and
`backend/Dockerfile` aligned. For uv, the canonical version lives in
`backend/pyproject.toml` (`[tool.uv]` `required-version`); the workflows read it
via `astral-sh/setup-uv`'s `working-directory` input, and
`.devcontainer/post-create.sh` derives the local install version from the same
field.

When a review asks for validation, choose the narrowest relevant check first,
then run broader gates before pushing if the change affects shared behaviour,
dependency resolution, or workflow configuration. Common gates are `make qa`,
`make frontend-build`, `make e2e-test`, `make lighthouse`, and
`make docker-build`.

When a comment concerns user-facing copy, use clear American English unless the
existing surrounding copy establishes a different spelling convention. Preserve
published titles, package names, code identifiers, and API names exactly.
