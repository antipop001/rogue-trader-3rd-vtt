# Local-model checker — Qwen/Ollama setup (optional variant)

The **production** bug loop is the Antigravity one (`run_agy_qa.sh` — see `README.md`): `agy`/Gemini
is the strongest available *finder + verifier*, which is what makes the cross-model pass worth
running. This file documents an **optional, lower-signal variant** that swaps only the *checker* to
a **local LLM** (no API cost, runs offline), keeping Claude as fixer and `agy`/Gemini as verifier:

```
local LLM (Ollama, Qwen2.5-Coder)  ──find──►  .ralph/bug-queue.md  ──►  claude fixes  ──►  agy verifies
```

**Set expectations.** A local 14B is materially weaker than Gemini at this task — expect more
"questions" than confirmed bugs and shakier rule citations (the local brief makes it write
`canon: unsure` rather than invent a rule). The fixer's confirm-or-`wontfix` gate + the strong
`agy` verify are the backstop. Use this when you want a cheap/offline first pass, not as the
primary product.

---

## The GPU box reality (whisperx, RTX 3060) — three constraints

Discovered while wiring this up (2026-06-30), all worked around with **no root**:

1. **Driver 535 is too old for Ollama's CUDA build** (it wants 550+). Ollama falls back to
   **Vulkan**, which still uses the GPU (~9 GB of the 14B model loads on the card). Expect a
   `NVIDIA driver too old` WARN followed by `library=Vulkan … 12.0 GiB` in the serve log — that's
   fine, it's GPU-accelerated, just not CUDA.
2. **No passwordless sudo for `ahermon`** → install Ollama **userspace** (a tarball under `~/`, no
   system service).
3. **`:11434` is firewalled** (only ComfyUI's `:8188` is open to the LAN) → reach Ollama from the
   loop host over an **SSH tunnel** (port 22 is open).
4. **ComfyUI shares the 12 GB card.** It loads ~6–8 GB when generating, which won't co-exist with
   the 14B model. Stop/idle ComfyUI during a local-checker run, or use `qwen2.5-coder:7b` (~5 GB)
   so they fit together.

---

## Setup

### 1. Install Ollama userspace (on whisperx)
```bash
mkdir -p ~/ollama-bin && cd ~/ollama-bin
curl -fL https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64.tar.zst -o /tmp/o.tar.zst
tar --zstd -xf /tmp/o.tar.zst -C ~/ollama-bin       # zstd + tar --zstd are present on the box
```

### 2. Serve on the LAN + pull the model (on whisperx)
```bash
OLLAMA_HOST=0.0.0.0:11434 ~/ollama-bin/bin/ollama serve >> ~/ollama-serve.log 2>&1 &
~/ollama-bin/bin/ollama pull qwen2.5-coder:14b      # ~9 GB; best code model at this size
# (or qwen2.5-coder:7b ~5 GB if it must share the GPU with ComfyUI)
```
Verify GPU offload:  after a request, `nvidia-smi` should show ~9 GB used and the serve log a
`library=Vulkan` line.

### 3. Open the SSH tunnel (on the loop host / dev LXC)
```bash
ssh -fN -L 11434:127.0.0.1:11434 ahermon@192.168.11.22     # dev-LXC:11434 → whisperx:11434
curl -fsS http://127.0.0.1:11434/api/tags                   # should list qwen2.5-coder
```

### 4. Run the hybrid loop (from tmux, dedicated branch)
```bash
git switch -c ralph/agy-qa-local
./loops/antigravity-qa/run_local_qa.sh 15      # OLLAMA_HOST defaults to the tunnel
```
Knobs: `LOCAL_MODEL` (default `qwen2.5-coder:14b`), `OLLAMA_HOST`, `MIN_OPEN`, `VERIFY`.

---

## Optional — keep it always-on across reboots (no root)

The GPU box has cron **inactive** and can't enable linger without sudo, so it can't self-start
Ollama at boot. The fix: let the **dev LXC** (which has a working cron) supervise both. The
`ollama_watchdog.sh` here, run from the dev LXC's cron, (re)starts Ollama on whisperx over SSH and
keeps the tunnel up — idempotent, safe every 2 minutes. Install with `crontab -e` on the dev LXC:
```cron
@reboot sleep 20 && /home/ahermon/rogue-trader-3rd-vtt/loops/antigravity-qa/ollama_watchdog.sh
*/2 * * * *        /home/ahermon/rogue-trader-3rd-vtt/loops/antigravity-qa/ollama_watchdog.sh
```
It logs to `~/.local/share/ollama-watchdog.log`. Only worth doing if you'll use the local checker
regularly — otherwise just start Ollama + the tunnel on demand with the steps above. (Leaving
Ollama always-on also keeps the GPU busy, blocking ComfyUI image-gen.)

---

## How the harness works (`local_check.py`)

A **constrained per-file** review — weak models flail at open-ended agentic exploration. It feeds
the model ONE engine file at a time (`src/module/rolls/*`, `rules/*`, `documents/*`), asks it to
reason then end with a `{"findings":[…]}` object, extracts it, dedups against existing queue
titles, and appends new ones to `.ralph/bug-queue.md`. Talks to Ollama's HTTP API (stdlib only).

**Gotcha that cost an hour:** do NOT use Ollama's `format:"json"` — it suppresses reasoning and the
model emits the simplest valid object (`{}`), missing even an obvious bug. The harness deliberately
lets the model reason and then extracts the trailing JSON. (Already baked in — noted here so it
isn't "fixed" back.)

## Files
| File | Role |
|---|---|
| `run_local_qa.sh` | hybrid driver (local find → claude fix → agy verify) |
| `local_check.py` | per-file review harness (Ollama HTTP, stdlib only) |
| `bug_check_local.md` | tight local-model brief (cite code; say `unsure`, don't invent rules) |
| `ollama_watchdog.sh` | optional dev-LXC cron supervisor for Ollama + the tunnel |

Verified end-to-end on whisperx (2026-06-30): userspace Ollama + Vulkan, `qwen2.5-coder:14b`
loaded on the 3060, reached via the tunnel, producing well-formed `canon: unsure` findings.
