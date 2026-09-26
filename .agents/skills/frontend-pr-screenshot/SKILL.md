---
name: frontend-pr-screenshot
description: >
  Capture a screenshot of the frontend app and post it to the current
  GitHub pull request. Use when a user asks to post a PR screenshot,
  show the UI in a PR comment, verify visual changes in a PR, or
  include visual evidence after UI work.
allowed-tools: >
  Bash(gh *), Bash(git *), Bash(curl *), Bash(vp *),
  Bash(lsof *), Bash(kill *), Bash(sleep *),
  Bash(seq *), Bash(cat *), Bash(date *), Bash(printf *)
---

# frontend-pr-screenshot

Posts a live screenshot of the frontend chat app to the active GitHub PR.

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

The app defaults to dark mode when no OS preference is detected.
Pass `--color-scheme dark` so headless Chromium matches.

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
matching Markdown reference in place, so no release asset or public URL is
needed. Do NOT commit screenshots to the repo (`.github/pr-assets/` is
gitignored).

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

### 5 — Clean up

If you started the dev server in step 2:

```bash
[ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null || true
```
