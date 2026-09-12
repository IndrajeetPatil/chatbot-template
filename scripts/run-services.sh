#!/usr/bin/env bash
# Keep development services attached to the terminal and stop them together.
set -euo pipefail

service=${1:-both}
make_command=${2:-make}
case "$service" in
  backend|frontend) exec "$make_command" --no-print-directory "run-$service" ;;
  both) ;;
  *) echo "SERVICE must be backend, frontend, or both." >&2; exit 2 ;;
esac

# Job control gives each service its own process group, including reload workers.
# This works with the system Bash on macOS as well as Linux; wait -n does not.
set -m
pids=()
cleanup() {
  trap - EXIT INT TERM
  for pid in "${pids[@]}"; do
    kill -TERM -- "-$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$make_command" --no-print-directory run-backend &
pids+=("$!")
"$make_command" --no-print-directory run-frontend &
pids+=("$!")

while true; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      # Preserve the exited service's status; EXIT stops its sibling.
      wait "$pid"
      exit 0
    fi
  done
  sleep 1
done
