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

---

# AUDIT-003 — `cybernetics` pack (34 entries)

Triage of all 34 `cybernetic` docs in `src/packs/cybernetics/cybernetics.yml` for
described mechanical bonuses with NO `effects`/`conditionalBonuses` wiring. Canon:
RT Core Rulebook (Bionic Replacements, pp.131-135) / Into the Storm. Three entries are
already engine-wired for armour via `hasArmourPoints` (Bionic Heart body +1, Cranial
Armour head +1, Subskin Armour arms/body/legs +2 — `_computeArmour`); only their
NON-armour effects are triaged below. No cybernetic name is in `CODE_HANDLED` → zero
double-apply risk.

**Craftsmanship caveat:** the schema carries a single `craftsmanship: common` field.
Most multi-version implants describe Poor/Good/Best *deltas* on top of the Common
baseline. An always-on item AE applies regardless of craftsmanship, so it is only
correct for bonuses the **Common (baseline) version already grants unconditionally** —
craftsmanship-gated deltas (Good arm +10, Best Unnatural ×2, etc.) have no clean apply
point and stay narrative / needs-engine. Item AEs transfer to the actor like the
talents pack (implant = permanently installed); not gated on `equipped`.

## Entries

| Entry | Described effect (Common baseline) | Bucket | Wiring plan / why |
|---|---|---|---|
| Calculus Logi Upgrade | +10 Literacy, Logic, Scholastic Lore (unconditional) | always-on | AE +10 on `skills.{literacy,logic,scholasticLore}.modifier` → **WIRE-CYBER-AE**. |
| Optical Mechadendrite | +10 all Perception Tests (unconditional); +20 vision Per at night | always-on + conditional | AE +10 `characteristics.perception.modifier` → **WIRE-CYBER-AE**; night +20 → conditionalBonus "vision-based at night" → **WIRE-CYBER-COND**. |
| Medicae Mechadendrite | +10 Medicae; +10 Interrogation (unconditional) | always-on | AE +10 on `skills.{medicae,interrogation}.modifier` → **WIRE-CYBER-AE**. (chainscalpel/staplers = narrative.) |
| Scribe-Tines | +10 all "Investigation" Tests | always-on | No `investigation` skill key — RT maps to `inquiry` (confirm vs scrutiny). AE +10 `skills.inquiry.modifier` → **WIRE-CYBER-AE** (note the key remap). |
| Utility Mechadendrite | counts as combitool: +10 all Tech-Use (unconditional) | always-on | AE +10 `skills.techUse.modifier` → **WIRE-CYBER-AE**. (censer −5 WS to enemies / blade = narrative.) |
| Bionic Respiratory System | +20 Toughness vs airborne toxins/gas (Common) | conditional | conditionalBonus toughness "resisting airborne toxins/gas" → **WIRE-CYBER-COND**. |
| Manipulator Mechadendrite | +20 Strength when using the arm | conditional | conditionalBonus strength "using the manipulator mechadendrite" → **WIRE-CYBER-COND**. (1d5+2 club = narrative.) |
| Mind Impulse Unit (MIU) | +10 Tech-Use/Pilot/Drive when interfaced w/ MIU systems | conditional | conditionalBonus techUse/pilot/drive "interfaced with MIU systems" → **WIRE-CYBER-COND**. |
| Augmented Senses | grants Heightened Senses (one chosen sense) | needs-engine | Talent grant (pickable sense) → extends **ENGINE-TRAIT-GRANTS**. (Alt: mirror the Heightened Senses conditionalBonus + `pickable` on the item.) |
| Bionic Heart | grants Sprint Talent (armour +1 already wired) | needs-engine | Talent grant → **ENGINE-TRAIT-GRANTS**. |
| Memorance Implant | grants Total Recall Talent; +10 Trade(Remembrancer)/social-leverage | needs-engine + narrative | Talent grant → **ENGINE-TRAIT-GRANTS**; the +10 is a specialist-Trade + GM-leverage situational → narrative. |
| Vitae Supplacement | grants Autosanguine Talent; GM 50% no-death | needs-engine | Talent grant → **ENGINE-TRAIT-GRANTS** (50% = GM-adjudicated narrative). |
| Blackbone Bracing | grants Bulging Biceps + Iron Jaw Talents; +2 unarmed dmg | needs-engine | Talent grants → **ENGINE-TRAIT-GRANTS**; +2 unarmed dmg → unarmed-damage path → **ENGINE-NATWEAPONS**. |
| Synthetic Muscle Grafts | +1 Strength Bonus (Common); Best → Unnatural Strength ×2, −10 Ag | needs-engine | SB-only bump (no `.bonus` modifier field; AE on `strength.modifier` +10 would over-apply to all Str Tests) + craftsmanship-gated Unnatural → **ENGINE-UNNATURAL**. |
| Cortex Implants | Good → Unnatural Intelligence ×2 (craftsmanship-gated; +Insanity) | needs-engine | Craftsmanship-gated Unnatural multiplier → **ENGINE-UNNATURAL** (Common/Poor = stat loss/servitor, narrative). |
| Cybernetic Senses | Good → Heightened Senses + Dark Sight + +20 resist sense-attack | narrative | All benefits craftsmanship-gated (Good); Common has "no further game effects". Record only. |
| Bionic Arm | Good → +10 delicate-Ag/+10 Str-with-arm; Poor → penalties | narrative | Craftsmanship-gated; Common version grants no bonus. Record only. |
| Bionic Locomotion | Good → Sprint Talent + +20 jump/leap; Poor → penalties | narrative | Craftsmanship-gated; Common grants no bonus. Record only. |
| Auger Arrays | Good → auspex + reroll Per Tests using it; Common = auspex | narrative | Craftsmanship-gated reroll; auspex is equipment. Record only. |
| Baleful Eye | hellpistol-in-eye weapon | narrative | Weapon (item-like). |
| Ballistic Mechadendrite | shoulder laspistol, 1 shot/round Reaction or Half Action | narrative | Weapon + action machinery. |
| Miu Weapon Interface | fire one extra ranged weapon as a Free Action | narrative | Extra-attack action machinery (no flat bonus). |
| Internal Blade | monoknife weapon; Good Toxic / Best +2 dmg/+2 Pen/Power Field | narrative | Weapon (item-like). |
| Internal Power Cell | acts as lasgun/hellgun ammo charge pack | narrative | Equipment/resource. |
| Locator Matrix | magnetic-north/location/velocity awareness | narrative | Information utility (no test bonus). |
| Respiratory Filter Implant | ignore inhaled toxic gases/contaminants | narrative | Immunity (no test bonus). |
| Gastral Bionics | ignore ingested toxins/poisons | narrative | Immunity (no test bonus). |
| Pain Ward | ignore Stun + pain penalties from crit/fire/drowning | narrative | Immunity to penalties (no standing bonus). |
| Voidskin | resist void exposure +1d10+3 extra rounds | narrative | Duration extension (no test bonus). |
| Volitor Implant | compulsion-control conditioning | narrative | GM/roleplay control (no game effect). |
| Vox Implant | subvocalised micro-bead comms | narrative | Comms utility. |
| Implant Systems | section header (Mechadendrite cap = TB) | narrative | Not an acquirable item; mounting-limit flavor. |

## Bucket roll-up

- **always-on → AE** (→ **WIRE-CYBER-AE**, 5 names): Calculus Logi Upgrade, Optical
  Mechadendrite, Medicae Mechadendrite, Scribe-Tines, Utility Mechadendrite.
- **conditional → conditionalBonuses** (→ **WIRE-CYBER-COND**, 4 entries): Bionic
  Respiratory System, Manipulator Mechadendrite, Optical Mechadendrite (night),
  Mind Impulse Unit.
- **needs-engine** (extend existing ENGINE-* tasks, no new apply point): talent grants
  Augmented Senses / Bionic Heart / Memorance Implant / Vitae Supplacement / Blackbone
  Bracing → **ENGINE-TRAIT-GRANTS**; +1 SB & Unnatural ×2 (Synthetic Muscle Grafts,
  Cortex Implants) → **ENGINE-UNNATURAL**; Blackbone Bracing +2 unarmed dmg →
  **ENGINE-NATWEAPONS**.
- **narrative (record-only)** → **NARRATIVE-RECORD-CYBER**: Cybernetic Senses, Bionic
  Arm, Bionic Locomotion, Auger Arrays, Baleful Eye, Ballistic Mechadendrite, Miu Weapon
  Interface, Internal Blade, Internal Power Cell, Locator Matrix, Respiratory Filter
  Implant, Gastral Bionics, Pain Ward, Voidskin, Volitor Implant, Vox Implant, Implant
  Systems, Memorance Implant (the +10 leverage part), Cortex Implants (Common/Poor part).

---

# Effect-wiring triage — AUDIT-004 (`weapon-mods` / `ammo` / `consumables`)

All entries in the three packs classified per `specs/06`. Unlike talents/traits/
cybernetics, these item types modify a **weapon** or an **attack** (or are an
**activated/timed consumable**) — they almost never grant a standing CHARACTER bonus,
so **zero entries are cleanly always-on-AE-able**. The applicable buckets here are
**structured-already** (engine already consumes a name/flag), **needs-engine**, and
**narrative**. Apply path: `roll-data.mjs:116` selects `actionItem.items.find(i =>
i.isAmmunition)` and feeds it through `rules/ammo.mjs`; weapon mods go through
`rules/weapon-modifiers.mjs`. Both match by `name` string in a switch.

**Key discovery — already-written ammo wiring is silently inert (verified by grep):**
- `ammo.mjs` switch keys `'Explosive Arrows/Quarrels'` (slash) but the YAML name is
  `'Explosive Arrows and Quarrels'` → no match → effect never applies.
- `ammo.mjs` keys `'Hot-Shot Charge Packs'` (plural) but YAML is `'Hot-Shot Charge
  Pack'` (singular) → inert.
- `ammo.mjs` keys `'Tox Rounds'` but YAML is `'Toxic Shot'` → Toxic quality never added.
- 6 ammo-like rows (Explosive Arrows and Quarrels, Hot-Shot Charge Pack, Amputator
  Shells, Bleeder Rounds, Dumdum Bullets, Expander Rounds) live in `weapon-mods.yml`
  as `type: weaponModification`, but the ammo apply path only runs on `isAmmunition`
  items — so even with a name fix they route through `weapon-modifiers.mjs`, which has
  NO switch case for them. Type-vs-apply-path mismatch → also inert.
→ Folded into **WIRE-AMMO-NAME-SYNC** (a bug fix, no new engine).

Engine-handled special-quality flags (grep `damage-data.mjs`/`action-data.mjs`; do NOT
re-wire): Tearing, Proven, Primitive, Lance, "Razer Sharp" (sic), Concussive, Corrosive,
Crippling, Felling, Flame, Hammer Blow, Hallucinogenic, Haywire, Scatter, Scattershot,
Shocking, Snare, Toxic, Sanctified, Accurate, Maximal, Overcharge, Overload, Melta,
Vengeful, Destructive, Storm, Twin-Linked, Spray, Reliable, Unreliable, Overheats,
Indirect, Defensive, Inaccurate. → ammo whose only job is to ADD one of these just needs
its name pushed into the `ammo.mjs` switch (the damage engine already resolves it).

## weapon-mods (`type: weaponModification`)

| Entry | Described effect | Bucket | Wiring plan / why |
|---|---|---|---|
| Mono | drops Primitive, +2 Pen | structured-already | Engine-handled (name matches). Wired. |
| Motion Predictor | +10 BS semi/full auto | structured-already | Engine-handled. Wired. |
| Red-Dot Laser Sight | +10 BS single shot | structured-already | Engine-handled. Wired. |
| Compact | ½ wt/clip/range, −1 dmg, −20 conceal | structured-already (partial) | Engine handles pen −1; the dmg/range/conceal deltas unwired → narrative remainder. |
| Amputator/Dumdum/Expander Shells | +2 / +2&AP-double / +1&+1Pen | structured-already (BROKEN) | Effect in `ammo.mjs` but rows are `type: weaponModification` → wrong apply path → **WIRE-AMMO-NAME-SYNC**. |
| Bleeder Rounds | +3 dmg vs biological | needs-engine (BROKEN) | Effect-note only; +3-vs-biological never applied; wrong type → **WIRE-AMMO-NAME-SYNC** + trait-gate stays narrative. |
| Explosive Arrows and Quarrels | −10, Explosive, drops Primitive | structured-already (BROKEN) | name/type mismatch → inert → **WIRE-AMMO-NAME-SYNC**. |
| Hot-Shot Charge Pack | +1 dmg, 2d10 pick-high, Pen 4, loses Reliable, clip 1 | structured-already (BROKEN) | plural/type mismatch → inert → **WIRE-AMMO-NAME-SYNC**. |
| Fire Selector / Forearm Mounting / Melee Attachment / Omni-Scope / Overcharge Pack / Photo Sight / Preysense Sight / Silencer / Suspensors / Telescopic Sight / Vox-Operated | sights/mounts/clip mechanics | narrative / needs-engine | No lighting/range-band/multi-clip engine for mods. Record. |
| Calamity Vents / Exterminator Cartridge / Tox Dispenser | overheat-purge / combi-flamer / activated Toxic | needs-engine | No overheat-vent/combi/activated-quality engine. Record. |
| Arrows-Quarrels / Shot / Backpack Ammo Pack / Bullets / Shells / Charge Pack / Fuel / Bolt Shells / Melta Canister / Plasma Flask / Exotic / Unusual Ammo (header) | ammo-type descriptors / reserve ammo | narrative | Descriptors, no mechanical delta (Backpack reserve = no engine). Record. |

## ammo (`type: ammunition`)

| Entry | Described effect | Bucket | Wiring plan / why |
|---|---|---|---|
| Inferno Shells | Agility test or catch fire | structured-already | Pushes `Flame`; engine handles. Wired. |
| Man-Stopper Bullets | Pen → 3 | structured-already | Pen set; engine handles (name matches). Wired. |
| Toxic Shot | gains Toxic; 1d5 self-dmg on jam | structured-already (BROKEN) | `ammo.mjs` keys `'Tox Rounds'` not `'Toxic Shot'` → inert → **WIRE-AMMO-NAME-SYNC**. |
| Snare Shells | −2 dmg, gains Snare | needs-engine (easy) | `Snare` IS engine-handled; just push the quality → **WIRE-AMMO-ADD-QUALITY**. |
| Airtorch Canister | gains Scatter + Overheating, ½ range | needs-engine (easy) | `Scatter`/`Overheats` engine-handled; push qualities → **WIRE-AMMO-ADD-QUALITY** (range-halve stays narrative). |
| Tempest Bolt Shells / Acid Shells / Microburst Flask / Nephium Fuel Tank / Organgrinder Rounds / Tracer Shells / Void Rounds | type change / dmg override / armour-degrade / per-DoF cascade / conditional BS / environment-conditional | narrative / needs-engine | Damage-override, armour-degrade, conditional/environmental, per-DoF — no clean apply point. Record. |

## consumables (`type: drug`)

| Entry | Described effect | Bucket | Wiring plan / why |
|---|---|---|---|
| Frenzon / Stimm / Slaught / Spur / Cold Fire / White Void / Wideawake / Attention Spanner | timed combat buffs (Frenzy/Battle Rage talent, +stat for N rounds, ignore Fatigue/Stun) | needs-engine | No drug-activation/duration engine → **ENGINE-CONSUMABLE-ACTIVATE**. Record. |
| De-Tox / Obscura / Sacred Unguents | activated cleanse / hallucinogen / weapon jam-immunity | needs-engine | Activated, no duration engine. Record. |
| Medikit / Medikit (Advanced) / Almanac Astrae Divinitus / Auspex-Scanner / Auto Quill | +20/+10 skill WHILE using the item | conditional (item-present) | Item-present bonus, not a character standing bonus → leave narrative (no AE/cond cleanly). Record. |
| Amasec / Lho-Sticks / High Provender / Ration Packs / Recaf / Theosophist's Philtre / Tranq / Blush / Ploin Juice / Raenka / Injector / Arms Coffer | flavour / food / delivery / storage | narrative | No game effect. Record. |
| Tools | empty description, `type: drug` | narrative (cleanup) | Stray/misfiled row → **CLEANUP-CONSUM-TOOLS-STRAY**. |

## Bucket roll-up

- **structured-already (wired, name matches — leave alone):** Mono, Motion Predictor,
  Red-Dot Laser Sight, Compact (pen), Inferno Shells, Man-Stopper Bullets.
- **structured-already but BROKEN (intended-wired, inert) → WIRE-AMMO-NAME-SYNC:**
  Explosive Arrows and Quarrels, Hot-Shot Charge Pack, Toxic Shot, Amputator Shells,
  Dumdum Bullets, Expander Rounds, Bleeder Rounds (the +3 stays partial).
- **easy add-quality → WIRE-AMMO-ADD-QUALITY:** Snare Shells (Snare), Airtorch Canister
  (Scatter/Overheats).
- **always-on AE:** none (no standing character bonuses in these packs).
- **needs-engine (record + future ENGINE):** all activated/timed consumables →
  **ENGINE-CONSUMABLE-ACTIVATE**; unwired ItS ammo (Tempest Bolt/Acid/Microburst/
  Nephium/Organgrinder/Tracer/Void); weapon-mod sights/mounts/cartridges.
- **narrative (record-only) → NARRATIVE-RECORD-MODS-AMMO-CONSUM:** everything else
  (descriptors, flavour, item-present skill bonuses, immunities).
- **cleanup → CLEANUP-CONSUM-TOOLS-STRAY:** the empty `Tools` drug row.

## AUDIT-CRITIC completeness pass (iter 48)

Scanned `talents` + `traits` + `cybernetics` (387 docs) for mechanical phrasing,
cross-referenced against all four ratchet lists (WIRED_EXPECTED / CODE_HANDLED /
GRANTS_EXPECTED / NARRATIVE — 159 unique tracked names).

- **Unresolved (mechanical text, no wiring, not in any ratchet list): 0.** Every
  mechanically-phrased entry across the three packs is now either wired
  (ActiveEffect / conditionalBonus / `flags.rt.grants`) or recorded as
  intentionally text-only (NARRATIVE) / engine-applied-by-name (CODE_HANDLED).
- **Double-apply guard: clean.** All 28 CODE_HANDLED names are referenced by name in
  `src/module/rolls/` + `documents/` + `roll-helpers.mjs`; the ratchet's
  "no code-handled talent was given an AE/conditionalBonus" test passes — none is
  double-applied.
- **58 wired-but-untracked entries** (pre-existing wiring from the 0.7.6 talent-mechanics
  overhaul + the backgrounds loop — NOT gaps this loop introduced or was scoped to fix).
  They carry valid wiring (the soft "all pack effects/conditionalBonuses well-formed"
  test validates SHAPE — 0 warnings) but are not under WIRED_EXPECTED/GRANTS_EXPECTED
  backpressure. → follow-up **RATCHET-HARDEN-PREEXISTING** appended to `fix_plan.md`.

Net: the effect-wiring audit's discovery goal is met — no described-but-unapplied
mechanical effect remains untriaged in the three audited packs.
