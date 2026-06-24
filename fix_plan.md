# fix_plan — Effect-wiring audit (SEED — swap to ./fix_plan.md at launch)

One task per iteration; top unchecked `[ ]` first. Wire each per
`specs/06-effect-wiring-audit.md`: classify (code-handled / always-on / conditional /
narrative / needs-engine), implement, cite canon in `source:`/AE, raise the ratchet in
`tests/chargen/effect_wiring_audit.test.mjs`, gate green, commit, log to
`.ralph/data-vendor-queue.md`. NEVER re-apply a code-handled talent (double-apply
guard in the spec). Canon: `/mnt/project_data/RT/RT-DOCS/`.

## Active list

- [x] AUDIT-001 — Triage the first-pass `+N` sweep (37 talents + 10 traits, listed in
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

- [ ] WIRE-FIELDCRAFT — `Fieldcraft` (trait): always-on AE +10 to `system.skills.
  {concealment,shadowing,silentMove}.modifier` (mode 2). Kroot, ItS. Add to ratchet
  `WIRED_EXPECTED` (kind ae). ("treat forests as open terrain" stays narrative.) (WIRE)

- [ ] WIRE-MULTIPLEARMS — `Multiple Arms` (trait): always-on AE +10 to
  `system.characteristics.toughness.modifier` (mode 2). RT Core. Add to ratchet.
  (Str +10 on Climb/Swim = conditional note; "two attacks" = Multiple Attack action,
  narrative — record both, don't wire.) (WIRE)

- [ ] WIRE-COND-INTERACT — `conditionalBonuses` for social talents: Renowned Warrant
  (+10 interaction skills "with those who respect the warrant"), Whispers (+10 Inquiry
  "Investigation/Interview use"), Inspire Wrath (+20 charm/intimidate "inspiring hatred
  or anger"). RT Core / ItS. Add the 3 to ratchet `WIRED_EXPECTED` (kind cond). (WIRE)

- [ ] WIRE-COND-MISC — `conditionalBonuses`: Decadence (+10 toughness "resisting
  addiction"), Electro Graft Use (+10 commonLore/inquiry/techUse "connected to a data
  port"), Foresight (+10 intelligence "after 10 min study"), Sturdy trait (+20 strength
  "resisting grapple or Takedown"). RT Core. Add the 4 to ratchet (kind cond). (WIRE)

- [ ] ENGINE-INIT-EXTRA — after ENGINE-INIT lands `system.initiative.modifier`: AE Wary
  (trait) `+1` and Lightning Reflexes (`+AgB`, i.e. add a second Agility-bonus term —
  needs the multiplier handled in `acolyte.mjs` since AE can't read AgB). RT Core. Pure-JS
  test on the initiative compute; E2E follow-up. Add both to ratchet. (ENGINE)

- [ ] ENGINE-CRITDAMAGE — Crack Shot (+2 ranged crit dmg) & Crippling Strike (+4 melee
  crit dmg): apply extra damage only when the attack causes Critical Damage. Hook in
  `damage-data.mjs`/`assign-damage-data.mjs` by talent name (NOT an AE — it's
  context-gated on crit). RT Core. Pure-JS test on any extractable matcher; E2E
  follow-up. (Crack Shot is mis-grouped under ENGINE-WEAPONCLASS — it is crit-damage,
  not weapon-class; handle it here.) (ENGINE)

- [ ] NARRATIVE-RECORD — add the intentionally-unwired entries to the ratchet
  `NARRATIVE` list (and they're already in `loops/effects-audit/triage.md`): talents
  Ancestral Blessing, Binary Chatter, Blood of the Stalker, Bloodtracker, Concealed
  Cavity, Dual Shot, Dual Strike, Electrical Succour, Exceptional Leader, Hard Bargain,
  Hyperactive Nymune Organ, Into the Jaws of Hell, Last Man Standing, Luminen Charge,
  Luminen Shock, Master & Commander, Master Enginseer, Mimic, Psy Rating, Warp Conduit;
  traits 'Ard, Dynastic Warrant, Incorporeal, Instinctual Understanding, Mechanicus
  Implants, Mob Rule. (NARRATIVE)

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
