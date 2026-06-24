# Effect-wiring audit loop — spec (frozen requirements)

**Goal:** find and fix every place a compendium entry *describes* a mechanical effect
that the system never actually applies — like Paranoia ("+2 Initiative") and Weapon
Master ("+10/+2/+2 with chosen weapon class") not doing anything (see `BUGS.md`
BUG-001/002/003 + the SWEEP). Wire each gap the way the system already wires effects
(ActiveEffect / `conditionalBonuses` / `pickable`, or engine code), with a test that
the bonus actually reaches the roll, and WITHOUT double-applying anything already
handled in code.

Canon source: `/mnt/project_data/RT/RT-DOCS/` — cite the page. Reference how existing
wiring works: `specs/04-backgrounds-compendium.md` (AE/conditionalBonus/pickable
shapes), `src/module/documents/base-actor.mjs` (`collectOptionalBonuses`),
`src/module/documents/acolyte.mjs` (derived compute), `src/module/rolls/*.mjs`
(name-based talent handling).

## Hard rule — NEVER double-apply
Some talents are already applied by NAME in code (`src/module/rolls/damage-data.mjs`
/ `action-data.mjs`): **Crushing Blow, Mighty Shot, Blademaster, Eye of Vengeance,
Hammer Blow, Concussive, True Grit, Deathdealer** (grep the rolls/ dir to confirm the
current set before each task). Do NOT add an AE/conditionalBonus that re-applies one
of these — that recreates the 0.7.13-class double-application bug. Mark them
`code-handled` and exclude from wiring. If unsure whether a bonus is already applied,
grep the rolls/ + documents/ code before wiring.

## Classify every candidate (triage before wiring)
Each entry falls into exactly one bucket:
- **code-handled** — already applied in rolls/ code. Leave as-is; record only.
- **always-on** — flat, unconditional characteristic/skill bonus → ActiveEffect, mode
  matching the talents pack (`mode 2` on `system.{characteristics|skills}.<k>.modifier`).
- **conditional** — "when charging / vs X / while wielding Y" → `flags.rt.
  conditionalBonuses` (opt-in at roll time via `collectOptionalBonuses`). If the
  condition is a *weapon class* (Weapon Master, Crack Shot) the current
  conditionalBonus schema can't express it — see ENGINE below.
- **narrative / situational / per-DoS / PF** — re-rolls, "ignores", "one additional
  Reaction", Profit-Factor flavor, GM-adjudicated → text-only; record as intentionally
  unwired with a one-line justification (do NOT force an AE).
- **needs-engine** — the apply point doesn't exist yet (Initiative additive term;
  weapon-class conditional). See ENGINE.

## Requirements
- **AUDIT (MUST)** Discovery tasks expand the candidate list beyond the first-pass
  `+N` sweep: (a) non-`+N` mechanical phrasings ("doubles/halves/+Xd10/additional
  Reaction/ignores armour/re-roll") in `talents`/`traits`; (b) `cybernetics` with
  described bonuses (CLAUDE.md notes ~16 description-only); (c) `weapon-mods` / `ammo`
  / `consumables` with mechanical text. Each AUDIT task writes findings to
  `loops/effects-audit/triage.md` and APPENDS concrete per-entry WIRE-/NARRATIVE-
  tasks to `fix_plan.md`.
- **WIRE (MUST)** Each wiring task implements the classified fix for its entry/group
  (AE or conditionalBonus), cites canon in `source:`/the AE, raises the wiring ratchet
  floor in `tests/chargen/effect_wiring_audit.test.mjs` (add the name to
  `WIRED_EXPECTED` / `CODE_HANDLED` / `NARRATIVE`), and adds a pure-JS node test where
  the logic is extractable.
- **ENGINE (SHOULD)** Items needing new apply points:
  - **Initiative additive** (BUG-002): add `system.initiative.modifier` to
    `template.json`, make `acolyte.mjs`/`base-actor.mjs` compute
    `bonus = char.bonus + (modifier ?? 0)`, then AE Paranoia `+2`.
  - **Weapon-class conditional** (BUG-003): extend the conditional-bonus machinery (or
    attack/damage path) to apply a bonus when the used weapon's `class` matches a
    talent's `system.choice`; wire Weapon Master (+10 hit/+2 dmg/+2 init) and Crack
    Shot. Foundry-coupled → verify via E2E (out of inner loop); still add a pure-JS
    unit test for any extractable helper.
- **DoF fix (MUST, BUG-001)** Drop the `1 +` from `action-data.mjs:278` so Degrees of
  Failure = tens difference. Do NOT change DoS (line 226) without re-deriving the
  combat hit-count math that depends on it — keep that as a separate, flagged task.

## Gate & review (same loop discipline)
- Gate = `npm run build:check` + `npm test`. The wiring ratchet
  (`effect_wiring_audit.test.mjs`) validates AE/conditionalBonus SHAPE for every
  effect in the packs (real backpressure — catches malformed wiring) and asserts the
  `WIRED_EXPECTED` names actually carry wiring. It canNOT verify the bonus is
  numerically correct or reaches the live roll — that's canon review + E2E.
- Correctness can't be gate-checked → each task logs to `.ralph/data-vendor-queue.md`
  (entry + canon cite). Engine/UI-applied fixes get an E2E follow-up item.

## Out of scope
- Re-balancing or inventing effects — only wire what the book describes.
- The backgrounds work (separate, completed loop) and the chargen wizard (shelved).
- Changing DoS / combat hit-count conventions beyond the flagged BUG-001 DoF fix.
