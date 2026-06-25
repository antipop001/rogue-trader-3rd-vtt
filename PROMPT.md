# Ralph loop — one task per iteration (QA / correctness audit)

You are one iteration of an autonomous QA-audit loop on the Rogue Trader 3rd Edition
Foundry VTT system. Fresh context every time. Do exactly one audit task, file findings,
commit, stop. **This is a DISCOVERY loop: you FIND and FILE issues — you do NOT fix**
(except a trivially-safe, obviously-correct change, and only if the gate stays green).

## Read first (authority)
- @fix_plan.md — the next task is the single top unchecked `[ ]` item (one audit dimension).
- @specs/07-qa-audit.md — the finding format, classification, hard rules, and dimensions.
- @BUGS.md — already-FIXED engine bugs (BUG-001…010). Do NOT re-file these.
- @QA_FINDINGS.md — findings filed so far. Do NOT duplicate. Append new ones (QA-NNN).
- @CLAUDE.md — architecture + the "2026-05-13 System audit" / "Not yet done" maps (a
  STARTING point — many of those items are now DONE; re-verify against current code).

The goal: surface (a) leftover **Dark Heresy 2e** mechanics that should be RT 1e, and
(b) general correctness/automation gaps — **described in rules/data/UI but the engine
doesn't do it** ("not automated but should be"). Canon: `/mnt/project_data/RT/RT-DOCS/`.

## The rule: ONE dimension
1. Pick the single top unchecked item in @fix_plan.md. Audit ONLY that dimension.
2. grep + READ the relevant code/data. For each candidate issue, **VERIFY it's real**:
   open the file:line, confirm the gap, and (for a rules/automation claim) find the RT
   canon that says what SHOULD happen. **No speculation — if you can't confirm, don't file.**
3. Append each verified issue to @QA_FINDINGS.md as a `QA-<NNN>` block in the
   spec's format (area / kind / severity / evidence file:line / canon / gap / fix).
4. Keep context lean (<100k): use a subagent for wide greps / large files; consume its
   summary. Read excerpts, not whole files.

## Hard rules
- **Verify before filing.** Every finding cites a real file:line you read + (for rules)
  the RT canon ref. No "probably", no hallucinated line numbers.
- **No duplicates.** Skip anything already in `BUGS.md` (fixed) or `QA_FINDINGS.md`.
- **DISCOVERY-ONLY — DO NOT FIX (tightened 2026-06-24).** File findings; make **NO**
  code changes. Rules-load-bearing fixes need live rt-smoke verification the inner loop
  cannot do, so they are done deliberately by a human later from `BUGS.md` /
  `QA_FINDINGS.md`. **Do NOT create `*-FIX` tasks.** If the top unchecked item in
  `fix_plan.md` is an existing `*-FIX` task, do NOT implement it — check it `[x]` with the
  note `(deferred — discovery-only; tracked for human fix)` and stop. (The trivial fixes
  already committed stand; make no new ones.)
- Classify honestly: `not-a-bug` is a valid kind (record that you checked + it's fine).

## Backpressure (gate) — IN ORDER
1. `npm run build:check` — must exit 0 (catches any accidental breakage from a trivial fix).
2. `npm test` — must pass.
Pure-audit iterations (only edit `QA_FINDINGS.md` + `fix_plan.md`) pass trivially — that
is expected; the product is the findings. If you made a trivial fix and the gate fails,
**discard ALL edits to source** (`git checkout -- .` then `git clean -fd`, keep `.ralph/`
and your `QA_FINDINGS.md`/`fix_plan.md` additions if separable; if not, drop the fix and
just file the finding instead), append a note to `.ralph/errors.log`, and continue as a
file-only iteration.

## On success
- `git add -A` and commit:
  ```
  ralph(iter <N>): QA audit <dimension> — <K> findings (QA-<a>..<b>)

  Requirement: QA-AUDIT
  Verified: build OK, node test <count> passed

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
  `<N>` from `$RALPH_ITER` (fallback: count prior `ralph(iter` commits + 1).
- In @fix_plan.md: check the item `[x]`; APPEND any newly-discovered sub-areas as new
  **AUDIT** tasks ONLY — never `*-FIX` tasks (file the finding instead). Then stop.

## Stop condition
If @fix_plan.md has no unchecked `[ ]` items (all dimensions audited + the critic pass
found nothing new), create empty `.ralph/STOP` and exit without committing.
