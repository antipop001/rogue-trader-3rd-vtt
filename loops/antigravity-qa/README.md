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
1. **Discovery** — if the queue has fewer than `MIN_OPEN` (default 1 → only when empty) open
   findings, `agy` reviews the code against RT canon and appends 0–2 high-confidence findings
   (`bug_check.agy.md` is its brief). It dedups against the queue, `QA_FINDINGS.md`, and the
   changelog. If discovery finds nothing new `DRY_LIMIT` (default 2) passes running and the queue
   is empty, the run **stops** — the loop runs until dry rather than manufacturing marginal
   findings to fill iterations.
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
| `MIN_OPEN` | `1` | run discovery when open findings drop below this (1 = only on an empty queue) |
| `DRY_LIMIT` | `2` | stop the run after this many consecutive discovery passes that find nothing new |
| `VERIFY` | `1` | run the agy cross-model verify phase (`0` to skip) |

## Operating notes / lessons (tuned after the 0.8.24–0.8.26 runs)
- **Always do an independent pre-merge review.** The loop's own `agy` verify is strong but shares
  a failure mode with the fixer on subtle rules: a fix that reasons by ANALOGY can pass both fix
  and verify (it happened with Daemonic stacking — the verbatim trait gives ×4, both models said
  ×3). Before merging a run, fan out one independent canon reviewer per `verified` finding (read
  the diff + the verbatim RT-DOCS rule). Cheap relative to a bad merge; it's what caught it.
- **Point each run at fresh surface.** The combat core is picked over (0.8.0–0.8.26); re-sweeping
  it yields mostly false positives. Aim a new run at a subsystem not yet swept (Navigator/psychic,
  chargen commit, NPC data, ship/vehicle edges) where real-bug density is higher.
- **Quality over quota.** The discovery brief asks for 0–2 high-confidence findings and treats
  "nothing solid this pass" as a valid result; `DRY_LIMIT` ends the run when the well is dry.
  Resist re-raising `MIN_OPEN` — a backlog target is exactly what manufactures marginal findings.
- **Most false findings cite the wrong book.** DH2 / Black Crusade / Only War rules read as
  plausible but aren't RT 1e; the local RT-DOCS qualities glossary is incomplete. Both briefs now
  require a verbatim RT-1e file:line and treat a non-RT citation as disqualifying.

## Local-model variant (optional)

`run_agy_qa.sh` (Antigravity/Gemini) is the **primary, recommended** loop — a strong independent
model is what makes the cross-model pass worth running. There is also a lower-signal **hybrid**
that swaps only the *checker* to a local LLM (Qwen2.5-Coder via Ollama), keeping Claude as fixer and
`agy`/Gemini as verifier — useful for a cheap/offline first pass. It is fully documented separately:
**see [`LOCAL_MODEL_SETUP.md`](LOCAL_MODEL_SETUP.md)** (driver/Vulkan/firewall workarounds, the SSH
tunnel, `run_local_qa.sh`, and an optional always-on watchdog).

## Files
| File | Becomes / role |
|---|---|
| `run_agy_qa.sh` | **primary** all-Antigravity loop driver (cd's to repo root) |
| `bug_check.agy.md` | agy discovery brief |
| `fix.prompt.md` | claude fix brief |
| `verify.agy.md` | agy verify brief |
| `bug-queue.seed.md` | seeds `.ralph/bug-queue.md` (the shared work queue) |
| `LOCAL_MODEL_SETUP.md` + `run_local_qa.sh` / `local_check.py` / `bug_check_local.md` / `ollama_watchdog.sh` | the optional local-model variant |
| `spec.md` | → `specs/08-antigravity-qa.md` (the loop's requirements) |

## Notes
- Same gate as every loop here: `npm run build:check` + `npm test`. The Playwright E2E tier is
  driven per-finding by the fixer when a change is behavioural, not by the loop.
- Authored/rules-faithfulness items the gate can't see go to `.ralph/data-vendor-queue.md`.
- `.ralph/bug-queue.md` is committed (the audit trail). `.ralph/lock` + `loop.log` are gitignored.
- The checker and fixer use SEPARATE accounts/quota (`agy` = Antigravity, `claude` = Claude Code);
  a long run consumes both.
