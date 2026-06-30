#!/usr/bin/env bash
# Antigravity-QA loop — HYBRID variant (the CHECKER is swapped to a LOCAL model).
#
#   local LLM (Ollama, e.g. Qwen2.5-Coder)  = the BUG CHECKER  (cheap, high-volume discovery)
#   claude (Claude Code, Opus)               = the FIXER         (unchanged)
#   agy    (Antigravity / Gemini)            = the VERIFIER      (kept strong — the costly judgment)
#
# Rationale: a local model is the weakest at this task, so it does only the high-volume / low-stakes
# finding; Claude fixes; a strong model verifies (where being wrong is most expensive). Findings
# flow through the same `.ralph/bug-queue.md`.
#
# PREREQ — on the GPU box (the RTX 3060 host), run an Ollama server with a code model:
#     curl -fsSL https://ollama.com/install.sh | sh        # if not installed
#     OLLAMA_HOST=0.0.0.0:11434 ollama serve &             # listen on the LAN
#     ollama pull qwen2.5-coder:14b                         # ~9 GB at Q4 — fits the 3060's 12 GB
# Then point this loop at it via OLLAMA_HOST (default http://192.168.11.22:11434).
#
# Launch from a real terminal (tmux), on a dedicated branch:
#     git switch -c ralph/agy-qa-local
#     ./loops/antigravity-qa/run_local_qa.sh 15
#
# Env: OLLAMA_HOST, LOCAL_MODEL (default qwen2.5-coder:14b), MIN_OPEN (3), VERIFY (1),
#      CHECK_MODEL (agy verify model), FIX_MODEL (claude model).
set -uo pipefail

cd "$(dirname "$0")/../.." || exit 1
KIT="loops/antigravity-qa"
QUEUE=".ralph/bug-queue.md"

MAX_ITERS="${1:-15}"
LOCAL_MODEL="${LOCAL_MODEL:-qwen2.5-coder:14b}"
# Default to the SSH tunnel (whisperx :11434 is firewalled to :8188 only — see README). Start it
# with:  ssh -fN -L 11434:127.0.0.1:11434 ahermon@192.168.11.22
OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
CHECK_MODEL="${CHECK_MODEL:-Gemini 3.1 Pro (High)}"   # agy model for the VERIFY phase
FIX_MODEL="${FIX_MODEL:-opus}"
MIN_OPEN="${MIN_OPEN:-3}"
VERIFY="${VERIFY:-1}"
export LOCAL_MODEL OLLAMA_HOST

command -v claude >/dev/null || { echo "ERROR: 'claude' not on PATH." >&2; exit 1; }
[ "$VERIFY" = "1" ] && { command -v agy >/dev/null || { echo "ERROR: 'agy' not on PATH (needed for VERIFY=1)." >&2; exit 1; }; }
[ -d node_modules ] || { echo "ERROR: node_modules missing — run 'npm install'." >&2; exit 1; }

# Reachability check for the local model server.
if ! curl -fsS --max-time 8 "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
  echo "ERROR: cannot reach Ollama at ${OLLAMA_HOST}." >&2
  echo "  1) On the GPU box: ~/ollama-bin/bin/ollama serve   (OLLAMA_HOST=0.0.0.0:11434)" >&2
  echo "     and: ~/ollama-bin/bin/ollama pull ${LOCAL_MODEL}" >&2
  echo "  2) On this host (since :11434 is firewalled): open the tunnel —" >&2
  echo "     ssh -fN -L 11434:127.0.0.1:11434 ahermon@192.168.11.22" >&2
  exit 1
fi
echo "local checker: ${LOCAL_MODEL} @ ${OLLAMA_HOST} · fixer: claude/${FIX_MODEL} · verifier: agy/${CHECK_MODEL}"

mkdir -p .ralph
[ -f "$QUEUE" ] || cp "$KIT/bug-queue.seed.md" "$QUEUE"

LOCK=.ralph/lock
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "ERROR: a loop run is already active (lock: $LOCK). Remove if stale: rmdir $LOCK" >&2
  exit 1
fi
echo "$$" > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT INT TERM

count_status() { awk -v s="$1" '/<!-- findings below this line -->/{f=1; next} f && $0=="- status: "s {c++} END{print c+0}' "$QUEUE" 2>/dev/null; }

i=0
while [ ! -f .ralph/STOP ] && [ "$i" -lt "$MAX_ITERS" ]; do
  i=$((i + 1))
  echo "════ local-qa iter $i · $(date -u +%FT%TZ) ════" | tee -a .ralph/loop.log

  # 1) DISCOVERY — LOCAL model, constrained per-file review.
  if [ "$(count_status open)" -lt "$MIN_OPEN" ]; then
    echo "── [local:${LOCAL_MODEL}] discovery (open=$(count_status open) < $MIN_OPEN) ──" | tee -a .ralph/loop.log
    RALPH_ITER="$i" python3 "$KIT/local_check.py" 2>&1 | tee -a .ralph/loop.log
  fi

  # 2) FIX — Claude fixes the top open/disputed finding (gate-green or revert).
  if [ "$(count_status open)" -gt 0 ]; then
    echo "── [claude] fix top open finding ──" | tee -a .ralph/loop.log
    RALPH_ITER="$i" claude -p "$(cat "$KIT/fix.prompt.md")" \
        --dangerously-skip-permissions --model "$FIX_MODEL" 2>&1 | tee -a .ralph/loop.log
  else
    echo "── no open findings to fix this iter ──" | tee -a .ralph/loop.log
  fi

  # 3) VERIFY — Antigravity/Gemini independently checks the fix (kept on the strong model).
  if [ "$VERIFY" = "1" ] && [ "$(count_status fixed)" -gt 0 ]; then
    echo "── [agy] cross-model verify ──" | tee -a .ralph/loop.log
    RALPH_ITER="$i" agy -p "$(cat "$KIT/verify.agy.md")" \
        --model "$CHECK_MODEL" --dangerously-skip-permissions --print-timeout 12m 2>&1 | tee -a .ralph/loop.log
  fi

  sleep 3
done

[ -f .ralph/STOP ] && echo "local-qa halted: STOP after $i iter(s)." | tee -a .ralph/loop.log \
                    || echo "local-qa halted: cap $MAX_ITERS." | tee -a .ralph/loop.log
echo "── Full sweep (build:check + npm test) ──" | tee -a .ralph/loop.log
sweep_ok=1; npm run build:check || sweep_ok=0; npm test || sweep_ok=0
[ "$sweep_ok" -eq 1 ] && echo "✓ sweep GREEN." | tee -a .ralph/loop.log || echo "✗ sweep RED — investigate." | tee -a .ralph/loop.log
echo "Queue: $(count_status open) open · $(count_status fixed) fixed · $(count_status verified) verified · $(count_status disputed) disputed" | tee -a .ralph/loop.log
