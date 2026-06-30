#!/usr/bin/env bash
# Reboot/crash-persistent supervisor for the local-LLM checker, driven from the DEV LXC (the box
# with a working cron daemon). Keeps Ollama serving on the GPU box AND the SSH tunnel up — needs
# NO root on either box. The GPU box (whisperx) has cron inactive + no sudo for linger, so it can't
# self-start Ollama at boot; instead this watchdog (run from the dev LXC's cron) (re)starts it
# remotely over SSH. Idempotent — safe to run every couple of minutes.
#
# Install (dev LXC):  crontab -e  →
#   @reboot sleep 20 && /home/ahermon/rogue-trader-3rd-vtt/loops/antigravity-qa/ollama_watchdog.sh
#   */2 * * * *        /home/ahermon/rogue-trader-3rd-vtt/loops/antigravity-qa/ollama_watchdog.sh
set -uo pipefail

WX="${WX:-ahermon@192.168.11.22}"
PORT="${TUNNEL_PORT:-11434}"
SOCK="${OLLAMA_TUNNEL_SOCK:-/tmp/ollama-tunnel.sock}"
LOG="$HOME/.local/share/ollama-watchdog.log"
mkdir -p "$(dirname "$LOG")"
ts() { date -u +%FT%TZ; }
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=10 "$WX")

# 1) Ensure Ollama is serving on the GPU box (start it detached if it isn't running).
if ! "${SSH[@]}" 'pgrep -f "ollama-bin/bin/ollama serve" >/dev/null' 2>/dev/null; then
  "${SSH[@]}" "setsid bash -c 'OLLAMA_HOST=0.0.0.0:11434 \$HOME/ollama-bin/bin/ollama serve >> \$HOME/ollama-serve.log 2>&1' >/dev/null 2>&1 &" 2>/dev/null \
    && echo "$(ts) started ollama serve on $WX" >> "$LOG"
fi

# 2) Ensure the SSH tunnel reaches Ollama end-to-end (re-establish if the path is down). The API
#    call tests tunnel + server together; if it fails, tear the (possibly stale) tunnel and rebuild.
if ! curl -fsS --max-time 5 "http://127.0.0.1:${PORT}/api/tags" >/dev/null 2>&1; then
  ssh -S "$SOCK" -O exit "$WX" 2>/dev/null
  ssh -fN -M -S "$SOCK" -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
      -L "${PORT}:127.0.0.1:${PORT}" "$WX" 2>/dev/null \
    && echo "$(ts) (re)established tunnel :$PORT" >> "$LOG"
fi
