# Effect-wiring audit loop — ready-to-launch kit

A staged Ralph loop that finds & fixes compendium entries describing a mechanical
effect the system never applies (Paranoia "+2 Init", Weapon Master "+10/+2/+2", and
the ~47-entry SWEEP in `BUGS.md`). Staged here (inert) so it does NOT interfere with
the **backgrounds loop currently running** on this branch — both edit `talents.yml`/
`traits.yml`, so run this **after backgrounds finishes** (sequential, same lineage =
no conflicts).

## Contents
- `spec.md` → becomes `specs/06-effect-wiring-audit.md` (requirements + triage buckets)
- `PROMPT.md` → becomes `./PROMPT.md` (loop prompt; double-apply guard front and centre)
- `fix_plan.seed.md` → becomes `./fix_plan.md` (seeded AUDIT + WIRE + ENGINE backlog)
- `effect_wiring_audit.test.mjs` → becomes `tests/chargen/effect_wiring_audit.test.mjs`
  (the ratchet: AE/conditionalBonus shape validation + double-apply guard + wired-list)

## Launch (after the backgrounds loop has STOPPED)
From the repo root, on the `ralph/backgrounds` branch (its loop has created
`.ralph/STOP` / `fix_plan.md` is all `[x]`):

```bash
git checkout -b ralph/effects-audit            # continue the lineage on a fresh branch
cp loops/effects-audit/spec.md                 specs/06-effect-wiring-audit.md
cp loops/effects-audit/PROMPT.md               PROMPT.md
cp loops/effects-audit/fix_plan.seed.md        fix_plan.md
cp loops/effects-audit/effect_wiring_audit.test.mjs tests/chargen/effect_wiring_audit.test.mjs
rm -f .ralph/STOP
npm run build:check && npm test                # sanity: must be green
git add -A && git commit -m "chore(effects-audit): seed effect-wiring loop"
./run_ralph.sh 25                              # in a real tmux, NOT the Claude ! prompt
```

(Or just ping Claude — "backgrounds is done, start the audit loop" — and it will do
the swap + sanity check for you.)

## Notes
- Gate = `npm run build:check` + `npm test` (same as every loop). Canon-correctness and
  "does the bonus reach the live roll" are NOT gate-checkable → logged to
  `.ralph/data-vendor-queue.md` + E2E follow-ups.
- The ENGINE tasks (Initiative additive, weapon-class conditional) touch Foundry-coupled
  code; they get pure-JS unit tests where extractable + an E2E follow-up.
- Parallel alternative (advanced): instead of sequential, run in a separate worktree
  (`git worktree add ../rt-effects-audit -b ralph/effects-audit ralph/backgrounds`) and
  merge later — but expect `talents.yml`/`traits.yml` merge resolution. Sequential is
  recommended.
