# Antigravity QA / bug-pass loop — cross-model find → fix → verify

A second-opinion correctness pass that pits **two different models** against the codebase:

| Role | Tool | Model |
|---|---|---|
| Bug **checker** + **verifier** | `agy` (Google Antigravity) | Gemini 3.1 Pro (High) |
| Bug **fixer** | `claude` (Claude Code) | Opus |

The value is *independence*: Claude wrote most of this system, so a Gemini reviewer catches
correctness bugs Claude's own model would rubber-stamp — and Gemini then verifies each Claude fix
before it's accepted. Findings flow through one shared file, `.ralph/bug-queue.md`.

## How one iteration works (`run_agy_qa.sh`)
1. **Discovery** — if the queue has fewer than `MIN_OPEN` (default 3) open findings, `agy` reviews
   the engine (`src/module/rolls`, `rules`, `documents`) against RT canon and appends new findings
   (`bug_check.agy.md` is its brief). It dedups against the queue, `QA_FINDINGS.md`, and the
   changelog.
2. **Fix** — `claude` takes the top open (or `disputed`) finding, confirms it's real, fixes it,
   runs the gate (`npm run build:check` + `npm test`) and a live rt-smoke check if behavioural,
   marks it `fixed`, and commits (`fix.prompt.md` is its brief).
3. **Verify** — `agy` independently reads the fix's diff + the canon and marks the finding
   `verified` or `disputed` (`verify.agy.md` is its brief). Disputed findings are re-fixed first
   next iteration.

Status lifecycle: `open → fixing → fixed → verified | disputed | wontfix`.

## Launch
Run from a **real terminal (tmux)** — never a Claude `!` prompt — on a dedicated branch:

```bash
cd ~/rogue-trader-3rd-vtt
git switch -c ralph/agy-qa
tmux new -s agyqa
./loops/antigravity-qa/run_agy_qa.sh 15      # cap at 15 fix-iterations
```

The first run seeds `.ralph/bug-queue.md` from `bug-queue.seed.md` (empty queue → discovery runs).
Stops on `.ralph/STOP` or the cap; a single lockfile prevents overlapping runs. An end-of-run
full sweep re-checks the gate.

## Env overrides
| Var | Default | Meaning |
|---|---|---|
| `CHECK_MODEL` | `Gemini 3.1 Pro (High)` | agy model for discovery + verify (see `agy models`) |
| `FIX_MODEL` | `opus` | claude model for fixes |
| `MIN_OPEN` | `3` | replenish discovery when open findings drop below this |
| `VERIFY` | `1` | run the agy cross-model verify phase (`0` to skip) |

## Local-model variant — swap the CHECKER to a local LLM (`run_local_qa.sh`)

A hybrid: a **local model finds**, **Claude fixes**, **`agy`/Gemini verifies** (keep the strong
model for the costly judgment). The local model is the weakest link at this task, so it does only
the high-volume / low-stakes discovery, and via a CONSTRAINED per-file review (weak models flail at
open-ended agentic exploration) — `local_check.py` feeds it one engine file at a time and asks for
findings in a strict JSON schema, then dedups (against existing queue titles only) and appends.

**Setup — on the GPU box (whisperx, RTX 3060).** It has no passwordless sudo and its driver is
535 (too old for Ollama's CUDA build, which wants 550+) — so install Ollama **userspace** and let
it fall back to **Vulkan** (still GPU-accelerated; ~9 GB of the 14B model loads on the card):
```bash
mkdir -p ~/ollama-bin && cd ~/ollama-bin
curl -fL https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64.tar.zst -o /tmp/o.tar.zst
tar --zstd -xf /tmp/o.tar.zst -C ~/ollama-bin
OLLAMA_HOST=0.0.0.0:11434 ~/ollama-bin/bin/ollama serve &      # listen on the LAN
~/ollama-bin/bin/ollama pull qwen2.5-coder:14b                  # ~9 GB; best code model at this size
```
(The driver-535 → CUDA warning is expected; the next log line shows `library=Vulkan … 12.0 GiB` —
it IS using the GPU. ComfyUI shares this 12 GB card, so stop/idle it during a run: it loads ~6-8 GB
when generating, which won't co-exist with the 14B model.)

**Tunnel — `:11434` is firewalled (only `:8188` is open to the LAN), so reach it over SSH from the
loop host:**
```bash
ssh -fN -L 11434:127.0.0.1:11434 ahermon@192.168.11.22         # dev-LXC:11434 → whisperx:11434
```
**Run (from tmux, dedicated branch)** — the driver defaults `OLLAMA_HOST` to the tunnel:
```bash
git switch -c ralph/agy-qa-local
./loops/antigravity-qa/run_local_qa.sh 15
```
Expect lower signal-to-noise than the Gemini checker — more false findings and shakier canon
citations (the local brief tells it to say `canon: unsure` rather than invent a rule). The fixer's
confirm-or-`wontfix` gate + the strong-model verify are what keep it honest. Knobs: `LOCAL_MODEL`
(default `qwen2.5-coder:14b`), `OLLAMA_HOST`, `MIN_OPEN`, `VERIFY`.

## Files
| File | Becomes / role |
|---|---|
| `run_agy_qa.sh` | all-Antigravity loop driver (cd's to repo root) |
| `run_local_qa.sh` | **hybrid** driver — local checker + claude fixer + agy verifier |
| `local_check.py` | local-model per-file review harness (Ollama HTTP, stdlib only) |
| `bug_check.agy.md` | agy discovery brief |
| `bug_check_local.md` | tighter local-model discovery brief (guards against hallucinated canon) |
| `fix.prompt.md` | claude fix brief |
| `verify.agy.md` | agy verify brief |
| `bug-queue.seed.md` | seeds `.ralph/bug-queue.md` (the shared work queue) |
| `spec.md` | → `specs/08-antigravity-qa.md` (the loop's requirements) |

## Notes
- Same gate as every loop here: `npm run build:check` + `npm test`. The Playwright E2E tier is
  driven per-finding by the fixer when a change is behavioural, not by the loop.
- Authored/rules-faithfulness items the gate can't see go to `.ralph/data-vendor-queue.md`.
- `.ralph/bug-queue.md` is committed (the audit trail). `.ralph/lock` + `loop.log` are gitignored.
- The checker and fixer use SEPARATE accounts/quota (`agy` = Antigravity, `claude` = Claude Code);
  a long run consumes both.
