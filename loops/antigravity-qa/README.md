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

## Files
| File | Becomes / role |
|---|---|
| `run_agy_qa.sh` | the loop driver (cd's to repo root) |
| `bug_check.agy.md` | agy discovery brief |
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
