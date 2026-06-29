# 08 — Antigravity QA / bug-pass loop (cross-model)

A **cross-model correctness loop**: Antigravity (`agy`, Gemini) hunts for bugs and verifies
fixes; Claude Code (`claude`, Opus) fixes them. Unlike `specs/07` (a single-model discovery loop
that only filed findings), this loop closes the loop — find → fix → independently verify — with
the checker and fixer on DIFFERENT models so each catches the other's blind spots.

Copy `spec.md` → `specs/08-antigravity-qa.md` when launching.

## Requirements

- **AGYQA-001 — Cross-model roles.** Discovery + verification run on `agy`; fixes run on `claude`.
  The fixer must never self-certify a fix as `verified` — only the `agy` verify phase sets
  `verified`.
- **AGYQA-002 — Shared queue.** All state lives in `.ralph/bug-queue.md` (committed). One finding
  is processed per fix-iteration: the top-most `status: open`, or any `status: disputed` first.
- **AGYQA-003 — Evidence-based findings.** Every finding cites a `file:line` actually read and, for
  a rules bug, a canon reference in `/mnt/project_data/RT/RT-DOCS/`. No speculative findings.
- **AGYQA-004 — Dedup.** The checker must not re-file anything already in the queue, `QA_FINDINGS.md`,
  the `CLAUDE.md` changelog, or `.ralph/data-vendor-queue.md` (unless it has fresh evidence the
  current code is still wrong).
- **AGYQA-005 — Gate.** A fix is committed only when `npm run build:check` (exit 0) AND `npm test`
  are green; behavioural fixes are additionally live-verified on rt-smoke. Never commit a red or
  dirty tree — revert + log to `.ralph/errors.log` instead.
- **AGYQA-006 — Honest status.** `wontfix` requires a one-line reason; `disputed` requires a
  specific reason naming the canon/edge case missed. The fixer addresses disputes before new work.
- **AGYQA-007 — One finding per iteration, no scope creep.** Minimal correct change; pure helpers
  get a node test in `tests/chargen/` (the suite is the ratchet).
- **AGYQA-008 — Stop conditions.** The loop halts on `.ralph/STOP` or the iteration cap; a lockfile
  prevents overlapping runs; an end-of-run full sweep re-checks the gate.

## Non-goals
- Not a content/rules-authoring loop — rules-faithfulness items the gate can't verify are logged to
  `.ralph/data-vendor-queue.md`, not "fixed" by guessing.
- Not a refactor loop — only correctness bugs with evidence.
