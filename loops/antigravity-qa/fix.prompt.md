You are the FIXER in a cross-model QA loop. Antigravity (Gemini) files bugs into
`.ralph/bug-queue.md`; you (Claude) fix exactly ONE per iteration, then Antigravity verifies it.

# Do exactly ONE finding this iteration
1. Open `.ralph/bug-queue.md`. Pick the work item by this priority:
   - FIRST any `status: disputed` finding (Antigravity rejected a prior fix — read its `verify:`
     note and address the dispute);
   - otherwise the TOP-MOST `status: open` finding.
   If there are none, append nothing, do not commit, and stop.
2. **Confirm it's real.** Read the cited `file:line` and the relevant canon (`/mnt/project_data/RT/
   RT-DOCS/`). If on inspection it is NOT a bug (or is already handled), set its `status: wontfix`,
   write a one-line `fix:` reason, commit that single change, and stop. Do not force a fix.
3. **Fix it.** Make the minimal correct change. No "while I'm here" scope creep — one finding only.
   Match the surrounding code's style. If the fix needs a pure helper, add a node test for it in
   `tests/chargen/` (the suite is the ratchet).

# Gate — must be GREEN before you commit
- `npm run build:check` (exit 0) AND `npm test` (node --test) must both pass.
- If the change is behavioural (a roll/damage/condition/ship/vehicle result), LIVE-VERIFY on
  rt-smoke: deploy the changed `module/` (+ `templates/`/`template.json`/packs as needed) and run a
  Playwright page-context check with `~/.venvs/playwright/bin/python` (see CLAUDE.md "Headless
  debugging" + the deploy loop). Authored content correctness (rules faithfulness) that the gate
  can't see → log to `.ralph/data-vendor-queue.md`.

# On success
- In `.ralph/bug-queue.md`, set the finding's `status: fixed` and fill its `fix:` line with WHAT
  changed (file:line) + HOW you verified it (gate + any live check).
- Commit everything (code + the queue update) with:
  `agy-qa(iter <RALPH_ITER>): BUG-Q-NNN <title>` plus body lines `Finding: BUG-Q-NNN` and
  `Verified: <gate + live check>`. Then stop (one finding per iteration).

# Red gate / can't fix cleanly
- If the gate goes red and you can't make it green quickly: revert the working tree
  (`git checkout -- . && git clean -fd`), append a short reflection to `.ralph/errors.log`, set the
  finding back to `status: open` with a note in `fix:` about what blocked you, commit ONLY the
  queue+log change, and stop. NEVER commit a red or dirty tree.

# Discipline
- Keep context under ~100k tokens — use sub-agents for big greps/file reads and consume their
  summaries. One finding. Gate-green. Honest status.
