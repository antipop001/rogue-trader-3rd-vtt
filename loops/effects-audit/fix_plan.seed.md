# fix_plan — Effect-wiring audit (SEED — swap to ./fix_plan.md at launch)

One task per iteration; top unchecked `[ ]` first. Wire each per
`specs/06-effect-wiring-audit.md`: classify (code-handled / always-on / conditional /
narrative / needs-engine), implement, cite canon in `source:`/AE, raise the ratchet in
`tests/chargen/effect_wiring_audit.test.mjs`, gate green, commit, log to
`.ralph/data-vendor-queue.md`. NEVER re-apply a code-handled talent (double-apply
guard in the spec). Canon: `/mnt/project_data/RT/RT-DOCS/`.

## Active list

- [ ] AUDIT-001 — Triage the first-pass `+N` sweep (37 talents + 10 traits, listed in
  `BUGS.md` SWEEP). For each: read its benefit/description, grep `rolls/` to check if
  already code-handled, and classify into one bucket. Write the table to
  `loops/effects-audit/triage.md` and APPEND per-entry WIRE-/NARRATIVE- tasks (grouped
  sensibly) to the bottom of this active list. Seed `CODE_HANDLED` in the ratchet test
  with the confirmed code-handled names. (AUDIT)

- [ ] WIRE-HEIGHTENED — `Heightened Senses (Sight/Smell/Sound/Taste/Touch)`: +10 to
  tests relying on that sense → `conditionalBonuses` (Awareness/Per etc., "using <sense>").
  RT Core. Add the 5 names to the ratchet. (WIRE)

- [ ] ENGINE-INIT — BUG-002 Paranoia Initiative: add `system.initiative.modifier` to
  `template.json`; `acolyte.mjs`/`base-actor.mjs` compute `bonus = char.bonus +
  (modifier ?? 0)`; AE Paranoia `system.initiative.modifier += 2` (RT Core, "+2 on
  Initiative rolls"). Pure-JS test on the compute helper if extractable; E2E follow-up.
  (ENGINE)

- [x] FIX-DOF — BUG-001: dropped `1 +` from `action-data.mjs:278` (DoF = tens diff).
  Done by hand 2026-06-23 (verified 61/52→1, 92/62→3). DoS (line 226) left as-is — a
  separate combat-pass task. (DoF)

- [ ] ENGINE-WEAPONCLASS — BUG-003 Weapon Master / Crack Shot: extend the
  conditional-bonus (or attack/damage) path to apply a bonus when the used weapon's
  `class` matches the talent's `system.choice`; wire Weapon Master (+10 hit / +2 dmg /
  +2 init) and Crack Shot. Foundry-coupled → E2E follow-up; pure-JS unit test for any
  extractable matcher. (ENGINE)

- [ ] AUDIT-002 — Extend the sweep to NON-`+N` mechanical phrasings in `talents`+`traits`
  ("doubles/halves/+Xd10/additional Reaction/ignores armour/re-roll/Unnatural"). Append
  WIRE-/NARRATIVE- tasks. (AUDIT)

- [ ] AUDIT-003 — `cybernetics`: find entries with described bonuses but no wiring
  (CLAUDE.md notes ~16: Bionic Arm +10 Ag/Str, Calculus Logi +10 Literacy/Logic/Schol
  Lore, Synthetic Muscle Grafts +1 SB, etc.). Append WIRE- tasks. (AUDIT)

- [ ] AUDIT-004 — `weapon-mods` / `ammo` / `consumables`: find mechanical text with no
  structured effect. Append WIRE-/NARRATIVE- tasks. (AUDIT)

- [ ] AUDIT-CRITIC — Completeness pass: re-run the ratchet, list anything still
  unresolved (unwired and not justified-narrative), confirm no code-handled entry got
  an AE (grep), and regenerate the data-vendor-queue audit summary. (AUDIT)

## Notes
- Wire effects into the EXISTING packs (`talents`/`traits`/`cybernetics`/…); the `.db`
  is rebuilt by `build:check`. AE convention: see `specs/06` / the talents pack.
- Engine fixes touch Foundry-coupled code (`acolyte.mjs`, `rolls/*`) the node gate
  can't fully exercise — implement + add any extractable pure-JS test + an E2E follow-up.

## Out of scope
- Inventing/rebalancing effects; the chargen wizard (shelved); DoS/combat-count changes
  beyond the flagged DoF fix; the backgrounds work (separate completed loop).
