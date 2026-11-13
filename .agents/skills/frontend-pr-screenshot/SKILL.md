---
name: frontend-pr-screenshot
description: >
  Capture a screenshot of the frontend app and post it to the current
  GitHub pull request. Required when opening or updating a PR with frontend
  source changes, even without a visible change; excludes developer tooling
  alone. Also use when the user explicitly requests PR screenshot evidence.
allowed-tools: >
  Bash(gh *), Bash(git *), Bash(curl *), Bash(vp *),
  Bash(lsof *), Bash(kill *), Bash(sleep *),
  Bash(seq *), Bash(cat *), Bash(date *), Bash(printf *)
---

# frontend-pr-screenshot

Posts a live screenshot of the frontend chat app to the active GitHub PR.

Invoke this skill for every frontend source change, including components,
styles, client behavior, and frontend assets. Capture representative affected
routes and states even for behavior-preserving refactors. Developer-tooling-only
changes do not require screenshots. Use synthetic conversations and mock data;
never upload credentials, personal conversations, or other sensitive content.

## Workflow

### 1 — Verify open PR

```bash
PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null)
# If this fails, tell the user to open a PR first and stop.
```

### 2 — Ensure dev server on port 3000

```bash
if ! lsof -ti:3000 > /dev/null 2>&1; then
  cd frontend && vp dev &
  DEV_PID=$!
  READY=0
  for i in $(seq 1 30); do
    curl -sf http://localhost:3000 > /dev/null 2>&1 && READY=1 && break
    sleep 1
  done
  [ "$READY" -eq 0 ] && echo "Dev server unreachable after 30 s" && exit 1
fi
```

### 3 — Screenshot with Playwright

The app has one route, `/chat`, so capture the states the change affects
(theme, viewport, menus, replies). The command below captures the initial view
in dark mode, the app's default when no OS preference is detected; change
`--color-scheme`, `--viewport-size` or the output path for other states, and
repeat for each one.

```bash
cd frontend && vp exec playwright screenshot \
  "http://localhost:3000/chat" \
  /tmp/frontend-screenshot.png \
  --wait-for-selector "#message-input" \
  --color-scheme dark \
  --timeout 15000
```

Install if missing: `vp exec playwright install --with-deps chromium`

### 4 — Post PR comment

`gh pr comment --attach` (gh ≥ 2.99.0) uploads the local file and rewrites the
matching Markdown reference in place. Keep screenshots out of the repository.

```bash
DATE_UTC=$(date -u '+%Y-%m-%d %H:%M UTC')
gh pr comment "$PR_NUMBER" \
  --attach '/tmp/frontend-screenshot.png#App screenshot' \
  --body "$(cat <<EOF
## Frontend Screenshot

![App screenshot](/tmp/frontend-screenshot.png)

> Captured from /chat — ${DATE_UTC}
EOF
)"
```

### 5 — Verify the upload

Read back the posted comment and confirm the Markdown references an uploaded
GitHub asset rather than a local path. Open the rendered comment and verify the
image is visible. If uploading fails, fix it or report the blocker; a local PNG
alone does not complete the requirement.

### 6 — Clean up

If you started the dev server in step 2:

```bash
[ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null || true
```
