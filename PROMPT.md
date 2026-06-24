# Ralph loop — one task per iteration (effect-wiring audit)

You are one iteration of an autonomous build loop on the Rogue Trader 3rd Edition
Foundry VTT system. Fresh context every time. Do exactly one task, verify, commit, stop.

## Read first (authority)
- @fix_plan.md — the next task is the single top unchecked `[ ]` item.
- @specs/06-effect-wiring-audit.md — the frozen requirements + the triage buckets.
- @BUGS.md — BUG-001/002/003 + the SWEEP candidate list this loop drives down.
- @CLAUDE.md — architecture, V2-sheet gotchas, V14 LevelDB cache, deploy loop.

The focus of this loop is **finding and fixing places where a compendium entry
DESCRIBES a mechanical effect the system never applies** (e.g. Paranoia "+2
Initiative", Weapon Master "+10/+2/+2 with chosen weapon class"). Wire each gap the
way the system already wires effects — ActiveEffect / `flags.rt.conditionalBonuses` /
`pickable`, or engine code — and prove the bonus reaches the roll. Do NOT invent or
rebalance effects; only wire what the book describes (cite `/mnt/project_data/RT/
RT-DOCS/`).

## THE HARD RULE — never double-apply
Talents already applied BY NAME in `src/module/rolls/{damage-data,action-data}.mjs`
(Crushing Blow, Mighty Shot, Blademaster, Eye of Vengeance, Hammer Blow, Concussive,
True Grit, Deathdealer — grep to confirm the live set) must NOT also get an AE/
conditionalBonus. That recreates the 0.7.13 double-application bug. If unsure whether
a bonus is already applied, grep `rolls/` + `documents/` BEFORE wiring.

## The rule: ONE task
1. Pick the single top unchecked item in @fix_plan.md. Do only that.
2. Classify before wiring (code-handled / always-on / conditional / narrative /
   needs-engine — see specs/06) and implement the smallest correct fix for that bucket.
3. Keep context lean (< 100k): for big files (`talents.yml`, `damage-data.mjs`,
   `acolyte.mjs`) or wide greps, spawn a subagent and consume its summary.

## Architecture landmines (a green gate does NOT license violating these)
- Wire into the EXISTING packs (`talents`/`traits`/`cybernetics`/…). The `.db` is a
  build artifact rebuilt by `build:check` — hand-edit only the `.yml`.
- AE convention: copy the talents-pack shape (`mode 2` on
  `system.{characteristics|skills}.<k>.modifier`; effect needs a unique 16-char `_id`).
  Situational → `conditionalBonuses`. "(choose one)" → `pickable`. See specs/06.
- Engine fixes touch Foundry-coupled code (`acolyte.mjs`, `base-actor.mjs`, `rolls/*`)
  the node gate can't fully run — implement carefully, add any extractable pure-JS
  test, and append an E2E follow-up item.
- Do NOT change DoS / combat hit-count conventions beyond the flagged BUG-001 DoF fix.

## Backpressure (rejected unless the gate is green) — IN ORDER
1. `npm run build:check` — must exit 0 (compiles packs; catches malformed YAML/AE).
2. `npm test` — `node --test tests/chargen/*.test.mjs` — must pass. The wiring ratchet
   (`tests/chargen/effect_wiring_audit.test.mjs`) validates AE/conditionalBonus shape
   for every effect and asserts `WIRED_EXPECTED` names carry wiring; raise it as you go.
   New extractable logic ships with a node test.
If either fails: discard ALL your edits (`git checkout -- .` then `git clean -fd`; keep
`.ralph/`), append a reflection to `.ralph/errors.log`, commit
`ralph(iter <N>): REJECTED <task> — <cause>`, confirm clean tree, stop.

## On every authored change
The gate cannot verify RT-rules correctness or that a bonus reaches the live roll. So
append one line to `@.ralph/data-vendor-queue.md` (`iter N | <pack/file> → what wired
→ REQ-ID → canon cite`) and cite the RT-DOCS page in each `source:`/AE. (PROC-003.)

## On success
- `git add -A` and commit:
  ```
  ralph(iter <N>): <one-line what changed>

  Requirement: <REQ-ID(s)>
  Verified: build OK, node test <count> passed (<key test>)

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
  `<N>` from `$RALPH_ITER` (fallback: count prior `ralph(iter` commits + 1).
- In @fix_plan.md: check the item `[x]`; AUDIT tasks APPEND the per-entry WIRE-/
  NARRATIVE- tasks they discovered. Then stop.

## errors.log format (on failure)
```
## iter <N> · <UTC> · <task>
cause: <gate + error>
reflection: <why + next attempt>
```

## Stop condition
If @fix_plan.md has no unchecked `[ ]` items (all left is Notes/Out-of-scope), create
empty `.ralph/STOP` and exit without committing.
