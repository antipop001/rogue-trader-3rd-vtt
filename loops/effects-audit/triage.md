# Effect-wiring triage — AUDIT-001 (first-pass `+N` sweep)

37 talents + 10 traits from `BUGS.md` SWEEP, classified into one bucket each
(code-handled / always-on / conditional / narrative / needs-engine) per
`specs/06-effect-wiring-audit.md`. Canon: RT Core Rulebook / Into the Storm.

Code-handled confirmed by grep of `src/module/rolls/{damage-data,action-data}.mjs`
(`hasTalent(...)` / `hasTalentFuzzyWords(...)`): **Blademaster, Crushing Blow, Eye of
Vengeance, Hammer Blow, Mighty Shot, True Grit, Deathdealer, Concussive**. None of the
47 sweep entries are in that set (the sweep already excluded the false positives) — so
no double-apply risk for any entry below. The 8 names are seeded in the ratchet
`CODE_HANDLED` list.

## Talents

| Entry | Described effect | Bucket | Wiring plan / why |
|---|---|---|---|
| Ancestral Blessing | +2 melee dmg for N rounds, affects Kroot allies | narrative | Activated ritual buff over allies + duration — GM-adjudicated, not a standing bonus. |
| Binary Chatter | +10 communicate w/ servitors; +1 Crew Morale | narrative | No skill key for "communicate w/ servitors"; Crew Morale is ship-level. |
| Blood of the Stalker | extra Degree of Success on Concealment/Shadowing/Silent Move | narrative | DoS modification (not a `+N`); ritual over allies. Engine has no per-DoS hook. |
| Bloodtracker | +100 Objective Points (Endeavour) | narrative | Profit-Factor/Endeavour flavor. |
| Concealed Cavity | conceal one fist-sized item; Search −10 to find | narrative | Item concealment; no standing bonus. |
| Crack Shot | +2 damage on ranged Critical Hits | needs-engine | Crit-damage hook → **ENGINE-CRITDAMAGE**. (Also named in ENGINE-WEAPONCLASS, but it is crit-damage, not weapon-class.) |
| Crippling Strike | +4 damage on melee Critical Hits | needs-engine | Same crit-damage hook → **ENGINE-CRITDAMAGE**. |
| Decadence | +10 to resist addiction (Toughness) | conditional | `conditionalBonuses` toughness "resisting addiction" → **WIRE-COND-MISC**. |
| Dual Shot | fire two pistols, no −20 penalty | narrative | Combat-action mechanic (no flat bonus). |
| Dual Strike | two melee weapons, no −20 penalty | narrative | Combat-action mechanic (no flat bonus). |
| Electrical Succour | remove Fatigue +1/DoS | narrative | Fatigue-removal action, per-DoS. |
| Electro Graft Use | +10 Common Lore/Inquiry/Tech-Use whilst at data port | conditional | `conditionalBonuses` (commonLore/inquiry/techUse) "connected to a data port" → **WIRE-COND-MISC**. |
| Exceptional Leader | grant one ally +10 to a Test, 1/round | narrative | Bonus targets another actor (free action) — player/GM applied. |
| Foresight | +10 to next Int Test after 10 min study | conditional | `conditionalBonuses` intelligence "after studying the problem" → **WIRE-COND-MISC**. |
| Hard Bargain | +1 Profit Factor on Endeavour | narrative | PF/Endeavour flavor. |
| Heightened Senses (×5) | +10 to Tests involving that sense | conditional | `conditionalBonuses` Awareness/Perception "using <sense>" → existing **WIRE-HEIGHTENED**. |
| Hyperactive Nymune Organ | +AgB Full Move / double Run | narrative | Movement-engine; no flat test bonus. |
| Inspire Wrath | +20 Interaction inspiring hatred/anger; doubles affected | conditional | `conditionalBonuses` charm/intimidate "inspiring hatred or anger" → **WIRE-COND-INTERACT**. |
| Into the Jaws of Hell | immune Fear/Pinning; +5 ship Morale | narrative | Immunities + ship-level morale. |
| Last Man Standing | +1 AP cover; immune Pinning by Pistol/Basic | narrative | Cover-AP + pinning immunity (no test bonus). |
| Lightning Reflexes | add twice Agility Bonus to Initiative | needs-engine | Initiative additive (×AgB) → **ENGINE-INIT-EXTRA** (depends on ENGINE-INIT field). |
| Luminen Charge | damage systems by difficulty | narrative | Attack-on-systems action. |
| Luminen Shock | 1d10+3 Energy melee attack | narrative | Attack power (item-like), not a bonus. |
| Master & Commander | allies ignore outnumbering; +10 armsmen | narrative | Affects allies / boarding actions. |
| Master Enginseer | spend Fate for auto-success | narrative | Fate-point mechanic. |
| Mimic | imitate; Scrutiny −10 to detect | narrative | Imposes a test on observers; no self bonus. |
| Paranoia | +2 Initiative | needs-engine | Initiative additive → existing **ENGINE-INIT** (BUG-002). |
| Psy Rating | +1 Psy Rating (cap 10) | narrative | Psy Rating is set directly on the sheet (`system.psy.rating`); AE would double the sheet value. Record only. |
| Renowned Warrant | +10 Interaction with those who respect the warrant | conditional | `conditionalBonuses` interaction skills "with those who respect the warrant" → **WIRE-COND-INTERACT**. |
| Warp Conduit | +1 PR when pushing; −10 Psychic Phenomena | narrative | Psychic-push mechanic (engine). |
| Whispers | +10 Inquiry (Investigation/Interview use) | conditional | `conditionalBonuses` inquiry "Investigation or Interview use" → **WIRE-COND-INTERACT**. |

## Traits

| Entry | Described effect | Bucket | Wiring plan / why |
|---|---|---|---|
| 'Ard | grants Unnatural Toughness ×2, Sturdy, Iron Jaw, True Grit; +20 Medicae treating Orks | narrative | Meta-grant of other traits/talents (needs item-grant machinery); +20 Medicae is for the healer, not self. |
| Dynastic Warrant | +3 Ship Points (no PF exchange) | narrative | Ship-Points already applied by sibling `ship_points` effect (CLAUDE.md). |
| Fieldcraft | +10 Concealment/Shadowing/Silent Move (always) | always-on | AE +10 on concealment/shadowing/silentMove skill modifiers → **WIRE-FIELDCRAFT**. ("treat forests as open terrain" = narrative). |
| Incorporeal | +30 Concealment hiding inside; immune to normal weapons | narrative | Core effect is immunity/pass-through; +30 is highly situational ("hiding inside something"). |
| Instinctual Understanding | Scrutiny Test to learn target stats | narrative | Information-gathering action. |
| Mechanicus Implants | grants implant systems; Respirator +20 resist toxins | narrative | Enabler/grant; the +20 belongs to the Respirator Unit item, not the trait. |
| Mob Rule | +10 WP per nearby Ork vs Fear/Pinning | narrative | Positional, dynamic scaling — engine can't express; resist-only. |
| Multiple Arms | +10 Toughness; +10 Str on movement (Climb/Swim); 2 attacks | always-on | AE +10 toughness characteristic → **WIRE-MULTIPLEARMS** (Str-on-movement = conditional note; 2 attacks = Multiple Attack action, narrative). |
| Sturdy | +20 to resist grappling and Takedown | conditional | `conditionalBonuses` strength "resisting grapple or Takedown" → **WIRE-COND-MISC**. |
| Wary | +1 Initiative | needs-engine | Initiative additive → **ENGINE-INIT-EXTRA** (depends on ENGINE-INIT field). |

## Bucket roll-up

- **code-handled** (record only): none among the 47 (sweep pre-excluded the 8).
- **always-on → AE**: Fieldcraft, Multiple Arms (Toughness). → WIRE-FIELDCRAFT, WIRE-MULTIPLEARMS.
- **conditional → conditionalBonuses**: Heightened Senses ×5 (WIRE-HEIGHTENED), Renowned Warrant, Whispers, Inspire Wrath (WIRE-COND-INTERACT), Decadence, Electro Graft Use, Foresight, Sturdy (WIRE-COND-MISC).
- **needs-engine**: Paranoia (ENGINE-INIT), Wary + Lightning Reflexes (ENGINE-INIT-EXTRA), Crack Shot + Crippling Strike (ENGINE-CRITDAMAGE), Weapon Master + Crack Shot weapon-class part (ENGINE-WEAPONCLASS).
- **narrative (record-only, intentionally unwired)**: Ancestral Blessing, Binary Chatter, Blood of the Stalker, Bloodtracker, Concealed Cavity, Dual Shot, Dual Strike, Electrical Succour, Exceptional Leader, Hard Bargain, Hyperactive Nymune Organ, Into the Jaws of Hell, Last Man Standing, Luminen Charge, Luminen Shock, Master & Commander, Master Enginseer, Mimic, Psy Rating, Warp Conduit; traits 'Ard, Dynastic Warrant, Incorporeal, Instinctual Understanding, Mechanicus Implants, Mob Rule. → NARRATIVE-RECORD.

---

# AUDIT-002 — non-`+N` mechanical phrasings sweep (`talents` + `traits`)

Second-pass sweep for NON-`+N` mechanical text ("doubles/halves/twice/+Xd10/additional
Reaction/extra attack/ignores armour/re-roll/Unnatural/counts as/immune/per-DoS"),
excluding the AUDIT-001 `+N` entries. Canon: RT Core / Into the Storm.

**Headline:** non-`+N` effects almost never map to a clean AE / conditionalBonus —
they are overwhelmingly **narrative** (intentionally unwired) or **needs-engine** (the
apply point — extra Reaction/attack count, Unnatural multiplier, Wound additive,
reload-time, trait/talent grant, natural-weapon damage override — does not exist yet).
Code-handled set re-confirmed unchanged (no double-apply risk introduced).

## Buckets

- **code-handled** (confirm only): Blademaster, Crushing Blow, Mighty Shot, True Grit,
  Weapon Master — already applied by name in `rolls/*`. (`Weapon Master` weapon-class
  +10/+2 wired iter 4 in `roll-helpers.mjs`.)

- **needs-engine** (no apply point — queued as ENGINE-* tasks in `fix_plan.md`):
  - *Extra Reaction / extra attack count*: Step Aside (+1 Dodge/round), Wall of Steel
    (+1 Parry/round), Counter Attack, Furious Assault, WAAAGH! → ENGINE-EXTRA-DEFENCE.
  - *Multi-attack talents*: Swift Attack (2 melee), Lightning Attack (3 melee) — RT
    lists as Talents; currently `legacy` actions (0.7.22) → ENGINE-ATTACK-TALENTS.
  - *Unnatural multiplier / doubling*: Unnatural Characteristic, Unnatural Toughness
    (x2), Unnatural Speed, Quadruped (×AgB move), Daemonic (×2 TB vs damage), Bastion
    of Iron Will (×2 defensive PR) → ENGINE-UNNATURAL. (`system.characteristics.<k>.
    unnatural` exists on the sheet — traits should SET it; multiplier paths partial.)
  - *Wound additive*: Sound Constitution (+1 Wound, stackable), Eaters of the Dead
    (bonus Wounds) → ENGINE-WOUNDS-MOD (needs `system.wounds.modifier`, cf. BUG-002's
    `initiative.modifier`).
  - *Reload time*: Rapid Reload (halve reload) → ENGINE-RAPID-RELOAD.
  - *Trait/talent grant*: Explorator Implants (→ Mechanicus Implants), The Flesh is
    Weak / Physical Perfection (→ Machine), Sixth Sense (→ Psyniscience skill + Rival),
    'Ard (meta-grant) → ENGINE-TRAIT-GRANTS (needs item-grant machinery).
  - *Natural-weapon / unarmed damage override*: Natural Weapons, Improved Natural
    Weapons, Unarmed Master, Unarmed Warrior → ENGINE-NATWEAPONS.
  - *Damage conditional on charge*: Brutal Charge (+3 dmg charging) — `conditionalBonuses`
    only key skills/characteristics, not damage rolls → folded into ENGINE-EXTRA-DEFENCE
    notes / damage path. Recorded, not a clean WIRE.
  - *Greenskin Hybrid +10 Toughness "after calculating Wounds"*: an AE on toughness
    modifier would feed back into the Wounds compute (over-grant) — needs a
    Wounds-neutral characteristic bump → ENGINE-UNNATURAL notes / narrative.

- **partially wired** (an AE/conditionalBonus already exists for one effect; an in-scope
  effect remains unwired — flagged for AUDIT-CRITIC, NOT re-wired): Infused Knowledge
  ("treat Lore as untrained Basic" unwired), Master Chirurgeon ("heal 2 on Crit/Heavy",
  "+20 limb-loss" unwired), Worky Gubbinz ("Ork weapons Reliable" unwired), Soul-Bound
  to the Emperor ("extra d10 discard one" on Perils unwired), Machine trait (immunities
  unwired; AP handled in `_computeArmour`), Frontier World Xenos Interaction ("immune to
  Fear (1)/(2)" unwired), Kindred: Bold Hunter (+5 BS is a `+N`, prior pass).

- **narrative (record-only, intentionally unwired)** → NARRATIVE-RECORD-2:
  - Talents: Blessed Radiance, Bulging Biceps, Da Nekst Best Fing, Dark Soul, Ded 'Ard,
    Ded Sneaky, Die Hard, Duty Unto Death, Favoured by the Warp, Fearless, Give it Sum
    Dakka!, Greed is Good, Hardy, Improved Warp Sense, Iron Jaw, Jaded, Kroot Leap,
    Legendary, Light Sleeper, Lissen Ta Me Cos I'z Da Biggest, Master Orator, Mercenary,
    More fer Me!, Nerves of Steel, Polyglot, Prophetic Dreams, Prosanguine, Rapid
    Reaction, Rite of Fear, Rite of Awe, Rite of Pure Thought, Rite of Sanctioning,
    Sharpshooter, Sprint, Strong Minded, Survival Master, Takedown, Unshakeable Faith,
    Warp Affinity, Watchful For Betrayal, See Without Eyes, Mastery of Space, Mastery of
    Gunnery, Mastery of Augurs, Mastery of Small Craft, Blind Fighting.
  - Traits: Auto-Stabilised, Blind, Dark Sight, Fear, From Beyond, Phase, Regeneration,
    Soul-Bound, Strange Physiology, The Stuff of Nightmares, Toxic, Unnatural Senses,
    Warp Instability, Warp Weapon, Kroot Physiology, Da Boyz, No Corruption, Madboyz,
    Medicae (Ork), Kindred: Headhunter, Kindred: Stalker.
