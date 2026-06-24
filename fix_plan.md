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

- [x] WIRE-HEIGHTENED — `Heightened Senses (Sight/Smell/Sound/Taste/Touch)`: +10 to
  tests relying on that sense → `conditionalBonuses` (Awareness/Per etc., "using <sense>").
  RT Core. Add the 5 names to the ratchet. (WIRE) — done iter 2: +10 conditionalBonus on
  awareness skill + perception characteristic, label "using <sense>"; 5 names added to
  ratchet WIRED_EXPECTED (kind cond). Gate green (59 tests).

- [x] ENGINE-INIT — BUG-002 Paranoia Initiative: add `system.initiative.modifier` to
  `template.json`; `acolyte.mjs`/`base-actor.mjs` compute `bonus = char.bonus +
  (modifier ?? 0)`; AE Paranoia `system.initiative.modifier += 2` (RT Core, "+2 on
  Initiative rolls"). Pure-JS test on the compute helper if extractable; E2E follow-up.
  (ENGINE) — done iter 3: added `modifier: 0` to initiative schema; both compute sites
  (acolyte.mjs:364, base-actor.mjs:126) now `char.bonus + (modifier ?? 0)`; Paranoia AE
  mode2 +2 on `system.initiative.modifier`; source cites RT Core p.123. Compute is
  inline/Foundry-coupled (not cleanly extractable) → ratchet (Paranoia kind ae) +
  E2E-INIT follow-up below. Gate green (59 tests).

- [ ] E2E-INIT — verify on rt-smoke (Playwright): an actor with the Paranoia talent
  shows displayed Initiative bonus raised by exactly +2 vs the same actor without it;
  NPC actors without `system.initiative.modifier` still compute (the `?? 0` guard).
  Foundry-coupled — node gate can't exercise it. (E2E) [SKIPPED by the autonomous loop
  iter 4: live-deploy + single-GM-seat Playwright needs the user to vacate their browser
  tab — not autonomously completable; deferred to an out-of-loop verification session.]

- [x] FIX-DOF — BUG-001: dropped `1 +` from `action-data.mjs:278` (DoF = tens diff).
  Done by hand 2026-06-23 (verified 61/52→1, 92/62→3). DoS (line 226) left as-is — a
  separate combat-pass task. (DoF)

- [x] ENGINE-WEAPONCLASS — BUG-003 Weapon Master: apply a bonus when the wielded
  weapon's `class` matches the talent's `system.choice`. Done iter 4: pure helper
  `weaponMasterBonus(talents, weaponClass)` in `roll-helpers.mjs` (name-substring match
  + case-insensitive choice/class compare; handles the choice-appended-to-name issue
  that breaks `hasTalent`); wired +10 to-hit in `WeaponRollData.update()` (non-ship) and
  +2 damage in `DamageData._calculateDamage()` (any class). Both reach the roll via
  `calculateTotalModifiers`/`_totalDamage` (sum all modifier keys). Node test
  `tests/chargen/weapon_master.test.mjs` (4 cases). NOT double-applied (Weapon Master not
  in the code-handled set). +2 Initiative left unwired (situational — no weapon context
  at Initiative-roll time); Crack Shot deferred to ENGINE-CRITDAMAGE (it is crit-damage,
  not weapon-class). RT Core p.73 (Weapon Master). Gate green (63 tests). E2E follow-up
  below. (ENGINE)

- [ ] E2E-WEAPONMASTER — verify on rt-smoke (Playwright): an Arch-militant with Weapon
  Master (Basic) gets +10 to-hit and +2 damage on a basic-weapon attack card, and NO
  bonus when attacking with a weapon of another class (e.g. Pistol/Melee). Also confirm
  the +2 Initiative is still NOT applied (situational, intentionally unwired). Node gate
  can't exercise the attack pipeline. (E2E)

- [x] AUDIT-002 — Extend the sweep to NON-`+N` mechanical phrasings in `talents`+`traits`
  ("doubles/halves/+Xd10/additional Reaction/ignores armour/re-roll/Unnatural"). Append
  WIRE-/NARRATIVE- tasks. (AUDIT) — done iter 5: subagent-scanned both packs; findings +
  buckets in `loops/effects-audit/triage.md` (AUDIT-002 section). Headline: non-`+N`
  effects almost never map to a clean AE/conditionalBonus — overwhelmingly **narrative**
  or **needs-engine** (extra Reaction/attack count, Unnatural multiplier, Wound additive,
  reload time, trait grant, natural-weapon damage). Code-handled set re-confirmed (no
  double-apply). Appended ENGINE-EXTRA-DEFENCE, ENGINE-ATTACK-TALENTS, ENGINE-UNNATURAL,
  ENGINE-WOUNDS-MOD, ENGINE-RAPID-RELOAD, ENGINE-TRAIT-GRANTS, ENGINE-NATWEAPONS,
  NARRATIVE-RECORD-2 below; flagged 7 partially-wired entries for AUDIT-CRITIC. Gate green.

- [x] AUDIT-003 — `cybernetics`: find entries with described bonuses but no wiring
  (CLAUDE.md notes ~16: Bionic Arm +10 Ag/Str, Calculus Logi +10 Literacy/Logic/Schol
  Lore, Synthetic Muscle Grafts +1 SB, etc.). Append WIRE- tasks. (AUDIT) — done iter 6:
  all 34 cybernetic docs triaged in `loops/effects-audit/triage.md` (AUDIT-003 section).
  None in `CODE_HANDLED` (no double-apply). Clean buckets: 5 always-on AE
  (WIRE-CYBER-AE), 4 conditional (WIRE-CYBER-COND); the rest are craftsmanship-gated /
  talent-grant / immunity → fold into existing ENGINE-TRAIT-GRANTS / ENGINE-UNNATURAL /
  ENGINE-NATWEAPONS or NARRATIVE-RECORD-CYBER. Craftsmanship caveat: single
  `craftsmanship: common` field → only Common-baseline unconditional bonuses are
  cleanly AE-able. Appended the 3 tasks below. Gate green (no pack change this iter).

- [x] AUDIT-004 — `weapon-mods` / `ammo` / `consumables`: find mechanical text with no
  structured effect. Append WIRE-/NARRATIVE- tasks. (AUDIT) — done iter 18: all 3 packs
  triaged in `loops/effects-audit/triage.md` (AUDIT-004 section). Zero always-on-AE
  candidates (these item types modify a weapon/attack or are activated consumables, not
  standing character bonuses). **Headline bug:** several already-written ammo effects are
  silently inert — `ammo.mjs` switch keys don't match the YAML `name:` (`Explosive
  Arrows/Quarrels`≠`Explosive Arrows and Quarrels`, `Hot-Shot Charge Packs`≠`…Pack`,
  `Tox Rounds`≠`Toxic Shot`), and 6 ammo rows are filed `type: weaponModification` while
  the apply path only runs on `isAmmunition` (verified by grep). Engine-handled quality
  flags re-confirmed (no double-wire). Appended the 5 tasks below. Gate green (no pack
  change this iter).

- [x] WIRE-FIELDCRAFT — `Fieldcraft` (trait): always-on AE +10 to `system.skills.
  {concealment,shadowing,silentMove}.modifier` (mode 2). Kroot, ItS. Add to ratchet
  `WIRED_EXPECTED` (kind ae). ("treat forests as open terrain" stays narrative.) (WIRE)
  — done iter 19: AE (mode 2, _id FieldcraftKr00t1) on the 3 skill modifiers; source
  cites ItS p.142; "open terrain" left narrative; added to ratchet (kind ae). Gate green
  (build OK, 63 node tests). NOT double-applied (not in code-handled set). E2E follow-up
  below. (WIRE)

- [ ] E2E-FIELDCRAFT — verify on rt-smoke (Playwright): a Kroot actor with the Fieldcraft
  trait shows Concealment/Shadowing/Silent Move skill values raised by +10 vs without it
  (AE feeds `skill.current` via the two-pass `_computeSkills`). Foundry-coupled — node
  gate can't exercise it. (E2E)

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

### AUDIT-002 follow-ups (non-`+N` sweep; see `loops/effects-audit/triage.md`)

- [ ] NARRATIVE-RECORD-2 — add the AUDIT-002 intentionally-unwired entries to the ratchet
  `NARRATIVE` list (they're in `triage.md` AUDIT-002 section): talents Blessed Radiance,
  Bulging Biceps, Da Nekst Best Fing, Dark Soul, Ded 'Ard, Ded Sneaky, Die Hard, Duty
  Unto Death, Favoured by the Warp, Fearless, Give it Sum Dakka!, Greed is Good, Hardy,
  Improved Warp Sense, Iron Jaw, Jaded, Kroot Leap, Legendary, Light Sleeper, Master
  Orator, Mercenary, More fer Me!, Nerves of Steel, Polyglot, Prophetic Dreams,
  Prosanguine, Rapid Reaction, Sharpshooter, Sprint, Strong Minded, Survival Master,
  Takedown, Unshakeable Faith, Warp Affinity, Watchful For Betrayal, See Without Eyes,
  Blind Fighting; traits Auto-Stabilised, Blind, Dark Sight, From Beyond, Phase,
  Regeneration, Strange Physiology, The Stuff of Nightmares, Toxic, Warp Weapon. Verify
  each is genuinely text-only before adding. (NARRATIVE)

- [ ] ENGINE-EXTRA-DEFENCE — extra-Reaction / extra-attack count machinery: Step Aside
  (+1 Dodge/round), Wall of Steel (+1 Parry/round), Counter Attack (free attack after
  Parry), Furious Assault (extra attack after All Out Attack hit), WAAAGH! (extra attack
  after Charge hit). Also Brutal Charge (+3 dmg charging — damage path, not skill/char,
  so `conditionalBonuses` can't express it). No current Reaction-budget tracker → likely
  E2E/UI + engine. RT Core / ItS. Pure-JS test on any extractable helper; E2E follow-up.
  (ENGINE)

- [ ] ENGINE-ATTACK-TALENTS — Swift Attack (2 melee hits) / Lightning Attack (3 melee
  hits) as TALENTS (RT lists them as Talents, not actions; currently `legacy: true`
  actions per 0.7.22). Decide: grant the action when the talent is present, or apply the
  additional-hit count in the attack flow. Pure-JS test on the hit-count helper; E2E.
  (ENGINE)

- [ ] ENGINE-UNNATURAL — traits that SET/scale an Unnatural multiplier or double a bonus:
  Unnatural Characteristic, Unnatural Toughness (x2), Unnatural Speed, Quadruped (×AgB
  move), Daemonic (×2 TB vs damage), Bastion of Iron Will (×2 defensive PR). The sheet
  already has `system.characteristics.<k>.unnatural` — wire traits to set it (AE on the
  `.unnatural` key, or compute) where that's the right apply point; the ×2-vs-damage and
  movement-doubling cases need engine code. Includes Greenskin Hybrid (+10 Toughness
  "after calculating Wounds" — a Wounds-neutral bump an AE can't express). Pure-JS test;
  E2E. (ENGINE)

- [ ] ENGINE-WOUNDS-MOD — additive Wounds term (mirror BUG-002's `initiative.modifier`):
  add `system.wounds.modifier` to `template.json`, fold into the Wounds compute in
  `acolyte.mjs`, then AE Sound Constitution `+1` (stackable) and Eaters of the Dead bonus
  Wounds. Pure-JS test on the compute; E2E. (ENGINE)

- [ ] ENGINE-RAPID-RELOAD — Rapid Reload halves weapon reload times in the attack/reload
  path. Hook in `action-data.mjs` (or reload handling) by talent name. Pure-JS test on the
  reload-time helper; E2E. RT Core. (ENGINE)

- [ ] ENGINE-TRAIT-GRANTS — talents/traits that GRANT another trait/talent: Explorator
  Implants (→ Mechanicus Implants), The Flesh is Weak / Physical Perfection (→ Machine),
  Sixth Sense (→ Psyniscience trained + Rival), 'Ard (meta-grant of Unnatural Toughness
  ×2 / Sturdy / Iron Jaw / True Grit). Needs item-grant machinery (auto-embed the granted
  item on create). Larger than a data edit. RT Core / ItS. (ENGINE)

- [ ] ENGINE-NATWEAPONS — natural-weapon / unarmed damage-formula overrides: Natural
  Weapons, Improved Natural Weapons, Unarmed Master (1d10+SB, no Primitive), Unarmed
  Warrior (1d10−3). Apply point is the unarmed-damage path in `damage-data.mjs`. Pure-JS
  test on the formula selection; E2E. RT Core / ItS. (ENGINE)

- [ ] AUDIT-CRITIC — Completeness pass: re-run the ratchet, list anything still
  unresolved (unwired and not justified-narrative), confirm no code-handled entry got
  an AE (grep), and regenerate the data-vendor-queue audit summary. (AUDIT)

### AUDIT-003 follow-ups (`cybernetics`; see `loops/effects-audit/triage.md` AUDIT-003)

- [ ] WIRE-CYBER-AE — always-on AEs on 5 cybernetics (Common-baseline unconditional
  bonuses), copying the talents-pack AE shape (unique 16-char `_id`, `mode 2` on
  `system.{characteristics|skills}.<k>.modifier`, `transfer` default): Calculus Logi
  Upgrade (+10 `skills.{literacy,logic,scholasticLore}.modifier`), Optical Mechadendrite
  (+10 `characteristics.perception.modifier`), Medicae Mechadendrite (+10
  `skills.{medicae,interrogation}.modifier`), Scribe-Tines (+10 `skills.inquiry.modifier`
  — "Investigation" remaps to `inquiry`; confirm vs `scrutiny` against the skill list),
  Utility Mechadendrite (+10 `skills.techUse.modifier`). Cite RT Core p.131-135 in each
  `source:`/AE. Add the 5 names to ratchet `WIRED_EXPECTED` (kind ae). (WIRE)

- [ ] WIRE-CYBER-COND — `flags.rt.conditionalBonuses` on 4 cybernetics: Bionic
  Respiratory System (+20 toughness "resisting airborne toxins/gas"), Manipulator
  Mechadendrite (+20 strength "using the manipulator mechadendrite"), Optical
  Mechadendrite (+20 perception "vision-based at night" — second cond on the same item
  wired in WIRE-CYBER-AE), Mind Impulse Unit (+10 techUse/pilot/drive "interfaced with
  MIU systems"). RT Core p.131-135. Add the 4 to ratchet `WIRED_EXPECTED` (kind cond).
  (WIRE)

- [ ] NARRATIVE-RECORD-CYBER — add the intentionally-unwired cybernetics to the ratchet
  `NARRATIVE` list (in `triage.md` AUDIT-003): Cybernetic Senses, Bionic Arm, Bionic
  Locomotion (legs, Hips, Pelvis, Etc.), Auger Arrays, Baleful Eye, Ballistic
  Mechadendrite, Miu Weapon Interface, Internal Blade, Internal Power Cell, Locator
  Matrix, Respiratory Filter Implant, Gastral Bionics, Pain Ward, Voidskin, Volitor
  Implant, Vox Implant, Implant Systems. (The talent-grant / SB / unarmed-damage / ×2
  cybernetics — Augmented Senses, Bionic Heart, Memorance Implant, Vitae Supplacement,
  Blackbone Bracing, Synthetic Muscle Grafts, Cortex Implants — extend the existing
  ENGINE-TRAIT-GRANTS / ENGINE-UNNATURAL / ENGINE-NATWEAPONS tasks, NOT this list.)
  Verify each is genuinely text-only before adding. (NARRATIVE)

### AUDIT-004 follow-ups (`weapon-mods`/`ammo`/`consumables`; see `triage.md` AUDIT-004)

- [ ] WIRE-AMMO-NAME-SYNC — fix already-written-but-inert ammo wiring (a bug, no new
  engine): align `src/module/rules/ammo.mjs` switch keys to the YAML `name:` fields —
  `Explosive Arrows/Quarrels`→`Explosive Arrows and Quarrels`, `Hot-Shot Charge Packs`→
  `Hot-Shot Charge Pack`, `Tox Rounds`→`Toxic Shot`. AND resolve the type-vs-apply-path
  mismatch: the 6 ammo rows in `weapon-mods.yml` (Explosive Arrows and Quarrels, Hot-Shot
  Charge Pack, Amputator Shells, Bleeder Rounds, Dumdum Bullets, Expander Rounds) are
  `type: weaponModification` but the bonus path runs on `isAmmunition` items — either
  re-type them to `ammunition` (move to `ammo.yml`) or add a parallel switch in
  `weapon-modifiers.mjs`. Verify which is correct against how `roll-data.mjs:116` and
  `damage-data.mjs` select items. Pure-JS test on the name-match helper if extractable;
  E2E follow-up (attack card shows the bonus). RT Core / ItS (cite the page). (WIRE)

- [ ] WIRE-AMMO-ADD-QUALITY — for ammo whose entire mechanic is "gains an
  engine-handled quality," push the quality in `ammo.mjs::calculateAmmoSpecials`: Snare
  Shells→`Snare`, Airtorch Canister→`Scatter`+`Overheats` (the damage engine already
  resolves these — only the trigger is missing). The −2 dmg / ½ range deltas stay
  narrative (no clean apply). Pure-JS test on the quality-push helper; E2E follow-up.
  RT/ItS. (WIRE)

- [ ] ENGINE-CONSUMABLE-ACTIVATE — a "use drug/consumable" action that applies a timed
  ActiveEffect (duration in rounds/minutes) for the ~11 activated combat consumables
  (Frenzon→Frenzy, Stimm, Slaught, Spur, Cold Fire, White Void, Wideawake, Attention
  Spanner) and weapon buffs (Sacred Unguents jam-immunity, Tox Dispenser). The only clean
  way to wire these; larger than a data edit. RT Core / ItS. Pure-JS test on any
  extractable duration/parse helper; E2E follow-up. (ENGINE)

- [ ] NARRATIVE-RECORD-MODS-AMMO-CONSUM — log every intentionally-unwired
  weapon-mod/ammo/consumable entry from `triage.md` AUDIT-004 to
  `.ralph/data-vendor-queue.md` as text-faithful / no-AE: weapon-mod sights/mounts/
  cartridges & ammo-type descriptors (Fire Selector, Forearm Mounting, Melee Attachment,
  Omni-Scope, Overcharge Pack, Photo Sight, Preysense Sight, Silencer, Suspensors,
  Telescopic Sight, Vox-Operated, Calamity Vents, Exterminator Cartridge, Tox Dispenser,
  Backpack Ammo Pack/Power Pack, the ammo-type descriptor rows); unwired ItS ammo (Tempest
  Bolt Shells, Acid Shells, Microburst Flask, Nephium Fuel Tank, Organgrinder Rounds,
  Tracer Shells, Void Rounds, De-Tox, Obscura); item-present skill bonuses (Medikit,
  Medikit (Advanced), Almanac Astrae Divinitus, Auspex/Scanner, Auto Quill); and the
  flavour/food/utility rows. These packs have NO ratchet coverage (ratchet only spans
  talents/traits/cybernetics) — record in the data-vendor-queue, not the test. Verify each
  is genuinely text-only/needs-engine before recording. (NARRATIVE)

- [ ] CLEANUP-CONSUM-TOOLS-STRAY — the `Tools` entry in `consumables.yml` has an empty
  description and `type: drug` — looks like a stray/misfiled row. Confirm against the pack
  history, then remove it or fix its data. Trivial. (CLEANUP)

## Notes
- Wire effects into the EXISTING packs (`talents`/`traits`/`cybernetics`/…); the `.db`
  is rebuilt by `build:check`. AE convention: see `specs/06` / the talents pack.
- Engine fixes touch Foundry-coupled code (`acolyte.mjs`, `rolls/*`) the node gate
  can't fully exercise — implement + add any extractable pure-JS test + an E2E follow-up.

## Out of scope
- Inventing/rebalancing effects; the chargen wizard (shelved); DoS/combat-count changes
  beyond the flagged DoF fix; the backgrounds work (separate completed loop).
