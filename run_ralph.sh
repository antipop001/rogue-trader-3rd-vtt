#!/usr/bin/env bash
# Ralph loop runner for rogue-trader-3rd-vtt (Foundry system).
# Adapted from the proven RTT_MAKER loop (see reference_ralph_loop_setup memory).
#
# Run from a REAL terminal (ideally tmux) at the repo root — NOT from inside a
# Claude Code session's `!` prompt (that runs one-shot commands and cannot host
# this blocking loop, and nesting `claude -p` inside an interactive `claude` is
# fragile).
#
#   tmux new -s ralph
#   ./run_ralph.sh            # default cap 50 iterations
#   ./run_ralph.sh 10         # cap at 10 iterations
#
# RECOMMENDED: run on a dedicated branch (the loop commits per-iteration to the
# CURRENT branch). e.g.  git switch -c ralph/chargen  before starting.
#
# Stops when an iteration creates .ralph/STOP, or at the iteration cap. A single
# lockfile prevents two runs from overlapping (they would race on git). After the
# loop ends it runs ONE full backpressure sweep as a safety net.
set -uo pipefail

cd "$(dirname "$0")"
MAX_ITERS="${1:-50}"
MODEL="${RALPH_MODEL:-opus}"
mkdir -p .ralph

if [ ! -d node_modules ]; then
  echo "ERROR: node_modules not found at $(pwd) — run 'npm install' first." >&2
  exit 1
fi

# --- single-run lock --------------------------------------------------------
# mkdir is atomic; if the lock dir already exists, another run is active.
LOCK=.ralph/lock
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "ERROR: a Ralph run is already active (lock: $LOCK). Remove it if stale:" >&2
  echo "       rmdir $LOCK" >&2
  exit 1
fi
echo "$$" > "$LOCK/pid"
cleanup() { rm -rf "$LOCK"; }
trap cleanup EXIT INT TERM

i=0
while [ ! -f .ralph/STOP ] && [ "$i" -lt "$MAX_ITERS" ]; do
  i=$((i + 1))
  echo "── Ralph iter $i · $(date -u +%FT%TZ) ──" | tee -a .ralph/loop.log
  RALPH_ITER="$i" claude -p "$(cat PROMPT.md)" \
      --dangerously-skip-permissions --model "$MODEL" 2>&1 | tee -a .ralph/loop.log
  sleep 3
done

if [ -f .ralph/STOP ]; then
  echo "Ralph halted: .ralph/STOP present after $i iteration(s)." | tee -a .ralph/loop.log
else
  echo "Ralph halted: hit cap of $MAX_ITERS iteration(s)." | tee -a .ralph/loop.log
fi

# --- end-of-run full sweep (safety net) -------------------------------------
# Inner iterations run build + the fast node test suite. This re-runs both as a
# net. NOTE: the Playwright E2E tier (tests/e2e/) is NOT run here — it needs a
# deployed build + a live rt-smoke world + a free GM seat, which the loop can't
# provision. Run E2E manually when a wizard-UI stage lands (see PROMPT.md).
echo "── Full backpressure sweep (npm run build:check + node test) ──" | tee -a .ralph/loop.log
sweep_ok=1
npm run build:check || sweep_ok=0
npm test || sweep_ok=0
if [ "$sweep_ok" -eq 1 ]; then
  echo "✓ Full sweep GREEN — build:check + node test clean." | tee -a .ralph/loop.log
else
  echo "✗ Full sweep RED — an inner iteration's gate missed something. Investigate before trusting the run." | tee -a .ralph/loop.log
fi
