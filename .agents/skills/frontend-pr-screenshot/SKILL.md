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

Posts a live screenshot of the frontend chat app to the active GitHub
pull request.

## Workflow

### Step 1 — Verify there is an open PR

```bash
PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null)
```

If this fails (exit code non-zero), there is no open PR for the
current branch. Tell the user to open one first and stop.

```bash
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
```

### Step 2 — Ensure the dev server is running on port 3000

```bash
# Check if something is already listening on port 3000
if ! lsof -ti:3000 > /dev/null 2>&1; then
  echo "Starting dev server..."
  cd frontend && pnpm run dev &
  DEV_PID=$!
  # Give it up to 30 s to become ready
  READY=0
  for i in $(seq 1 30); do
    curl -sf http://localhost:3000 > /dev/null 2>&1 && READY=1 && break
    sleep 1
  done
  if [ "$READY" -eq 0 ]; then
    echo "Error: dev server did not become reachable within 30 s. Aborting."
    exit 1
  fi
fi
```

### Step 3 — Take a screenshot with Playwright

Use the Playwright CLI — it launches Chromium, navigates to the page,
waits for the chat input to appear (confirming the React app has
fully rendered), then saves the screenshot.

```bash
cd frontend && npx playwright screenshot \
  "http://localhost:3000/chat" \
  /tmp/frontend-screenshot.png \
  --wait-for-selector "#message-input" \
  --timeout 15000
```

If Playwright is not installed, run:

```bash
pnpm exec playwright install chromium --with-deps
```

### Step 4 — Publish the PNG on a dedicated asset branch

GitHub's undocumented issue-assets upload endpoint has become unreliable
for this workflow. The working fallback is to publish the PNG on a
dedicated branch and use the raw GitHub URL in the PR comment.

```bash
CURRENT_BRANCH=$(git branch --show-current)
ASSET_BRANCH="pr-screenshot-${PR_NUMBER}"
ASSET_PATH=".github/pr-assets/frontend-screenshot-${PR_NUMBER}.png"

if git show-ref --verify --quiet "refs/heads/${ASSET_BRANCH}"; then
  git switch "${ASSET_BRANCH}"
else
  git switch -c "${ASSET_BRANCH}"
fi

mkdir -p .github/pr-assets
cp /tmp/frontend-screenshot.png "${ASSET_PATH}"
git add "${ASSET_PATH}"
git commit -m "docs: add PR screenshot asset" || true
git push -u origin "${ASSET_BRANCH}"
git switch "${CURRENT_BRANCH}"

IMAGE_URL="https://raw.githubusercontent.com/${REPO}/${ASSET_BRANCH}/${ASSET_PATH}"
```

Verify the published image URL resolves before commenting:

```bash
curl -sfI "${IMAGE_URL}"
```

### Step 5 — Post the screenshot as a PR comment

```bash
DATE_UTC=$(date -u '+%Y-%m-%d %H:%M UTC')

cat >/tmp/pr-screenshot-comment.md <<EOF
## Frontend Screenshot

![App screenshot](${IMAGE_URL})

> Captured from /chat — ${DATE_UTC}
EOF

gh pr comment "$PR_NUMBER" --body-file /tmp/pr-screenshot-comment.md
```

### Step 6 — Clean up (optional)

If you started the dev server in Step 2, you may stop it:

```bash
[ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null || true
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `gh pr view` fails | No open PR. Ask the user to open one first. |
| Playwright waits forever | Use `#message-input` instead of `[aria-label='Message']` and add `--timeout 15000`. |
| Raw image URL 404s | Confirm the asset branch pushed successfully and `curl -I "$IMAGE_URL"` returns 200 before commenting. |
| Browser session is signed out | Stay on the asset-branch flow; it does not require GitHub web login. |
| Extra screenshot comments were posted while debugging | Delete them with `gh api -X DELETE /repos/<owner>/<repo>/issues/comments/<comment_id>`. |
