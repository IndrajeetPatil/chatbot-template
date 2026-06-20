---
name: frontend-pr-screenshot
description: >
  Capture a screenshot of the frontend app and post it to the current
  GitHub pull request. Use when a user asks to post a PR screenshot,
  show the UI in a PR comment, verify visual changes in a PR, or
  include visual evidence after UI work.
allowed-tools: >
  Bash(gh *), Bash(git *), Bash(curl *), Bash(npx playwright*),
  Bash(lsof *), Bash(pnpm *), Bash(kill *), Bash(sleep *),
  Bash(seq *), Bash(cp *), Bash(mkdir *), Bash(cat *),
  Bash(date *), Bash(printf *)
---

# frontend-pr-screenshot

Posts a live screenshot of the frontend chat app to the active GitHub PR.

## Workflow

### 1 — Verify open PR

```bash
PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null)
# If this fails, tell the user to open a PR first and stop.
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
```

### 2 — Ensure dev server on port 3000

```bash
if ! lsof -ti:3000 > /dev/null 2>&1; then
  cd frontend && pnpm run dev &
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

```bash
cd frontend && npx playwright screenshot \
  "http://localhost:3000/chat" \
  /tmp/frontend-screenshot.png \
  --wait-for-selector "#message-input" \
  --timeout 15000
```

Install if missing: `pnpm exec playwright install chromium --with-deps`

### 4 — Commit screenshot on current branch and push

Run from the repo root (steps 2–3 may have changed into `frontend/`):

```bash
cd "$(git rev-parse --show-toplevel)"
BRANCH=$(git branch --show-current)
ASSET_PATH=".github/pr-assets/frontend-screenshot-${PR_NUMBER}.png"
mkdir -p .github/pr-assets
cp /tmp/frontend-screenshot.png "$ASSET_PATH"
git add "$ASSET_PATH"
git commit -m "docs: add frontend screenshot for PR #${PR_NUMBER}"
git push

IMAGE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/${ASSET_PATH}"
curl -sfI "$IMAGE_URL"   # verify URL resolves before commenting
```

### 5 — Post PR comment

```bash
DATE_UTC=$(date -u '+%Y-%m-%d %H:%M UTC')
gh pr comment "$PR_NUMBER" --body "$(cat <<EOF
## Frontend Screenshot

![App screenshot](${IMAGE_URL})

> Captured from /chat — ${DATE_UTC}
EOF
)"
```

### 6 — Clean up

If you started the dev server in step 2:

```bash
[ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null || true
```
