#!/usr/bin/env bash
# Antigravity-driven QA / bug-pass Ralph loop — CROSS-MODEL.
#
#   agy   (Google Antigravity, Gemini 3.1 Pro)  = the BUG CHECKER + VERIFIER
#   claude (Claude Code, Opus)                   = the FIXER
#
# A second-opinion correctness pass over the system: a DIFFERENT model hunts for bugs,
# Claude fixes them, then Antigravity independently verifies the fix (catching
# plausible-but-wrong fixes). Findings flow through a shared queue, `.ralph/bug-queue.md`.
#
# Run from a REAL terminal (tmux), NOT a Claude `!` prompt:
#     tmux new -s agyqa
#     ./loops/antigravity-qa/run_agy_qa.sh 15        # cap at 15 fix-iterations
#
# Run on a dedicated branch (it commits per-iteration):  git switch -c ralph/agy-qa
#
# Env overrides:
#   CHECK_MODEL  (default "Gemini 3.1 Pro (High)")  — agy model for discovery + verify
#   FIX_MODEL    (default "opus")                    — claude model for fixes
#   MIN_OPEN     (default 3)   — replenish discovery when open findings drop below this
#   VERIFY       (default 1)   — run the agy cross-model verify phase (0 to skip)
#
# Stops on .ralph/STOP or the iteration cap. A single lockfile prevents overlap.
set -uo pipefail

# Repo root is two levels up from this script.
cd "$(dirname "$0")/../.." || exit 1
REPO="$(pwd)"
KIT="loops/antigravity-qa"
QUEUE=".ralph/bug-queue.md"

MAX_ITERS="${1:-15}"
CHECK_MODEL="${CHECK_MODEL:-Gemini 3.1 Pro (High)}"
FIX_MODEL="${FIX_MODEL:-opus}"
# MIN_OPEN=1: only run discovery when the queue is EMPTY (was 3 — topping up to a backlog of 3
# pressured the model to keep filing marginal findings on a picked-over codebase; quality > quota).
MIN_OPEN="${MIN_OPEN:-1}"
# DRY_LIMIT: stop the whole run after this many consecutive discovery passes that find NOTHING new
# (and nothing left to fix) — loop-until-dry, so the run ends instead of manufacturing noise.
DRY_LIMIT="${DRY_LIMIT:-2}"
VERIFY="${VERIFY:-1}"

command -v agy    >/dev/null || { echo "ERROR: 'agy' (Antigravity CLI) not on PATH." >&2; exit 1; }
command -v claude >/dev/null || { echo "ERROR: 'claude' (Claude Code CLI) not on PATH." >&2; exit 1; }
[ -d node_modules ] || { echo "ERROR: node_modules missing — run 'npm install'." >&2; exit 1; }

mkdir -p .ralph
[ -f "$QUEUE" ] || cp "$KIT/bug-queue.seed.md" "$QUEUE"

# --- single-run lock (mkdir is atomic) --------------------------------------
LOCK=.ralph/lock
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "ERROR: a loop run is already active (lock: $LOCK). Remove if stale: rmdir $LOCK" >&2
  exit 1
fi
echo "$$" > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT INT TERM

# Count findings of a given status — only BELOW the "findings below this line" marker, so the
# format example in the queue header is never miscounted.
count_status() { awk -v s="$1" '/<!-- findings below this line -->/{f=1; next} f && $0=="- status: "s {c++} END{print c+0}' "$QUEUE" 2>/dev/null; }
open_count() { count_status open; }
# total findings filed (any status) — to detect whether a discovery pass actually added anything.
findings_count() { awk '/<!-- findings below this line -->/{f=1; next} f && /^## BUG-Q-/{c++} END{print c+0}' "$QUEUE" 2>/dev/null; }

i=0
dry=0   # consecutive discovery passes that produced NO new findings
while [ ! -f .ralph/STOP ] && [ "$i" -lt "$MAX_ITERS" ]; do
  i=$((i + 1))
  echo "════ agy-qa iter $i · $(date -u +%FT%TZ) ════" | tee -a .ralph/loop.log

  # 1) DISCOVERY — only when the queue is empty (MIN_OPEN=1). Track a "dry" streak: if discovery
  #    finds nothing new DRY_LIMIT times running and there's nothing left to fix, the well is dry —
  #    stop, rather than grind out marginal findings to fill iterations.
  if [ "$(open_count)" -lt "$MIN_OPEN" ]; then
    before=$(findings_count)
    echo "── [agy] discovery (open=$(open_count) < $MIN_OPEN) ──" | tee -a .ralph/loop.log
    RALPH_ITER="$i" agy -p "$(cat "$KIT/bug_check.agy.md")" \
        --model "$CHECK_MODEL" --dangerously-skip-permissions --print-timeout 20m 2>&1 \
        | tee -a .ralph/loop.log
    if [ "$(findings_count)" -le "$before" ]; then
      dry=$((dry + 1))
      echo "── discovery dry ($dry/$DRY_LIMIT) — no new findings ──" | tee -a .ralph/loop.log
      if [ "$dry" -ge "$DRY_LIMIT" ] && [ "$(open_count)" -eq 0 ]; then
        echo "agy-qa: discovery dry ${DRY_LIMIT}× with an empty queue — stopping (well is dry, no noise-filling)." | tee -a .ralph/loop.log
        break
      fi
    else
      dry=0
    fi
  fi

  # 2) FIX — Claude fixes the top open finding (gate-green or revert).
  if [ "$(open_count)" -gt 0 ]; then
    echo "── [claude] fix top open finding ──" | tee -a .ralph/loop.log
    RALPH_ITER="$i" claude -p "$(cat "$KIT/fix.prompt.md")" \
        --dangerously-skip-permissions --model "$FIX_MODEL" 2>&1 | tee -a .ralph/loop.log
  else
    echo "── no open findings to fix this iter ──" | tee -a .ralph/loop.log
  fi

  # 3) VERIFY — Antigravity independently checks the most-recent fix (cross-model critic).
  if [ "$VERIFY" = "1" ] && [ "$(count_status fixed)" -gt 0 ]; then
    echo "── [agy] cross-model verify ──" | tee -a .ralph/loop.log
    RALPH_ITER="$i" agy -p "$(cat "$KIT/verify.agy.md")" \
        --model "$CHECK_MODEL" --dangerously-skip-permissions --print-timeout 12m 2>&1 \
        | tee -a .ralph/loop.log
  fi

  sleep 3
done

if [ -f .ralph/STOP ]; then
  echo "agy-qa halted: .ralph/STOP present after $i iteration(s)." | tee -a .ralph/loop.log
else
  echo "agy-qa halted: hit cap of $MAX_ITERS iteration(s)." | tee -a .ralph/loop.log
fi

# --- end-of-run full sweep (safety net) -------------------------------------
echo "── Full backpressure sweep (npm run build:check + npm test) ──" | tee -a .ralph/loop.log
sweep_ok=1
npm run build:check || sweep_ok=0
npm test || sweep_ok=0
[ "$sweep_ok" -eq 1 ] && echo "✓ Full sweep GREEN." | tee -a .ralph/loop.log \
                      || echo "✗ Full sweep RED — investigate before trusting the run." | tee -a .ralph/loop.log
echo "Queue status: $(count_status open) open · $(count_status fixed) fixed · $(count_status verified) verified · $(count_status disputed) disputed" | tee -a .ralph/loop.log
