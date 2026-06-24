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

- [x] WIRE-MULTIPLEARMS — `Multiple Arms` (trait): always-on AE +10 to
  `system.characteristics.toughness.modifier` (mode 2). RT Core. Add to ratchet.
  (Str +10 on Climb/Swim = conditional note; "two attacks" = Multiple Attack action,
  narrative — record both, don't wire.) (WIRE) — done iter 20: AE (mode 2, _id
  MultipleArmsRT01) on toughness.modifier; source cites RT Core p.366; +10 Str-on-movement
  and Multiple Attack left narrative; added to ratchet WIRED_EXPECTED (kind ae). Gate green
  (build OK, 63 node tests). NOT double-applied (not in code-handled set). E2E follow-up below.

- [ ] E2E-MULTIPLEARMS — verify on rt-smoke (Playwright): an actor with the Multiple Arms
  trait shows displayed Toughness raised by +10 (the AE feeds `characteristics.toughness`
  via the modifier term) vs without it; confirm derived TB/Wounds shift accordingly.
  Foundry-coupled — node gate can't exercise it. (E2E)

- [x] WIRE-COND-INTERACT — `conditionalBonuses` for social talents: Renowned Warrant
  (+10 interaction skills "with those who respect the warrant"), Whispers (+10 Inquiry
  "Investigation/Interview use"), Inspire Wrath (+20 charm/intimidate "inspiring hatred
  or anger"). RT Core / ItS. Add the 3 to ratchet `WIRED_EXPECTED` (kind cond). (WIRE)
  — done iter 21: Renowned Warrant +10 conditionalBonus on the 7 interaction skills
  (barter/blather/charm/command/deceive/inquiry/intimidate), label "with those who
  respect the warrant" (RT Core p.106); Whispers +10 on inquiry, label "Investigation
  or Interview use of Inquiry" (RT Core p.108); Inspire Wrath +20 on charm/intimidate,
  label "inspiring hatred or anger" (RT Core p.100). None in code-handled set (no
  double-apply). Added all 3 to ratchet WIRED_EXPECTED (kind cond). Gate green (build
  OK, 63 node tests). E2E follow-up below. (WIRE)

- [ ] E2E-COND-INTERACT — verify on rt-smoke (Playwright): an actor with Renowned
  Warrant / Whispers / Inspire Wrath sees the labelled checkbox on the relevant skill
  roll prompt (Inquiry for Whispers; Charm/Intimidate for Inspire Wrath; the 7
  interaction skills for Renowned Warrant), and ticking it adds the bonus (+10/+10/+20)
  into `rollData.modifiers.modifier` reaching the test total. Node gate can't exercise
  the roll prompt. (E2E)

- [x] WIRE-COND-MISC — `conditionalBonuses`: Decadence (+10 toughness "resisting
  addiction"), Electro Graft Use (+10 commonLore/inquiry/techUse "connected to a data
  port"), Foresight (+10 intelligence "after 10 min study"), Sturdy trait (+20 strength
  "resisting grapple or Takedown"). RT Core. Add the 4 to ratchet (kind cond). (WIRE)
  — done iter 22: Decadence +10 toughness "resisting addiction" (RT Core p.103); Electro
  Graft Use +10 [commonLore,inquiry,techUse] "connected to a data port" (RT Core p.103);
  Foresight +10 intelligence "after ten minutes study" (RT Core p.104); Sturdy (trait)
  +20 strength "resisting grapple or Takedown" (RT Core p.367). None in code-handled set
  (no double-apply). Added all 4 to ratchet WIRED_EXPECTED (kind cond). Gate green (build
  OK, 63 node tests). E2E follow-up below. (WIRE)

- [ ] E2E-COND-MISC — verify on rt-smoke (Playwright): an actor with Decadence / Electro
  Graft Use / Foresight / Sturdy sees the labelled checkbox on the relevant roll prompt
  (Toughness char for Decadence; Common Lore/Inquiry/Tech-Use skills for Electro Graft
  Use; Intelligence char for Foresight; Strength char for Sturdy), and ticking it adds
  the bonus (+10/+10/+10/+20) into `rollData.modifiers.modifier` reaching the test total.
  Node gate can't exercise the roll prompt. (E2E)

- [x] ENGINE-INIT-EXTRA — after ENGINE-INIT lands `system.initiative.modifier`: AE Wary
  (trait) `+1` and Lightning Reflexes (`+AgB`, i.e. add a second Agility-bonus term —
  needs the multiplier handled in `acolyte.mjs` since AE can't read AgB). RT Core. Pure-JS
  test on the initiative compute; E2E follow-up. Add both to ratchet. (ENGINE) — done iter
  23: Wary AE mode2 +1 on `system.initiative.modifier` (_id WaryInit1Bonus01, RT Core
  p.21) → ratchet WIRED_EXPECTED (kind ae). Lightning Reflexes engine-handled in
  `acolyte.mjs` via pure helper `initiativeCharBonus(rawAgB, normalBonus, hasLR, hasUA)`
  in `roll-helpers.mjs`: Initiative char term = ×2 the raw Agility Bonus (×3 with
  Unnatural Agility), REPLACING the single bonus (avoids double-counting the unnatural
  fold-in); returns normalBonus unchanged without the talent (RT Core ~p.110, text
  verbatim). NOT given an AE (AE can't read AgB) → ratchet CODE_HANDLED (double-apply
  guard). Node test `initiative_bonus.test.mjs` (3 cases). Gate green (build OK, 66 node
  tests). E2E follow-up below. (ENGINE)

- [ ] E2E-INIT-EXTRA — verify on rt-smoke (Playwright): an actor with the Wary trait
  shows displayed Initiative bonus +1 vs without it; an actor with Lightning Reflexes
  shows Initiative bonus = 2×Agility Bonus (3× if also Unnatural Agility) vs the plain
  1×AgB without it; confirm the two stack (Wary +1 on top of the LR-multiplied term).
  Derived-data + Foundry-coupled — node gate can't exercise it. (E2E)

- [x] ENGINE-CRITDAMAGE — Crack Shot (+2 ranged crit dmg) & Crippling Strike (+4 melee
  crit dmg): apply extra damage only when the attack causes Critical Damage. Hook in
  `damage-data.mjs`/`assign-damage-data.mjs` by talent name (NOT an AE — it's
  context-gated on crit). RT Core. Pure-JS test on any extractable matcher; E2E
  follow-up. (Crack Shot is mis-grouped under ENGINE-WEAPONCLASS — it is crit-damage,
  not weapon-class; handle it here.) (ENGINE) — done iter 24: pure helper
  `critDamageBonus(talents, isMelee, isRanged)` in `roll-helpers.mjs` (exact
  case-insensitive name match, melee→Crippling +4, ranged→Crack +2). Precomputed on the
  Hit in `damage-data._calculateDamage` (attacker talents + melee/ranged known there),
  carried chat-card→assign via new `data-critical-damage-bonus` attr +
  `basic-action-manager._assignDamage`, and added to `criticalDamageTaken` in
  `assign-damage-data.finalize()` ONLY when `hasCriticalDamage` (before True Grit so its
  TB reduction + the Critical Hits table use the boosted total). Verified canon: both
  benefit texts already correct in `talents.yml` (no data fix). NOT an AE → ratchet
  CODE_HANDLED (double-apply guard). Node test `crit_damage.test.mjs` (5 cases). Gate
  green (build OK, 71 node tests). E2E follow-up below. (ENGINE)

- [ ] E2E-CRITDAMAGE — verify on rt-smoke (Playwright): an attacker with Crack Shot lands
  a ranged hit that overflows into Critical Damage → assign-damage card shows crit damage
  raised by +2 vs the same attack without the talent; Crippling Strike on a melee crit
  shows +4; a hit that does NOT crit (stays within Wounds) shows no change; both stack
  correctly with True Grit on the target. Attack/assign pipeline is Foundry-coupled — node
  gate can't exercise it. (E2E)

- [x] NARRATIVE-RECORD — add the intentionally-unwired entries to the ratchet
  `NARRATIVE` list (and they're already in `loops/effects-audit/triage.md`): talents
  Ancestral Blessing, Binary Chatter, Blood of the Stalker, Bloodtracker, Concealed
  Cavity, Dual Shot, Dual Strike, Electrical Succour, Exceptional Leader, Hard Bargain,
  Hyperactive Nymune Organ, Into the Jaws of Hell, Last Man Standing, Luminen Charge,
  Luminen Shock, Master & Commander, Master Enginseer, Mimic, Psy Rating, Warp Conduit;
  traits 'Ard, Dynastic Warrant, Incorporeal, Instinctual Understanding, Mechanicus
  Implants, Mob Rule. (NARRATIVE) — done iter 25: all 26 added to ratchet `NARRATIVE`;
  verified each carries no effects/conditionalBonuses (text-only) before recording, none
  in CODE_HANDLED/WIRED_EXPECTED. Added a NEW guard test ("narrative entries carry no
  wiring") so the list is real backpressure, not dead documentation (mirrors the
  CODE_HANDLED double-apply guard) — catches a wrong later AE on a narrative entry. Gate
  green (build OK, 72 node tests).

### AUDIT-002 follow-ups (non-`+N` sweep; see `loops/effects-audit/triage.md`)

- [x] NARRATIVE-RECORD-2 — add the AUDIT-002 intentionally-unwired entries to the ratchet
  `NARRATIVE` list (they're in `triage.md` AUDIT-002 section): talents Blessed Radiance,
  Bulging Biceps, Da Nekst Best Fing, Dark Soul, Ded 'Ard, Ded Sneaky, Die Hard, Duty
  Unto Death, Favoured by the Warp, Fearless, Give it Sum Dakka!, Greed is Good, Hardy,
  Improved Warp Sense, Iron Jaw, Jaded, Kroot Leap, Legendary, Light Sleeper, Master
  Orator, Mercenary, More fer Me!, Nerves of Steel, Polyglot, Prophetic Dreams,
  Prosanguine, Rapid Reaction, Sharpshooter, Sprint, Strong Minded, Survival Master,
  Takedown, Unshakeable Faith, Warp Affinity, Watchful For Betrayal, See Without Eyes,
  Blind Fighting; traits Auto-Stabilised, Blind, Dark Sight, From Beyond, Phase,
  Regeneration, Strange Physiology, The Stuff of Nightmares, Toxic, Warp Weapon. Verify
  each is genuinely text-only before adding. (NARRATIVE) — done iter 26: verified all 47
  carry no effects/conditionalBonuses before recording; added to ratchet `NARRATIVE`
  (guarded by the "narrative entries carry no wiring" test). Used the fix_plan name list
  (subset of triage.md AUDIT-002's broader narrative roll-up). None in CODE_HANDLED/
  WIRED_EXPECTED. Gate green (build OK, 72 node tests).

- [x] ENGINE-EXTRA-DEFENCE — extra-Reaction / extra-attack count machinery: Step Aside
  (+1 Dodge/round), Wall of Steel (+1 Parry/round), Counter Attack (free attack after
  Parry), Furious Assault (extra attack after All Out Attack hit), WAAAGH! (extra attack
  after Charge hit). Also Brutal Charge (+3 dmg charging — damage path, not skill/char,
  so `conditionalBonuses` can't express it). No current Reaction-budget tracker → likely
  E2E/UI + engine. RT Core / ItS. Pure-JS test on any extractable helper; E2E follow-up.
  (ENGINE) — done iter 31: wired the ONE clean damage-path slice, **Brutal Charge**.
  Found+fixed a data bug — the `Brutal Charge` trait carried the *Burrower* description
  (copy-paste swap); restored canon "deals an extra 3 points of damage with attacks made
  while charging" + `source: …p.364`. Pure helper `brutalChargeBonus(traits, action)` in
  `roll-helpers.mjs` (+3 when a `type:'trait'` item named "Brutal Charge" is present and
  `action==='Charge'`; `hasTalent` only matches talents, so the melee path passes trait
  items). Wired in `damage-data._calculateDamage` melee block → `modifiers['brutal
  charge']` reaches `_totalDamage`. NOT an AE (Charge-gated) → ratchet CODE_HANDLED
  (double-apply guard). Node test `brutal_charge.test.mjs` (4 cases). Gate green (build
  OK, 78 node tests). The 5 Reaction-budget/extra-attack items have NO apply point (no
  per-round Reaction tracker) → split to ENGINE-REACTION-BUDGET below; E2E-BRUTAL-CHARGE
  below.

- [ ] E2E-BRUTAL-CHARGE — verify on rt-smoke (Playwright): an NPC/creature with the
  Brutal Charge trait making a melee attack with the **Charge** action shows damage
  raised by +3 on the attack card vs the same creature attacking with Standard Attack /
  All Out Attack (no bonus), and vs a creature WITHOUT the trait (no bonus). Attack/damage
  pipeline is Foundry-coupled — node gate can't exercise it. (E2E)

- [x] ENGINE-REACTION-BUDGET — the rest of ENGINE-EXTRA-DEFENCE: extra-Reaction / extra-
  attack count machinery with no current apply point. Needs a per-round combat-state
  tracker on the actor (Reactions used this round, reset on turn) — none exists today.
  Items: Step Aside (+1 Dodge/round), Wall of Steel (+1 Parry/round), Counter Attack
  (free attack after a successful Parry), Furious Assault (extra attack after an All Out
  Attack hit), WAAAGH! (extra attack after a Charge hit). All are post-resolution /
  budget-gated → heavily Foundry-coupled (combat tracker hooks + UI), no clean pure-JS
  slice. RT Core / ItS. Design the Reaction-budget field first; add any extractable
  helper + node test; E2E follow-up. (ENGINE) — done iter 32: designed the field +
  shipped the extractable MAX-budget slice. Added schema `system.combat.reactions {base,
  dodge:{max,value}, parry:{max,value}}` to the `creature` template (acolyte+npc). Pure
  helper `reactionBudget(talents)` in `roll-helpers.mjs` → per-Round maxima: base 1
  Reaction (Dodge OR Parry), +1 Dodge-only with Step Aside (RT Core p.119), +1 Parry-only
  with Wall of Steel (RT Core p.121); base Reaction is shared (RT Core p.244). Wired into
  `acolyte._computeCharacteristics()` derived data by talent name → sets `combat.reactions.
  {base,dodge.max,parry.max}` (defensive `?.`/`if` guards for pre-schema NPC data). NOT an
  AE (engine-applied by name) → Step Aside + Wall of Steel added to ratchet CODE_HANDLED
  (double-apply guard). Node test `reaction_budget.test.mjs` (6 cases). Gate green (build
  OK, 84 node tests). The used-this-Round tracking/reset and the extra-ATTACK triggers have
  NO apply point yet → split to ENGINE-REACTION-BUDGET-TRACK + ENGINE-REACTION-ATTACK-TRIG
  below; E2E-REACTION-BUDGET below.

- [ ] E2E-REACTION-BUDGET — verify on rt-smoke (Playwright): an actor with the Step Aside
  talent shows `system.combat.reactions.dodge.max === 2` (parry.max 1); an actor with Wall
  of Steel shows `parry.max === 2` (dodge.max 1); both talents → both maxes 2; a plain
  actor → all maxes 1; `base` is 1 throughout. Confirm NPC actors (creature template) also
  compute the budget. Derived-data + Foundry-coupled — node gate can't exercise it. (E2E)

- [x] ENGINE-REACTION-BUDGET-TRACK — the per-Round Reaction USED counter + reset. Done
  iter 33: pure gate helper `canSpendReaction(reactions, type)` in `roll-helpers.mjs` —
  answers "is a Dodge/Parry Reaction still available?" enforcing BOTH the per-type cap
  (`dodge.max`/`parry.max`) AND the SHARED-base overall cap (total ≤ dodge.max + parry.max
  − base, so you can't Dodge AND Parry off the single base Reaction). Wired the spend into
  `acolyte.rollSkill('dodge'|'parry')`: only while the actor is in an active, started combat
  → block+warn when exhausted, else tick `system.combat.reactions.<type>.value` via update
  (guarded so out-of-combat Dodge/Parry skill tests are unaffected). Wired the reset via a
  new `combatTurnChange` hook (`HooksManager.onCombatTurnChange`) — the active GM zeroes the
  used counters when it becomes the actor's turn (RT Core p.244, Reactions refresh each
  Round). Step Aside / Wall of Steel stay CODE_HANDLED (no AE; this adds tracking, not new
  wiring) → no ratchet change. Node test `reaction_track.test.mjs` (7 cases: shared base,
  Step Aside/Wall of Steel/both, bad input, pre-schema fallback). Gate green (build OK, 91
  node tests). The combat-hook reset + rollSkill spend are Foundry-coupled (node gate can't
  exercise) → E2E-REACTION-TRACK below. (ENGINE)

- [ ] E2E-REACTION-TRACK — verify on rt-smoke (Playwright): with an active combat, an actor
  rolling Dodge then Parry on the same Round gets blocked on the second (shared base — warn
  "No Parry Reaction remaining"); a Step Aside actor can Dodge twice but not also Parry; a
  Wall of Steel actor can Parry twice but not Dodge; both-talents actor gets 3 total. On the
  actor's next turn the used counters reset to 0. Out-of-combat Dodge/Parry skill rolls are
  NOT blocked or counted. Combat hooks + rollSkill spend are Foundry-coupled — node gate
  can't exercise them. (E2E)

- [x] ENGINE-REACTION-ATTACK-TRIG — the extra-ATTACK post-resolution triggers (separate
  from the Reaction budget): Counter Attack (free attack after a successful Parry), Furious
  Assault (extra attack after an All Out Attack hit), WAAAGH! (extra attack after a Charge
  hit). Each grants an additional attack gated on a specific prior outcome — no apply point
  exists (the attack flow doesn't surface "you may make a free attack now"). Needs an
  attack-pipeline hook + a prompt/button on the result card. Heavily Foundry-coupled. RT
  Core / ItS (Counter Attack p.115, Furious Assault p.117, WAAAGH! ItS). Add any extractable
  eligibility helper + node test; E2E follow-up. (ENGINE) — done iter 34: shipped the
  extractable eligibility slice. Pure helper `extraAttackEligibility(talents, ctx)` in
  `roll-helpers.mjs` — given the resolved outcome (`{action, hit, parrySuccess}`) returns the
  eligible triggers with cost + to-hit mod: Counter Attack on `parrySuccess` (Free Action,
  -20; RT Core p.115), Furious Assault on a `hit` with `action==='All Out Attack'` (spends a
  Reaction; RT Core p.117), WAAAGH! on a `hit` with `action==='Charge'` (spends a Reaction;
  ItS p.173). Action strings match `combat-actions.mjs` exactly. NOT an AE (outcome-gated,
  engine-applied by name) → ratchet CODE_HANDLED (double-apply guard). Node test
  `extra_attack_trigger.test.mjs` (6 cases). Gate green (build OK, 97 node tests). The
  prompt/button on the result card that rolls the extra attack + the Reaction spend (via
  `canSpendReaction`) have NO apply point yet → E2E-REACTION-ATTACK-TRIG below. (ENGINE)

- [ ] E2E-REACTION-ATTACK-TRIG — verify on rt-smoke (Playwright): an actor with Furious
  Assault landing an All Out Attack hit sees a "free additional attack" prompt/button on the
  result card and rolling it spends a Reaction; the same actor with WAAAGH! on a successful
  Charge sees it; an actor with Counter Attack after a successful Parry sees a Free-Action
  attack offer at -20 (no Reaction spent); a missed All Out Attack / Charge, or the wrong
  action, surfaces no offer; an actor without the talent never sees it. Attack/result-card
  pipeline + Reaction spend are Foundry-coupled — node gate can't exercise them. (E2E)

- [x] ENGINE-ATTACK-TALENTS — Swift Attack (2 melee hits) / Lightning Attack (3 melee
  hits) as TALENTS (RT lists them as Talents, not actions; currently `legacy: true`
  actions per 0.7.22). Decide: grant the action when the talent is present, or apply the
  additional-hit count in the attack flow. Pure-JS test on the hit-count helper; E2E.
  (ENGINE) — done iter 35: chose BOTH halves of "grant the action when present" + RT-canon
  hit count. Corrected the two legacy action defs to RT canon (Half→Full, Lightning
  modifier −10→0, descriptions = "two/three melee attacks") and surfaced each as a melee
  Full-Action option in `updateAvailableCombatActions` ONLY when
  `rollData.sourceActor.hasTalent(name)` (legacy flag still hides them by default). New
  pure helper `attackTalentExtraHits(action)` in roll-helpers.mjs → flat extra hits Swift=1
  / Lightning=2 (NOT the DH2 DoS-scaled count); removed Swift from the Semi-Auto branch +
  Lightning from the Full-Auto branch in action-data.mjs and applied the flat count on the
  success path. NOT an AE (engine-applied by name) → both added to ratchet CODE_HANDLED
  (double-apply guard). RT Core p.107 (Swift) / p.102 (Lightning). Node test
  `attack_talents.test.mjs` (5 cases). Gate green (build OK, 102 node tests). Two-Weapon
  Wielder / "Lightning replaces Swift, not with Dual Strike" left narrative (both options
  shown if both talents owned). E2E follow-up below. (ENGINE)

- [ ] E2E-ATTACK-TALENTS — verify on rt-smoke (Playwright): an actor WITH the Swift Attack
  talent wielding a melee weapon sees "Swift Attack" in the attack-action dropdown and a
  successful hit scores 1 additional hit (2 total); WITH Lightning Attack sees it and scores
  2 additional (3 total); an actor WITHOUT the talent sees neither option; the options do NOT
  appear for a ranged weapon; Unbalanced/Unwieldy melee weapon still removes Lightning Attack.
  Confirm the count is flat (does not scale with DoS) and reaches the damage card's hit count.
  Attack pipeline + dropdown are Foundry-coupled — node gate can't exercise it. (E2E)

- [x] ENGINE-UNNATURAL — traits that SET/scale an Unnatural multiplier or double a bonus.
  Done iter 36: shipped the ONE clean, double-apply-safe slice — **Quadruped** (×AgB move,
  RT Core p.366). Movement is fully computed in `base-actor._computeMovement` (never baked),
  so trait-gating it can't double-count. Pure helper `quadrupedMoveMultiplier(traits)` in
  `roll-helpers.mjs` (plain Quadruped ×2; explicit `(xN)` → N; `(N legs)` → N/2, so 6 legs
  ×3 / 8 legs ×4 per canon; min ×2; defensive). Wired into `_computeMovement` to scale ONLY
  the Agility-Bonus term (`agility.bonus * mult + size - 4`), size modifier stays additive.
  NOT an AE (scales the derived AgB an AE can't read) → ratchet CODE_HANDLED (double-apply
  guard). Node test `quadruped_move.test.mjs` (7 cases). Gate green (build OK, 109 node
  tests). The remaining members SET/scale `characteristics.<k>.unnatural` or hook the
  damage/Wounds/psychic path and carry a **double-apply risk** (the NPC pipeline pre-bakes
  `unnatural: N` into characteristics, and many of those NPCs ALSO embed an "Unnatural X"
  trait item) → split to ENGINE-UNNATURAL-CHARS + ENGINE-UNNATURAL-DAMAGE below; E2E follow-up.
  (ENGINE)

- [ ] E2E-UNNATURAL-MOVE — verify on rt-smoke (Playwright): an NPC with the Quadruped
  trait shows Half/Full/Charge/Run movement using 2×AgB (the AgB term doubled, size mod
  unchanged) vs the same NPC without it; a `Quadruped (x3)` creature uses 3×AgB and a
  `Quadruped (8 legs)` creature 4×AgB; a non-quadruped actor is unchanged. Derived-data +
  Foundry-coupled — node gate can't exercise it. (E2E)

- [x] ENGINE-UNNATURAL-CHARS — the characteristic-`unnatural` members of ENGINE-UNNATURAL:
  Unnatural Characteristic / Unnatural Toughness (x2) / Unnatural Strength etc. (Unnatural
  Speed = movement-only, Unnatural Senses = sensory → both skipped, not char multipliers;
  "Greenskin Hybrid" as described in this task does NOT exist — the pack's `Kindred: Greenskin
  Hybrid` is poison immunity, narrative, not +10 T). Done iter 37: chose the **SET-when-unset**
  semantics the task suggested. Pure helper `unnaturalCharacteristicMultipliers(traits)` in
  `roll-helpers.mjs` parses "Unnatural <Char> (xN)" trait names → {lowercased label →
  multiplier≥2} (no-parens ⇒ ×2; generic/Speed/Senses skipped). Wired into
  `acolyte._computeCharacteristics`: derive `.unnatural = rawBonus×(mult−1)` ONLY when no value
  is already present (`if (!(characteristic.unnatural > 0))`), so a drag-dropped trait doubles
  the Characteristic Bonus while the NPC-pipeline pre-baked additive (hundreds of NPCs bake
  `unnatural:N` AND carry the trait) is never doubled. NPCs inherit acolyte's compute (npc.mjs
  is a thin subclass). NOT an AE (multiplies a value-dependent derived bonus) → ratchet
  CODE_HANDLED ('Unnatural Toughness (x2)' — the one specific-char Unnatural trait that is a
  standalone pack entry). RT Core p.368. Node test `unnatural_chars.test.mjs` (8 cases). Gate
  green (build OK, 117 node tests). Movement-exclusion caveat (RT p.368: movement uses UNMODIFIED
  AgB; `_computeMovement` reads the multiplied `agility.bonus`, a pre-existing NPC deviation) left
  to ENGINE-UNNATURAL-MOVE. E2E follow-up below. (ENGINE)

- [ ] E2E-UNNATURAL-CHARS — verify on rt-smoke (Playwright): a PC with a drag-dropped
  "Unnatural Toughness (x2)" trait (and `characteristics.toughness.unnatural` 0 in source)
  shows displayed Toughness Bonus doubled (and derived TB/Wounds/Fatigue-max shift) vs
  without it; an "Unnatural Strength (x3)" trait triples the Strength Bonus; an existing NPC
  with a pre-baked `unnatural` value AND the matching trait is UNCHANGED (no double-apply);
  the generic "Unnatural Characteristic" / "Unnatural Speed" / "Unnatural Senses" traits add
  no characteristic bonus. Derived-data + Foundry-coupled — node gate can't exercise it. (E2E)

- [x] ENGINE-UNNATURAL-DAMAGE — the damage/Wounds/psychic-path members of ENGINE-UNNATURAL
  that can't be a characteristic AE: Daemonic (×2 TB vs damage — assign-damage reduction
  path), Bastion of Iron Will (×2 defensive Psy Rating — opposed/resist-psychic path). Each
  needs its own engine hook by trait/talent name in the relevant `rolls/*`; no clean pure-JS
  slice without the surrounding pipeline. Add any extractable helper + node test; E2E. RT
  Core / ItS. (ENGINE) — done iter 38: shipped the clean Daemonic slice + both extractable
  helpers. Pure helpers `daemonicToughnessMultiplier(traits)` (×2 if a `Daemonic` trait
  present) and `bastionPsyMultiplier(talents)` (×2 if Bastion of Iron Will present) in
  `roll-helpers.mjs`. **Daemonic WIRED**: `assign-damage-data.update()` doubles the
  per-location `this.tb` when the target carries the Daemonic trait, so the boosted TB flows
  through BOTH the main damage reduction and the True Grit crit reduction in `finalize()`
  (RT Core p.364; the 4 canon exceptions — force/psychic/holy/other-Daemonic — aren't
  surfaced in the assign-damage hitData, so they stay GM-adjudicated, documented not invented).
  **Bastion**: fixed a data bug first — the `Bastion of Iron Will` entry carried Battle Rage's
  benefit ("Parry while Frenzied", prereq Frenzy); restored canon "doubles his defensive Psy
  Rating on any Opposed Test involving the Psyniscience Skill or Psychic Techniques" + prereqs
  "Psy Rating, Strong Minded, Willpower 40" + `source: …p.94`. Helper shipped, but the BASE
  mechanic (adding defensive Psy Rating to the opposed psychic-resist test) has no apply point
  — `checkForOpposed` rolls a plain characteristic check — so the apply point is the
  Foundry-coupled follow-up (E2E-UNNATURAL-DAMAGE below). Both NOT AEs (engine-applied by name)
  → ratchet CODE_HANDLED (double-apply guard). Node test `unnatural_damage.test.mjs` (8 cases).
  Gate green (build OK, 125 node tests). Found an adjacent data bug (Battle Rage carries
  Berserk Charge's text) → CLEANUP-BATTLE-RAGE below. Bastion of Iron Will / Bastion of Iron
  Will (x2 Psy Rating apply point) E2E below.

- [ ] E2E-UNNATURAL-DAMAGE — verify on rt-smoke (Playwright): (Daemonic) assign damage to an
  NPC with the Daemonic trait and confirm the soak uses 2×TB (e.g. 10 dmg / pen 0 to a Body
  with worn AP 0 + TB 4 → Daemonic reduction 8, not 4) vs the same NPC without the trait;
  confirm the doubled TB also feeds a True Grit crit reduction. (Bastion) once the base
  opposed-psychic-resist contribution is wired, a defender with Bastion of Iron Will resolves
  an Opposed Psyniscience/Psychic-Technique test with DOUBLE its defensive Psy Rating vs the
  same defender without it. Assign-damage + opposed-psychic pipelines are Foundry-coupled —
  node gate can't exercise them. (E2E)

- [x] CLEANUP-BATTLE-RAGE — data bug found in iter 38. Done iter 39: the `Battle Rage`
  entry in `talents.yml` actually held the **"doubles defensive Psy Rating"** text (a stray
  duplicate of Bastion of Iron Will's, left when iter 38 fixed Bastion — fix_plan predicted
  Berserk Charge's text, but the real stray was Bastion's, with prereqs "Psy Rating, Strong
  Minded, Willpower 40"). Restored canon "Long experience and indomitable will ... He can
  Parry while Frenzied." + prereq "Frenzy Talent" + `source: …p.94`. Berserk Charge (own
  entry) already carries the correct +20-charge `conditionalBonus` (0.7.6); confirmed no
  entry beyond Battle Rage is shifted (Berserk Charge, Best of the Best, Binary Chatter all
  match canon). Pure data edit — no wiring (Parry-while-Frenzied is narrative). Gate green
  (build OK, 125 node tests). (CLEANUP)

- [x] ENGINE-WOUNDS-MOD — additive Wounds term (mirror BUG-002's `initiative.modifier`):
  add `system.wounds.modifier` to `template.json`, fold into the Wounds compute in
  `acolyte.mjs`, then AE Sound Constitution `+1` (stackable) and Eaters of the Dead bonus
  Wounds. Pure-JS test on the compute; E2E. (ENGINE) — done iter 40: added `wounds.modifier:
  0` to the base template; pure helper `woundsMax(base, modifier)` in `roll-helpers.mjs`
  (string-coercing, null-safe, idempotent — wounds.max is stored, not otherwise recomputed,
  so the fold-in can't accumulate); wired into `acolyte._computeCharacteristics` right after
  the Initiative fold-in (covers acolyte+npc). **Sound Constitution WIRED** — AE (mode 2, _id
  SoundConstitn001) on `system.wounds.modifier` += 1; stackable (each purchased instance is a
  separate item → separate +1 AE); `source:` now cites RT Core p.111 (approx — talent pages
  collapse per CLAUDE.md). **Eaters of the Dead NOT wired** — its "bonus Wounds = devoured
  corpse's TB, capped at own TB, lasting TB hours, removed-first when damaged" is a timed/
  conditional/TB-derived activated effect; a static AE would wrongly grant permanent Wounds.
  Classified narrative/needs-engine (folds into ENGINE-CONSUMABLE-ACTIVATE) → added to ratchet
  NARRATIVE. Sound Constitution → ratchet WIRED_EXPECTED (kind ae). NOT double-applied (neither
  in CODE_HANDLED). Node test `wounds_mod.test.mjs` (4 cases). Gate green (build OK, 129 node
  tests). E2E follow-up below. (ENGINE)

- [ ] E2E-WOUNDS-MOD — verify on rt-smoke (Playwright): an actor with one Sound Constitution
  talent shows displayed max Wounds +1 vs without it; three stacked instances show +3; the
  token bar max reflects it. Confirm an NPC (creature template) with no `system.wounds.modifier`
  in source still computes (the `Number(...) || 0` guard) and Eaters of the Dead grants NO
  standing Wounds bonus (stays narrative until the activated-consumable engine lands). Derived
  data + Foundry-coupled — node gate can't exercise it. (E2E)

- [x] ENGINE-RAPID-RELOAD — Rapid Reload halves weapon reload times in the attack/reload
  path. Hook in `action-data.mjs` (or reload handling) by talent name. Pure-JS test on the
  reload-time helper; E2E. RT Core. (ENGINE) — done iter 41: first found+fixed a data bug —
  the `Rapid Reload` talent carried **Renowned Warrant's** benefit text ("+10 Interaction");
  restored canon "halves all reload times, rounding down (Half→Free, Full→Half, and so on)"
  + `source: …p.110`. No live reload action exists (`system.reload` is a free-text reference
  field nothing consumed), so the apply point is a derived **`system.effectiveReload`** set on
  every owned ranged weapon in `acolyte._computeWeaponReload()` (covers acolyte+npc): equals
  `system.reload` without the talent, halved by the pure helper `rapidReloadTime(reload,
  hasRapidReload)` in `roll-helpers.mjs` with it. Helper parses pack short-forms ('Half',
  'Full', '2 Full') AND config full-forms ('Half Action'…), converts to Full-Action units,
  halves, rounds DOWN to {Free/Half/N-Full}, returns config-style strings; N/A/''/Special pass
  through. Weapon item sheet shows "Effective: X" (titled Rapid Reload) when it differs.
  Engine-applied by talent name → NOT an AE → ratchet CODE_HANDLED (double-apply guard). Node
  test `rapid_reload.test.mjs` (6 cases). Gate green (build OK, 135 node tests). E2E follow-up
  below. (ENGINE)

- [ ] E2E-RAPID-RELOAD — verify on rt-smoke (Playwright): give an actor the Rapid Reload
  talent and an owned ranged weapon with `reload: 'Full'` → the weapon item sheet shows
  "Effective: Half Action" (and `weapon.system.effectiveReload === 'Half Action'`); a `2 Full`
  weapon shows "Full Action"; a `Half` weapon shows "Free Action"; remove the talent → no
  "Effective" row and `effectiveReload === reload`. Confirm an NPC (creature template) with the
  talent derives the same. Derived-data on embedded items + sheet are Foundry-coupled — node
  gate can't exercise it. (E2E)

- [x] ENGINE-TRAIT-GRANTS — talents/traits that GRANT another trait/talent: Explorator
  Implants (→ Mechanicus Implants), The Flesh is Weak / Physical Perfection (→ Machine),
  Sixth Sense (→ Psyniscience trained + Rival), 'Ard (meta-grant of Unnatural Toughness
  ×2 / Sturdy / Iron Jaw / True Grit). Needs item-grant machinery (auto-embed the granted
  item on create). Larger than a data edit. RT Core / ItS. (ENGINE) — done iter 42: built
  the item-grant machinery + wired the 4 clean item-grant entries. Granting entry carries
  `flags.rt.grants=[{name,type}]`; pure helper `pendingGrants(grants, existingItems)` in
  `roll-helpers.mjs` dedups vs the actor's current items (no double-grant on re-add or on
  an NPC that already bakes the granted items); the Foundry-coupled half
  `hooks-manager.applyItemGrants` resolves each from its pack by name+type and
  `createEmbeddedDocuments` (tagged `flags.rt.grantedBy`), fixing the long-standing
  `!item.parent.documentName === 'Actor'` always-false guard while there. Data:
  Explorator Implants → Mechanicus Implants (RT Core); The Flesh is Weak → Machine (RT
  Core); Physical Perfection → Machine (ItS p.199); 'Ard → Unnatural Toughness (x2) +
  Sturdy + Iron Jaw + True Grit (ItS). NOT an AE/cond → new ratchet `GRANTS_EXPECTED`
  list (validates the grants array + that every granted {name,type} resolves to a pack
  doc). Multiple-take Machine leveling left narrative. Node test `trait_grants.test.mjs`
  (6 cases). Gate green (build OK, 142 node tests). Sixth Sense (skill-grant + pickable
  Rival) and the cybernetics talent-grants split to WIRE-SIXTH-SENSE / WIRE-CYBER-GRANTS
  below; E2E follow-up below. (ENGINE)

- [ ] E2E-TRAIT-GRANTS — verify on rt-smoke (Playwright): dragging Explorator Implants
  onto an actor auto-embeds a Mechanicus Implants trait item; The Flesh is Weak / Physical
  Perfection embeds a Machine trait; 'Ard embeds Unnatural Toughness (x2) + Sturdy + Iron
  Jaw + True Grit; re-adding the same granting item does NOT add a second copy of any grant
  (pendingGrants dedup); and a pre-built NPC that already bakes both the granting item AND
  the granted items shows NO duplicates after import (the createItem-during-actor-creation
  ordering edge). Item-create hooks + compendium resolution are Foundry-coupled — node gate
  can't exercise them. (E2E)

- [x] WIRE-SIXTH-SENSE — `Sixth Sense` (trait, ItS p.11): grants "Psyniscience as a Trained
  Skill" (a skill ADVANCE, not an embeddable item) + "Rival (Inquisition) Talent" (a
  PICKABLE talent needing a pre-stamped `system.choice`). Neither fits the clean name+type
  item-embed used by ENGINE-TRAIT-GRANTS. Decide: (a) extend the grant machinery to accept
  a skill-advance grant (set `skills.psyniscience.advance`) + a pre-chosen pickable-talent
  grant (embed Rival with `system.choice: 'Inquisition'` + its conditional/peer effect), or
  (b) keep narrative. Pure-JS test on any extractable parse; E2E. (WIRE) — done iter 43:
  chose **(a)**, both halves. (1) **Psyniscience Trained** = AE on
  `system.skills.psyniscience.advance`, **mode 4 (UPGRADE) → 1** — sets Trained, never
  downgrades a higher advance, idempotent/stack-safe, reverts on trait removal (`advance` is
  AE-applied before `_computeSkills` reads it; `_skillAdvanceToValue(1)=0` ⇒ tests at full
  Per). → ratchet WIRED_EXPECTED (kind ae). (2) **Rival (Inquisition)** = extended the
  existing `flags.rt.grants` machinery with an optional **`choice`** field: `applyItemGrants`
  stamps `system.choice='Inquisition'` + renames the embed "Rival (Inquisition)" so
  `onCreateItem` skips the picker (it returns early on a pre-set choice); `pendingGrants`
  dedups choice grants by the embed's **BASE** name (parenthetical stripped) so a re-add
  doesn't double-grant. Rival's existing -10 Fellowship conditionalBonus applies vs the
  chosen group. → ratchet GRANTS_EXPECTED. NOT double-applied (neither in CODE_HANDLED). RT
  canon ItS p.11 (already cited in `source:`). Node test `trait_grants.test.mjs` +3 (choice
  passthrough, base-name dedup, plain-grant still full-name match). Gate green (build OK, 145
  node tests). E2E follow-up below. (WIRE)

- [ ] E2E-SIXTH-SENSE — verify on rt-smoke (Playwright): dragging the Sixth Sense trait onto
  an actor (a) raises Psyniscience to Trained — `skills.psyniscience.advance >= 1`, the skill
  no longer dimmed/blocked as untrained-Advanced, tests at full Perception — and does NOT
  downgrade an actor who already has Psyniscience at +10/+20 (UPGRADE keeps the higher); (b)
  auto-embeds a "Rival (Inquisition)" talent item with `system.choice === 'Inquisition'` and
  NO picker prompt; re-adding Sixth Sense does NOT add a second Rival (base-name dedup);
  ticking Rival's checkbox on a Fellowship test vs the Inquisition applies -10. AE-to-advance,
  the choice embed, and the create hook are Foundry-coupled — node gate can't exercise them.
  (E2E)

- [x] WIRE-CYBER-GRANTS — cybernetics that GRANT a talent (reuse the ENGINE-TRAIT-GRANTS
  `flags.rt.grants` machinery): Bionic Heart → Sprint, Vitae Supplacement → Autosanguine,
  Memorance Implant → Total Recall, Blackbone Bracing → Bulging Biceps + Iron Jaw,
  Augmented Senses → Heightened Senses (pickable sense — needs a pre-stamped choice, see
  WIRE-SIXTH-SENSE). Add `flags.rt.grants` to each; add the names to the ratchet
  `GRANTS_EXPECTED`. (Blackbone's +2 unarmed dmg stays ENGINE-NATWEAPONS; Augmented
  Senses' pickable-choice grant depends on the WIRE-SIXTH-SENSE decision.) RT Core / ItS,
  cite pp.131-135. E2E follow-up. (WIRE) — done iter 44: wired the 4 DETERMINISTIC grants
  via `flags.rt.grants` (the `applyItemGrants` hook runs for any item type, before the
  talent-only early return, so cybernetic items grant fine): Bionic Heart → Sprint, Memorance
  Implant → Total Recall (RT Core p.133); Vitae Supplacement → Autosanguine, Blackbone Bracing
  → Bulging Biceps + Iron Jaw (ItS p.142). All 5 granted talents exist (type talent) and resolve
  in the ratchet's GRANTS_EXPECTED check (added the 4 names). Blackbone's +2 unarmed dmg left
  for ENGINE-NATWEAPONS. **Augmented Senses kept NARRATIVE** — "Heightened Senses for any one
  sense" is a player choice among 5 distinct FIXED pack docs (no pickable base entry), so the
  clean name+type grant can't express "pick one of 5"; the WIRE-SIXTH-SENSE `choice` field only
  works for a single `flags.rt.pickable` talent, which Heightened Senses isn't. Added to ratchet
  NARRATIVE. None in CODE_HANDLED (no double-apply). Page cites added to each `source:`. Gate
  green (build OK, 145 node tests). E2E follow-up below. (WIRE)

- [ ] E2E-CYBER-GRANTS — verify on rt-smoke (Playwright): dragging Bionic Heart onto an actor
  auto-embeds a Sprint talent item; Memorance Implant → Total Recall; Vitae Supplacement →
  Autosanguine; Blackbone Bracing → both Bulging Biceps AND Iron Jaw; re-adding the same
  cybernetic does NOT add a second copy of any granted talent (pendingGrants dedup); and an
  actor that already owns the granted talent before adding the cybernetic gets no duplicate.
  Confirm Augmented Senses grants nothing automatically (narrative — player drags their chosen
  Heightened Senses talent). Item-create hooks + compendium resolution are Foundry-coupled —
  node gate can't exercise them. (E2E)

- [x] ENGINE-NATWEAPONS — natural-weapon / unarmed damage-formula overrides: Natural
  Weapons, Improved Natural Weapons, Unarmed Master (1d10+SB, no Primitive), Unarmed
  Warrior (1d10−3). Apply point is the unarmed-damage path in `damage-data.mjs`. Pure-JS
  test on the formula selection; E2E. RT Core / ItS. (ENGINE) — done iter 45: pure helper
  `unarmedDamageProfile(talents, traits)` in `roll-helpers.mjs` returns `{formula,
  primitive, source}` for the attacker's BEST applicable profile — Unarmed Master /
  Improved Natural Weapons → 1d10 non-Primitive; Natural Weapons → 1d10 Primitive; Unarmed
  Warrior → 1d10-3 Primitive; baseline → 1d5-3 Primitive (dice only; +SB added by the melee
  path). Apply point: an unarmed strike is a **Melee-class weapon of `type: 'Unarmed'`**
  (added 'Unarmed' to `weapon_type` config so the existing `isMelee`/SB/melee path keeps
  working — class must stay 'Melee', since `isRanged` = `class !== 'melee'`). Wired in
  `damage-data._calculateDamage`: overrides `rollFormula` before the Roll, and SUPPRESSES
  the weapon's Primitive cap when the profile is non-Primitive (Unarmed Master / Improved
  Natural Weapons' "no longer Primitive" benefit). RT Core p.122/p.241/p.367 + ItS. NOT an
  AE (rewrites the damage formula) → all 4 added to ratchet CODE_HANDLED (double-apply
  guard; none previously handled in `rolls/`). Node test `unarmed_damage.test.mjs` (8
  cases). Gate green (build OK, 153 node tests). E2E follow-up below. (ENGINE)

- [ ] E2E-NATWEAPONS — verify on rt-smoke (Playwright): give an actor a Melee-class weapon
  with `system.type === 'Unarmed'` (carrying a Primitive (X) special) and confirm the attack
  card's damage dice = 1d5-3 (+SB) baseline; add Unarmed Warrior → 1d10-3 (+SB), still capped
  by Primitive; add Unarmed Master → 1d10 (+SB) with the Primitive cap GONE; a creature with
  the Natural Weapons trait → 1d10 (+SB) Primitive; Improved Natural Weapons → 1d10 (+SB) no
  Primitive. Confirm a non-Unarmed melee weapon is unchanged, and the Strength Bonus is added
  exactly once. Attack/damage pipeline is Foundry-coupled — node gate can't exercise it. (E2E)

- [x] AUDIT-CRITIC — Completeness pass: re-run the ratchet, list anything still
  unresolved (unwired and not justified-narrative), confirm no code-handled entry got
  an AE (grep), and regenerate the data-vendor-queue audit summary. (AUDIT) — done iter
  48: scanned talents+traits+cybernetics (387 docs) for mechanical phrasing
  cross-referenced against all four ratchet lists (159 unique tracked) → **0 unresolved**
  (every mechanical entry wired or recorded). Double-apply guard re-confirmed: all 28
  CODE_HANDLED names referenced by name in rolls/+documents/+roll-helpers.mjs, ratchet
  guard passes (none double-AE'd). Found 58 wired-but-untracked entries (pre-existing
  0.7.6 talent-mechanics + backgrounds-loop wiring, NOT this loop's gaps) — shape-valid
  (soft test, 0 warnings) but not under WIRED_EXPECTED backpressure → appended
  RATCHET-HARDEN-PREEXISTING below. Summary regenerated in `.ralph/data-vendor-queue.md`
  + `loops/effects-audit/triage.md`. Verification/documentation only — no pack change.
  Gate green (build OK, 154 node tests). (AUDIT)

- [x] RATCHET-HARDEN-PREEXISTING — bring the 58 wired-but-untracked entries
  (AUDIT-CRITIC iter 48) under ratchet backpressure: add each to `WIRED_EXPECTED` (kind
  `ae`/`cond` per its wiring) or `GRANTS_EXPECTED` in
  `tests/chargen/effect_wiring_audit.test.mjs` so a regression that strips their wiring
  turns the gate red (today only the soft shape test would notice, and only if the
  wiring is malformed — not if it's deleted). These are valid pre-existing wirings from
  the 0.7.6 talent-mechanics overhaul + the backgrounds loop (Hotshot Pilot, Machinator
  Array, Frenzy, the Resistance variants, the pickable talents, the background
  traits/Klan/Kindred conds, etc. — full list in `.ralph/data-vendor-queue.md` iter 48).
  No data/code change — pure test hardening; gate must stay green. Split into a couple
  of batches if the list is unwieldy. (WIRE) — done iter 49: authoritative re-scan (not
  the prose list) found 51 entries with real effects/conditionalBonuses → added to
  WIRED_EXPECTED (53 rows; Hivebound + Kindred: Bold Hunter dual ae+cond). The 7-entry
  gap vs the prose "58" is pickable-only talents (Exotic Weapon Training, Psychic
  Technique, Talented, Weapon Master, Warp Eye, Weapon Training, Resistance) — no static
  AE/cond, so they can't sit in WIRED_EXPECTED → new PICKABLE_EXPECTED list + guard test
  asserting each still carries flags.rt.pickable. None in CODE_HANDLED/NARRATIVE (classify
  excluded every already-tracked name → no double-apply / no collision). Gate green (build
  OK, 155 node tests; +1 pickable guard). Test-only — no E2E. (WIRE)

### AUDIT-003 follow-ups (`cybernetics`; see `loops/effects-audit/triage.md` AUDIT-003)

- [x] WIRE-CYBER-AE — always-on AEs on 5 cybernetics (Common-baseline unconditional
  bonuses), copying the talents-pack AE shape (unique 16-char `_id`, `mode 2` on
  `system.{characteristics|skills}.<k>.modifier`, `transfer` default): Calculus Logi
  Upgrade (+10 `skills.{literacy,logic,scholasticLore}.modifier`), Optical Mechadendrite
  (+10 `characteristics.perception.modifier`), Medicae Mechadendrite (+10
  `skills.{medicae,interrogation}.modifier`), Scribe-Tines (+10 `skills.inquiry.modifier`
  — "Investigation" remaps to `inquiry`; confirm vs `scrutiny` against the skill list),
  Utility Mechadendrite (+10 `skills.techUse.modifier`). Cite RT Core p.131-135 in each
  `source:`/AE. Add the 5 names to ratchet `WIRED_EXPECTED` (kind ae). (WIRE) — done iter
  27: 5 AEs added (mode 2; _ids CalcLogiUpgrd001/MedicaeMechdnAE1/OpticalMechdnAE1/
  ScribeTinesAE001/UtilityMechdnAE1); each `source:` now cites the book page (Calculus
  Logi p.132, the 4 mechadendrites/Scribe-Tines p.134) verified against RT-DOCS CoreBook
  markdown. Scribe-Tines "+10 all Investigation Tests" remapped to `inquiry` (RT 1e has
  no Investigation skill) — flagged for review in the data-vendor-queue. Optical's night
  +20 vision and the conditional cybernetics left for WIRE-CYBER-COND. None in
  CODE_HANDLED (no double-apply). Added the 5 to ratchet WIRED_EXPECTED (kind ae). Gate
  green (build OK, 72 node tests). E2E follow-up below. (WIRE)

- [ ] E2E-CYBER-AE — verify on rt-smoke (Playwright): an actor carrying each of the 5
  cybernetic items shows the +10 reaching the relevant value — Calculus Logi → Literacy/
  Logic/Scholastic Lore skill totals; Medicae → Medicae/Interrogation; Optical → displayed
  Perception characteristic; Scribe-Tines → Inquiry; Utility → Tech-Use — vs the same actor
  without the item (the item AE transfers via `_computeSkills`/characteristic modifier
  two-pass). Confirm the scholasticLore (specialist) speciality rolls also pick up the base
  +10. Foundry-coupled — node gate can't exercise it. (E2E)

- [x] WIRE-CYBER-COND — `flags.rt.conditionalBonuses` on 4 cybernetics: Bionic
  Respiratory System (+20 toughness "resisting airborne toxins/gas"), Manipulator
  Mechadendrite (+20 strength "using the manipulator mechadendrite"), Optical
  Mechadendrite (+20 perception "vision-based at night" — second cond on the same item
  wired in WIRE-CYBER-AE), Mind Impulse Unit (+10 techUse/pilot/drive "interfaced with
  MIU systems"). RT Core p.131-135. Add the 4 to ratchet `WIRED_EXPECTED` (kind cond).
  (WIRE) — done iter 28: Bionic Respiratory System +20 toughness "resisting airborne
  toxins or gas" (Common, RT Core p.132); Manipulator Mechadendrite +20 strength "using
  the manipulator mechadendrite" (p.134); Mind Impulse Unit (miu) +10 [techUse,pilot,
  drive] "in conjunction with MIU-linked devices" (Common, p.134 — verified the YAML
  entry already holds the correct canonical MIU description, NOT the weapon-interface
  text); Optical Mechadendrite +20 perception "vision-based at night" (p.134, alongside
  its iter-27 +10 always-on AE). None in CODE_HANDLED (no double-apply); only the
  Common-baseline conditionals wired (craftsmanship deltas stay narrative). Added the 4
  to ratchet WIRED_EXPECTED (kind cond; Optical as a 2nd entry). Gate green (build OK,
  72 node tests). E2E follow-up below. (WIRE)

- [ ] E2E-CYBER-COND — verify on rt-smoke (Playwright): an actor carrying each of the 4
  cybernetic items sees the labelled checkbox on the relevant roll prompt — Bionic
  Respiratory System on a Toughness test, Manipulator Mechadendrite on a Strength test,
  Mind Impulse Unit on Tech-Use/Pilot/Drive skill rolls, Optical Mechadendrite on a
  Perception test (the night +20 cond, in addition to its always-on +10 AE already in the
  base value) — and ticking it adds the bonus (+20/+20/+10/+20) into
  `rollData.modifiers.modifier` reaching the test total. Node gate can't exercise the
  roll prompt. (E2E)

- [x] NARRATIVE-RECORD-CYBER — add the intentionally-unwired cybernetics to the ratchet
  `NARRATIVE` list (in `triage.md` AUDIT-003): Cybernetic Senses, Bionic Arm, Bionic
  Locomotion (legs, Hips, Pelvis, Etc.), Auger Arrays, Baleful Eye, Ballistic
  Mechadendrite, Miu Weapon Interface, Internal Blade, Internal Power Cell, Locator
  Matrix, Respiratory Filter Implant, Gastral Bionics, Pain Ward, Voidskin, Volitor
  Implant, Vox Implant, Implant Systems. (The talent-grant / SB / unarmed-damage / ×2
  cybernetics — Augmented Senses, Bionic Heart, Memorance Implant, Vitae Supplacement,
  Blackbone Bracing, Synthetic Muscle Grafts, Cortex Implants — extend the existing
  ENGINE-TRAIT-GRANTS / ENGINE-UNNATURAL / ENGINE-NATWEAPONS tasks, NOT this list.)
  Verify each is genuinely text-only before adding. (NARRATIVE) — done iter 29: verified
  all 17 carry no effects/conditionalBonuses (wiring blocks live only on the 8
  WIRE-CYBER-AE/COND entries — Bionic Respiratory System, Calculus Logi, Manipulator/
  Medicae/Optical/Utility Mechadendrite, Mind Impulse Unit, Scribe-Tines); exact names
  match the pack; none in CODE_HANDLED/WIRED_EXPECTED. Added to ratchet `NARRATIVE`
  (guarded by the "narrative entries carry no wiring" test). Gate green (build OK, 72
  node tests). The 7 grant/SB/×2 cybernetics correctly excluded (extend ENGINE-* tasks).

### AUDIT-004 follow-ups (`weapon-mods`/`ammo`/`consumables`; see `triage.md` AUDIT-004)

- [x] WIRE-AMMO-NAME-SYNC — fix already-written-but-inert ammo wiring (a bug, no new
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
  — done iter 30: confirmed `isAmmunition` = `type==='ammunition'` and the WHOLE ammo
  apply path (ammo.mjs, called from damage-data.mjs) selects via `isAmmunition` → the
  re-type+move is correct (a parallel weapon-modifiers switch would never fire in those
  hooks). Renamed the 3 drifted case keys; moved the 6 docs weapon-mods.yml→ammo.yml
  (36→30 / 12→18), re-typed `ammunition`, added target/effect/weaponType. Made the
  now-live effects canon-faithful (specs/06: don't invent): dropped a non-canon Blast on
  Explosive Arrows (RT Core p.137) and a non-canon -1 dmg on Toxic Shot (ItS p.131);
  ADDED the canon +3 dmg for Bleeder Rounds (was unwired) and replaced its invented
  blood-loss note with the living-targets-only canon text. New node guard
  `tests/chargen/ammo_wiring.test.mjs` (every ammo.mjs `case`→ an ammunition-typed pack
  entry; +the 6 moved rounds) since these packs have no ratchet coverage. NOT double-
  applied (no code-handled overlap). Gate green (build OK, 74 node tests). E2E below.

- [ ] E2E-AMMO-NAME-SYNC — verify on rt-smoke (Playwright): embed each special round
  (Amputator/Bleeder/Dumdum/Expander/Explosive Arrows and Quarrels/Hot-Shot Charge Pack/
  Toxic Shot) in a compatible weapon and confirm the attack card now shows the effect —
  Amputator +2 dmg, Bleeder +3 dmg (note: living-only), Dumdum +2 dmg + AP-double note,
  Expander +1 dmg/+1 pen, Explosive Arrows -10 hit + Explosive type + Primitive removed
  (NO Blast), Hot-Shot +1 dmg/Tearing/+4 pen/clip→1/Reliable removed, Toxic Shot gains
  Toxic (NO -1 dmg) — vs the same weapon with no round loaded showing none. Selection +
  attack pipeline are Foundry-coupled — node gate can't exercise it. (E2E)

- [x] WIRE-AMMO-ADD-QUALITY — for ammo whose entire mechanic is "gains an
  engine-handled quality," push the quality in `ammo.mjs::calculateAmmoSpecials`: Snare
  Shells→`Snare`, Airtorch Canister→`Scatter`+`Overheats` (the damage engine already
  resolves these — only the trigger is missing). The −2 dmg / ½ range deltas stay
  narrative (no clean apply). Pure-JS test on the quality-push helper; E2E follow-up.
  RT/ItS. (WIRE) — done iter 46: pushed in `calculateAmmoAttackSpecials` (the existing
  Toxic/Flame/Tearing apply point that runs BEFORE the roll, so Scatter's to-hit/range
  delta + the Overheats jam check both engage; the task's `calculateAmmoSpecials`
  reference was the per-hit fn — wrong place for pre-roll qualities). Snare → `{name:
  'Snare', level: 0}` (canon base Challenging +0 immobilise test; the snare effect text
  reads `level*-10` ⇒ +0); Airtorch → `{name:'Scatter'}` + `{name:'Overheats'}` (level-
  less, like Flame). All three verified engine-resolved (damage-data Scatter ±3, action-
  data Overheats jam, damage-data snare effect) and present in attack-specials.mjs.
  **Data bug fixed first:** both entries carried wrong copy-pasted descriptions (Snare
  Shells held Toxic-Shot poison text; Airtorch held Microburst-Flask plasma text) —
  restored canon descriptions + availability (rare / extremely rare) so the entry text
  matches the wired quality (ItS p.131). −2 dmg (Snare) / ½ Range (Airtorch) left
  narrative. None in CODE_HANDLED (no double-apply). Extended `ammo_wiring.test.mjs` (the
  first guard already auto-covers the new case names; added a focused mapping+validity
  test). Gate green (build OK, 154 node tests). E2E follow-up + CLEANUP below. (WIRE)

- [ ] E2E-AMMO-ADD-QUALITY — verify on rt-smoke (Playwright): load Snare Shells in a
  Solid-Projectile weapon → attack card shows the Snare effect (Challenging +0 immobilise
  test); load Airtorch Canister in a Melta weapon → the weapon gains Scatter (close-range
  +3 / long −3 damage adjustment) and can Overheat (jam at 91+). Confirm no quality
  appears with no round loaded. Selection + attack pipeline are Foundry-coupled — node
  gate can't exercise it. (E2E)

- [x] CLEANUP-AMMO-DESC-SCRAMBLE — discovered iter 46: the ammo pack has a chain of
  copy-pasted/OCR-scrambled descriptions. Done iter 47: audited all 9 ItS Unusual-
  Ammunition rows (Table 3-7) against ItS p.131 (intothestorm pages 4-5). **Microburst
  Flask** held duplicate Airtorch text → restored canon plasma text (-2 dmg/+2 pen/+10m
  Range/no Maximal/no Overheat; Plasma pistols+guns). **Toxic Shot** held Snare text →
  restored canon poison text (gains Toxic; jam → 1d5 self-damage ignoring Armour/Toughness;
  Any Solid Projectile+Flame). **Nephium Fuel Tank** → stripped the embedded "TABLE 3-7"
  markdown blob from mid-description (kept canon -10 Agility/+2 dmg flame text); confirmed
  it exists as its own entry. Corrected availability to canon across all 9 rows (Acid very
  rare, Airtorch/Microburst/Organgrinder extremely rare, Nephium very rare, Snare/Void rare,
  Toxic scarce, Tracer average) and added ", p.131" to every ItS source. Pure data edit, no
  wiring — name-keyed `ammo.mjs` effects (Snare/Airtorch/Toxic quality pushes) untouched, so
  the wiring + `ammo_wiring.test.mjs` stay green. Gate green (build OK, 154 node tests). (CLEANUP)

- [x] ENGINE-CONSUMABLE-ACTIVATE — a "use drug/consumable" action that applies a timed
  ActiveEffect (duration in rounds/minutes) for the ~11 activated combat consumables
  (Frenzon→Frenzy, Stimm, Slaught, Spur, Cold Fire, White Void, Wideawake, Attention
  Spanner) and weapon buffs (Sacred Unguents jam-immunity, Tox Dispenser). The only clean
  way to wire these; larger than a data edit. RT Core / ItS. Pure-JS test on any
  extractable duration/parse helper; E2E follow-up. (ENGINE) — done iter 50: built the
  engine + 2 pure helpers. `parseConsumableDuration(text)` parses a prose duration → dice
  formula + AE-duration mapping (rounds→`duration.rounds`, minutes→`seconds×60`,
  hours→`seconds×3600`; ignores "per dose"; null when absent). `consumableActivation(name)`
  = per-drug spec table for the 8 activated combat DRUGS (null for food/medikits/Recaf;
  strips trailing "(drug)"). CLEAN mechanical bonuses wired as AE `changes` (mode 2): White
  Void +20 WP (`characteristics.willpower.modifier`), Slaught +3 Ag/Per Bonus as
  `characteristics.{agility,perception}.modifier += 30` (bonus=floor(value/10) ⇒ +30==+3
  Bonus). Talent grants (Frenzon→Frenzy, Cold Fire→Battle Rage) flagged + on the chat card
  (item embed left narrative — AE changes can't embed). Immunities / after-effects (Stimm/
  Spur/Wideawake/Attention Spanner) ride in the effect note + chat card (NOT invented as
  AE). Foundry-coupled apply point: a "Use" header button (shown when
  `consumableActivation` matches) → `_useConsumable()` rolls the duration, builds the timed
  AE (origin=item.uuid, flags.rt.consumable), posts a chat card. NOT double-applied (no
  consumable in CODE_HANDLED; these packs are outside the talents/traits/cybernetics ratchet
  → no ratchet change). RT Core p.142-143 / ItS Ch.III. Node test
  `consumable_activate.test.mjs` (11 cases). Gate green (build OK, 166 node tests). The
  weapon-buff consumables (Sacred Unguents jam-immunity, Tox Dispenser) are weapon-targeted,
  not character-timed-effect → stay NARRATIVE-RECORD-MODS-AMMO-CONSUM. E2E follow-up below.
  (ENGINE)

- [ ] E2E-CONSUMABLE-ACTIVATE — verify on rt-smoke (Playwright): give an actor a White Void
  drug item, open its sheet, click "Use" → a timed ActiveEffect named "White Void" lands on
  the actor with `duration.seconds` set (1d10×60) and `changes` raising displayed Willpower
  by +20; a Slaught dose raises Agility/Perception Bonus by +3 each (modifier +30); a
  Frenzon dose posts a chat card naming the Frenzy-talent grant + Fear immunity and creates
  the marker effect with `1d10 minutes` duration but NO characteristic change; a non-drug
  consumable (Recaf/Medikit) shows no "Use" button; clicking Use on an UNOWNED drug (no
  actor parent) warns instead of erroring. Item sheet + AE create + duration roll + chat are
  Foundry-coupled — node gate can't exercise them. (E2E)

- [x] NARRATIVE-RECORD-MODS-AMMO-CONSUM — log every intentionally-unwired
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
  is genuinely text-only/needs-engine before recording. (NARRATIVE) — done iter 51:
  verified all of weapon-mods/ammo/consumables/tools carry ZERO effects:/conditionalBonuses:
  blocks (grep) → every recorded entry is genuinely text-only/needs-engine. Logged 7
  grouped `iter 51 |` lines to `.ralph/data-vendor-queue.md`: weapon-mod sights/mounts/
  cartridges (+Tox Dispenser left here by iter 50), ammo-type descriptor + Backpack reserve
  rows, the 7 unwired ItS ammo rounds (damage-override/armour-degrade/conditional — no clean
  apply point; the engine-resolvable Snare/Airtorch/Toxic were wired iters 46-47), De-Tox/
  Obscura/Sacred Unguents (activated, NOT among the 8 drugs wired iter 50), item-present
  skill bonuses (Medikit/etc. — +X WHILE using the item, not a standing char bonus → no
  clean AE), and the flavour/food/storage rows. Stray `Tools` drug row excluded (own
  CLEANUP-CONSUM-TOOLS-STRAY task). No pack/code/test change (these packs are outside the
  ratchet) → gate green (build OK, 166 node tests). RT Core pp.133-135/142-150 + ItS
  Ch.III/p.131. (NARRATIVE)

- [x] CLEANUP-CONSUM-TOOLS-STRAY — the `Tools` entry in `consumables.yml` has an empty
  description and `type: drug` — looks like a stray/misfiled row. Confirm against the pack
  history, then remove it or fix its data. Trivial. (CLEANUP) — done iter 52: confirmed via
  git (introduced 1d93753 "P2: add ItS Ch.III tools and consumables") that the row is the
  leaked "TABLE 5-15: TOOLS" section header parsed as an empty item, NOT an acquirable
  drug; removed the entry (and its `---` separator). Surrounding real tool rows (Almanac
  Astrae Divinitus, Arms Coffer, Auspex/Scanner) untouched. Pure data deletion — no wiring,
  outside the ratchet. Gate green (build OK, 166 node tests). (CLEANUP)

## Notes
- Wire effects into the EXISTING packs (`talents`/`traits`/`cybernetics`/…); the `.db`
  is rebuilt by `build:check`. AE convention: see `specs/06` / the talents pack.
- Engine fixes touch Foundry-coupled code (`acolyte.mjs`, `rolls/*`) the node gate
  can't fully exercise — implement + add any extractable pure-JS test + an E2E follow-up.

## Out of scope
- Inventing/rebalancing effects; the chargen wizard (shelved); DoS/combat-count changes
  beyond the flagged DoF fix; the backgrounds work (separate completed loop).
