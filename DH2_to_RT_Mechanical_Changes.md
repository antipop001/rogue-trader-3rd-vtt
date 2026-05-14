# Dark Heresy 2nd Edition → Rogue Trader: Mechanical Changes for VTT Adaptation

A reference for porting a Virtual Tabletop module/system from **Dark Heresy (2nd Edition)** to **Rogue Trader**. Both games use the same d100 percentile core engine, so the foundation is portable. This document focuses on what must be **added, replaced, or re-wired** when migrating from DH2 to RT.

> **Bottom line for a VTT porter:** ~70% of character-sheet math (characteristics-as-percentile, skill tests, combat actions, wounds, damage, criticals, insanity, corruption, psychic Fettered/Unfettered/Push framework) is mechanically identical or near-identical. The big lifts are:
> 1. **Character creation flow** — DH2's 5-stage Home World + Background + Role replaces with RT's Origin Path
> 2. **Aptitudes (DH2) have no RT equivalent** — drop them, use RT career advance trees instead
> 3. **Skills list** — DH2 consolidated several skills (Stealth, Athletics, Operate, Navigate, Linguistics); RT re-expands them
> 4. **Economy model** — DH2's per-character **Influence** + Requisition Tests vs. RT's group-wide **Profit Factor** + Acquisition Tests
> 5. **Tenth characteristic Influence** (DH2) — collapses to group Profit Factor in RT
> 6. **New RT systems**: Starships, Endeavours, Renown / Profit Factor advancement
> 7. **Career list** is entirely replaced (Roles + Backgrounds → RT Careers)
> 8. **DH2 Vehicle rules** map cleanly to RT but the **Starship rules are wholly new**
> 9. **Subtlety** (DH2 warband narrative resource) has no formal RT equivalent

> **Compared to DH1→RT, this is in many ways an easier port:** the psychic system is now nearly identical (no more Threshold/Power-Roll conversion), the skill core is closer, and Tier-based talents already match.

---

## 1. Core Mechanic (Unchanged)

Both games use the identical core resolution mechanic:

- Roll **1d100** against a Skill or Characteristic
- Roll ≤ target = success; roll > target = failure
- **Degrees of Success/Failure** measured in full 10-point increments
- Test difficulty modifiers from +60 (Trivial) down to −60 (Hellish), in 10-point steps
- Opposed Tests, Extended Tests, Assistance rules — all identical

**VTT impact:** Skill/Characteristic roll automation, difficulty modifiers, opposed-roll macros — **no changes needed**.

---

## 2. Characteristics — DH2 has 10, RT has 9

This is a new wrinkle vs. DH1. DH2 introduces **Influence (Ifl)** as a 10th characteristic representing reputation, contacts, and standing in the Imperium.

| Characteristic | Abbreviation | Present in DH2 | Present in RT |
|---|---|---|---|
| Weapon Skill | WS | ✔ | ✔ |
| Ballistic Skill | BS | ✔ | ✔ |
| Strength | S | ✔ | ✔ |
| Toughness | T | ✔ | ✔ |
| Agility | Ag | ✔ | ✔ |
| Intelligence | Int | ✔ | ✔ |
| Perception | Per | ✔ | ✔ |
| Willpower | WP | ✔ | ✔ |
| Fellowship | Fel | ✔ | ✔ |
| **Influence** | **Ifl** | **✔ (per-character)** | **✘** (use **Profit Factor**, group-wide) |

DH2 generation: **2d10 + 20** per characteristic (not just 2d10 as in DH1). The "+ characteristic" / "− characteristic" modifiers from Home World cause the player to roll **3d10 and keep highest/lowest 2**. One re-roll allowed.

Characteristic Bonus = tens digit in both games.

### Influence has special rules in DH2
- It **cannot be advanced with XP** — only by GM award (gameplay actions: completing investigations, claiming intimidating relics, drawing patron attention, etc.).
- Each character has their **own Influence**; it is *not* shared across the warband (unlike Profit Factor in RT).
- It is rolled against for **Requisition tests** (acquire items), social manipulation, and investigation favours.
- Acolytes can pool Influence to call upon Reinforcement Characters (NPC allies for one session) — see §16.

**VTT impact:**
- **Add an Influence field** on the DH2 character sheet (per-character).
- When porting to RT, **remove the per-character Influence** field, **replace with a single group-wide Profit Factor**. Most characters' Influence values must be collapsed into one PF (designer's choice: average them, take the highest, or set a flat starting value).
- Disable XP advancement of Influence in DH2 build; in RT, PF is changed by GM award/Endeavours/Misfortunes only.
- The Requisition Test macro (vs. Influence) becomes the Acquisition Test macro (vs. PF) — see §10.

---

## 3. Character Creation Flow (Major Rewire)

### DH2 Creation Stages (5 stages)
1. **Choose Home World** (Feral, Forge, Hive, Shrine, Highborn, Voidborn) — determines characteristic modifiers, Fate threshold, Wounds formula, Home World aptitude, Home World bonus.
2. **Choose Background** (Adeptus Administratum, Adeptus Arbites, Adeptus Astra Telepathica, Adeptus Mechanicus, Adeptus Ministorum, Imperial Guard, Outcast) — determines starting skills, talents, equipment, Background aptitude, and Background bonus.
3. **Choose Role** (Assassin, Chirurgeon, Desperado, Hierophant, Mystic, Sage, Seeker, Warrior) — determines two more aptitudes plus a Role bonus and recommended advances.
4. **Spend XP and Equip** — **1,000 starting xp**. Aptitudes from stages 1–3 govern advance costs. Then equipment via Influence (a number of acquisitions up to starting Influence Bonus, each of Scarce availability or better).
5. **Give Character Life** — name, appearance, history, divination, ties to Inquisitor.

Each Acolyte ends Stage 3 with **8 aptitudes** total: General (everyone), 1 from Home World, 1 from Background, 2 from Role, plus the characteristic-based aptitudes (WS/BS/S/T/Ag/Int/Per/WP/Fel — Influence has none).

### Rogue Trader Creation Stages
1. Generate Characteristics
2. **Origin Path** (Home World → Birthright → Lure of the Void → Trials and Travails → Motivation → Career — a multi-step chain)
3. Spend Experience Points (**5,000 xp total**, of which **500 xp** is unspent/discretionary; the first 4,500 represent baked-in starting Skills/Talents/Characteristics from Origin Path)
4. Giving Characters Life
5. **Profit Factor and Ship Points** (group-level)
6. Select Equipment (one Acquisition each at +0 modifier)
7. Play

### Starting power level comparison
- DH2 character: 1,000 xp + Home World/Background/Role bundle ≈ a competent specialist.
- RT character: ~5,000 xp baked in ≈ noticeably more capable at session zero. A starting RT character is roughly equivalent to a DH2 Acolyte who has played for 2–4 sessions.

### VTT impact
- DH2 builder needs a **5-stage cascade** (HW → BG → Role → XP/equip → flavour) with each stage applying:
  - characteristic modifiers (HW)
  - starting skills/talents/equipment (BG)
  - aptitudes (HW + BG + Role)
  - starting Influence, Fate threshold (HW)
  - Wounds formula (HW)
- Migrating that builder to RT means:
  - replace the 3-axis HW+BG+Role picker with the multi-step Origin Path wizard
  - increase starting XP from 1,000 → 4,500 (+500 discretionary)
  - **drop the aptitude system entirely** (replaced by RT's per-career advance tables)
  - replace per-character Influence with group Profit Factor + Ship Points

---

## 4. Wounds and Fate Threshold

### Wounds
Both games use:

```
Starting Wounds = (2 × Toughness Bonus) + 1dX (X varies by Home World/Origin)
```

But in DH2 starting Wounds are set by a fixed value per Home World (e.g., Feral 9+1d5, Forge 8+1d5, Hive 8+1d5, Shrine 7+1d5, Highborn 7+1d5, Voidborn 6+1d5), while RT uses `2×TB + 1d5(+modifier)`. The output ranges are comparable.

**Damage math is identical**: damage ≤ Wounds = normal damage, damage > Wounds = Critical Damage, consult Critical chart by location + damage type. Same hit location table (`01–10 Head, 11–20 RArm, 21–30 LArm, 31–70 Body, 71–85 RLeg, 86–100 LLeg`). Same five damage types (Energy, Explosive, Impact, Rending — plus DH2 includes a Critical Damage table per type per location, identical in scale to RT's).

### Fate Threshold
**DH2 uses "Fate Threshold"** (the new name; functionally identical to RT's "Fate Points" stat):

- Each Home World sets a base Fate Threshold (typically 2–4)
- Players roll 1d10 for "Emperor's Blessing"; on a roll ≥ the HW's blessing value, add +1 to threshold (some HW's bless on 6+, others 8+, etc.)
- At the start of each session, Acolyte's current Fate Points are refilled to threshold
- Fate points can never exceed the threshold

**Uses of Fate (identical in DH2 and RT):**
- Re-roll a test
- +10 bonus to a test (declared before rolling)
- Add 1 degree of success after the roll
- Count as having rolled 10 for Initiative
- Remove 1d5 damage (not Critical)
- Recover from Stun
- Remove all Fatigue
- **Burn** Fate to survive certain death (permanently −1 threshold)

**VTT impact:** Fate Point pool tracker is fully portable. Only the determination roll (Home World HW Blessing in DH2 vs. RT's home-world Fate roll table) differs at character-creation time.

---

## 5. Aptitudes (DH2 only) vs. Career Trees (RT) — Big Rewire

This is the single largest structural difference for the character-sheet engine.

### DH2 Aptitudes
Every character has **8 aptitudes**. The pool from which they're drawn:
- **General** (everyone has)
- **Characteristic-based** (9): Weapon Skill, Ballistic Skill, Strength, Toughness, Agility, Intelligence, Perception, Willpower, Fellowship — *Influence has no aptitude*
- **Conceptual** (8): Offence, Finesse, Defence, Psyker, Tech, Knowledge, Leadership, Fieldcraft, Social

Every Characteristic Advance, Skill Advance, and Talent has 1–2 linked aptitudes. The cost depends on how many of those aptitudes the character shares with the advance.

#### Characteristic Advances (5 progression levels — note this is one more than DH1's 4!)
| Matching Aptitudes | Simple | Intermediate | Trained | Proficient | Expert |
|---|---|---|---|---|---|
| Two | 100 xp | 250 xp | 500 xp | 750 xp | 1,250 xp |
| One | 250 xp | 500 xp | 750 xp | 1,000 xp | 1,500 xp |
| Zero | 500 xp | 750 xp | 1,000 xp | 1,500 xp | 2,500 xp |

Each level adds +5 permanently to the characteristic.

#### Skill Advances (4 levels: Known, Trained, Experienced, Veteran)
| Matching Aptitudes | Known (Skilled) | Trained (+10) | Experienced (+20) | Veteran (+30) |
|---|---|---|---|---|
| Two | 100 xp | 200 xp | 300 xp | 400 xp |
| One | 200 xp | 400 xp | 600 xp | 800 xp |
| Zero | 300 xp | 600 xp | 900 xp | 1,200 xp |

#### Talent Advances (3 Tiers)
| Matching Aptitudes | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Two | 200 xp | 300 xp | 400 xp |
| One | 300 xp | 450 xp | 600 xp |
| Zero | 600 xp | 900 xp | 1,200 xp |

#### Characteristic ↔ Aptitude mapping
| Characteristic | Aptitude 1 | Aptitude 2 |
|---|---|---|
| Weapon Skill | Weapon Skill | Offence |
| Ballistic Skill | Ballistic Skill | Finesse |
| Strength | Strength | Offence |
| Toughness | Toughness | Defence |
| Agility | Agility | Finesse |
| Intelligence | Intelligence | Knowledge |
| Perception | Perception | Fieldcraft |
| Willpower | Willpower | Psyker |
| Fellowship | Fellowship | Social |

### Rogue Trader Career Trees
RT has **no aptitude system**. Instead each Career (Arch-militant, Astropath Transcendent, Explorator, Missionary, Navigator, Rogue Trader, Seneschal, Void-master) has **its own advance table** for each Rank (1–8). Each entry in that table has a fixed xp cost (commonly 100, 200, 500, 1000 — varying by item) plus prerequisites. The character must spend enough xp in a Rank's pool to qualify for the next Rank.

### Porting strategy
- **Drop the aptitude system** entirely when porting DH2 → RT.
- Re-map characters to a suitable RT Career (see §14 for role/background mapping).
- Old DH2 xp totals roughly translate as: every 1,000 DH2 xp ≈ 1,000 RT xp, but RT spends them through a fixed career table rather than freely.
- Skill ranks in DH2 (Known/+10/+20/+30) map directly to RT skill ranks (Trained/+10/+20). Note RT does not have a "+30 Veteran" rank for most skills; cap the migration at +20.
- Characteristic advances in DH2 use 5 levels (Simple→Expert); RT uses 4 levels (Simple/Intermediate/Trained/Expert) per Rank. When porting, treat the DH2 "Proficient" level as RT "Trained" and "Expert" as RT "Expert", merging or rounding as needed.

**VTT impact:**
- DH2 advance picker is **aptitude-aware**: when a player tries to buy an advance, the picker must check their 8 aptitudes against the advance's listed aptitudes and price accordingly. Surface the 3-tier cost transparently.
- RT advance picker is **career+rank-locked**: the picker shows only the advances available in the current rank's table, with fixed xp costs.
- These two pickers are structurally different and likely need separate UIs. The data model for "advance" can be shared if it carries both a `aptitudes: [...]` field (used by DH2) and a `careerRankTable: {career: rank: cost}` field (used by RT).

---

## 6. Skills (DH2 simplified, RT must re-expand)

DH2 deliberately reduced and consolidated the DH1/RT skill list. The base list (every skill is now treated the same way — there is **no Basic/Advanced split** in DH2; untrained tests use half the characteristic):

### DH2 Skill List
| Skill | Char. | Aptitude 1 | Aptitude 2 | Notes |
|---|---|---|---|---|
| Acrobatics | Ag | Agility | General | |
| Athletics | S | Strength | General | **consolidates Climb + Swim** |
| Awareness | Per | Perception | Fieldcraft | |
| Charm | Fel | Fellowship | Social | |
| Command | Fel | Fellowship | Leadership | |
| Commerce | Int | Intelligence | Knowledge | Replaces DH1 Evaluate/Barter, gives haggle bonus on Requisition |
| Common Lore† | Int | Intelligence | Knowledge | Specialisations (Adeptus Arbites, Imperial Creed, etc.) |
| Deceive | Fel | Fellowship | Social | |
| Dodge | Ag | Agility | Defence | |
| Forbidden Lore† | Int | Intelligence | Knowledge | Specialisations |
| Inquiry | Fel | Fellowship | Social | |
| Interrogation | WP | Willpower | Social | |
| Intimidate | S | Strength | Social | |
| Linguistics† | Int | Intelligence | General | **consolidates DH1 Speak Language**; sub-specialty per language |
| Logic | Int | Intelligence | Knowledge | |
| Medicae | Int | Intelligence | Fieldcraft | |
| Navigate† | Int | Intelligence | Fieldcraft | **consolidates Navigation**; specialisations: Surface, Stellar, Warp |
| Operate† | Ag | Agility | Fieldcraft | **consolidates DH1 Pilot + Drive**; specialisations: Aeronautica, Surface, Voidship |
| **Parry** | **WS** | **Weapon Skill** | **Defence** | **NEW IN DH2: now a skill, not just a Reaction** |
| Psyniscience | Per | Perception | Psyker | |
| Scholastic Lore† | Int | Intelligence | Knowledge | Specialisations |
| Scrutiny | Per | Perception | General | |
| Security | Int | Intelligence | Tech | |
| Sleight of Hand | Ag | Agility | Knowledge | |
| Stealth | Ag | Agility | Fieldcraft | **consolidates DH1 Concealment + Silent Move + Shadowing** |
| Survival | Per | Perception | Fieldcraft | |
| Tech-Use | Int | Intelligence | Tech | |
| Trade† | Int | Intelligence | General | Specialisations (Armourer, Cook, Merchant, Scrimshawer, etc.) |

† = specialist skill (must pick a specialty)

### Major differences from RT's skill list
- **Athletics (DH2)** = Climb + Swim from RT
- **Stealth (DH2)** = Concealment + Silent Move + Shadowing from RT
- **Operate (DH2)** = Pilot + Drive from RT, with three subtypes
- **Navigate (DH2)** = Navigation (RT) split into Surface/Stellar/Warp
- **Linguistics (DH2)** = Speak Language (RT)
- **Commerce (DH2)** ≈ Barter + Evaluate (RT)
- **Parry (DH2)** = a fully-fledged skill with mastery levels; in RT, Parry is a **Reaction only** (no skill ranks — uses WS directly)
- **Awareness (DH2)** covers Search + Awareness from RT
- DH2 removed many RT skills entirely: **Blather, Carouse, Chem-Use, Ciphers, Contortionist, Demolition, Disguise, Gamble, Invocation, Literacy, Performer, Secret Tongue, Tracking, Wrangling** — most of these collapse into Linguistics, Trade, Common Lore, Survival, or Charm in DH2.
- **No Basic vs. Advanced distinction in DH2.** Every skill works the same way: untrained tests use half characteristic; "Known" gives full characteristic; +10/+20/+30 give the standard mastery bumps.

### Porting strategy DH2 → RT
- **Re-expand consolidated skills.** A DH2 character with `Stealth +10` should have RT `Concealment +10`, `Silent Move +10`, and `Shadowing +10` (or pick one if the porter prefers a stricter mapping). Same with `Athletics → Climb+Swim`, `Operate → Pilot+Drive`, `Navigate → Navigation`, `Linguistics → Speak Language`.
- **Add the dropped skills.** Blather, Carouse, Chem-Use, Demolition, Tracking, etc., become available in RT.
- **Parry stops being a skill.** Its mastery bonus (+10/+20/+30) translates to the character having `Weapon Training` bonuses or specific RT talents (Counter-Attack, Step Aside) — there's no clean numeric mapping; safest is to keep the bonus as a flat Parry test bonus during migration.
- **Add RT-specific skills:** Pilot (Spacecraft), Navigation (Stellar/Warp), Trade (Voidfarer/Astrographer), Forbidden Lore (Koronus Expanse/Rogue Traders), Common Lore (Koronus Expanse/Rogue Traders).

### VTT impact
- DH2 skill data model is **simpler** than RT's (fewer entries, no basic/advanced flag).
- For a DH2-only VTT, the skill list is shorter and cleaner. For RT, the list grows ~10–12 entries.
- Untrained handling: DH2 always tests at half characteristic (round up) unless the skill is flagged as un-testable untrained; RT distinguishes Basic (test at half) vs. Advanced (cannot test untrained).

---

## 7. Talents (Mostly portable, with new DH2 talents)

DH2 organises Talents into **Tier 1 / Tier 2 / Tier 3** with explicit aptitude pairs (matching the Aptitude cost table in §5). Most DH1/RT talents survive into DH2 with the same names and effects. Key new DH2 talents (not in DH1):

- **Adamantium Faith** — reduces Fear/Pinning failure DoF by WPB
- **Clues from the Crowds** — bonus to Inquiry in populated areas
- **Constant Vigilance** — use Per/Int instead of Ag for Initiative
- **Contact Network** — use Fellowship instead of Influence for Requisition tests
- **Coordinated Interrogation** — +10 to Interrogate, more if multiple chars have it
- **Cover-Up** — reduce Influence by 1 to gain 1d5 Subtlety
- **Delicate Interrogation** — reduce Subtlety loss by 1d5 during investigation
- **Deny the Witch** — use WP for Evade vs. psychic attacks
- **Devastating Assault** — successful All Out Attack grants a second attack
- **Double Tap** — bonus to second attack if first hits
- **Eye of Vengeance** — spend Fate to boost damage/penetration
- **Face in a Crowd** — use Fel for Shadowing
- **Favoured by the Warp** — roll twice for Psychic Phenomena, choose
- **Flash of Insight** — spend Fate to reveal a clue
- **Halo of Command** — affect NPCs at long range with Social
- **Hammer Blow** — bonus thunderous melee strike
- **Inescapable Attack** — attacker imposes Evasion penalty
- **Keen Intuition** — retry Awareness test once at −10
- **Killing Strike** — spend Fate to make melee attack unavoidable
- **Mastery** — spend Fate to auto-succeed in mastered skill
- **Never Die** — ignore Critical damage penalties for a Fate point
- **Nowhere to Hide** — reduce cover AP with DoS
- **Preternatural Speed** — double speed on charge
- **Superior Chirurgeon** — +20 Medicae, first aid bonuses
- **Target Selection** — shoot into melee without penalty
- **Thunder Charge** — armoured charge breaks enemies
- **Two-Weapon Master** — no penalty fighting two single-handed weapons
- **Warp Conduit** — Fate point adds 1d5 to psy rating
- **Warp Lock** — ignore Psychic Phenomenon once per session
- **Weapon-Tech** — boost Melta/Plasma/Power/Exotic weapons
- **Whirlwind of Death** — one attack per engaged enemy

### Weapon Training (DH2 simplified)
DH2 collapses Weapon Training under one talent with specialisations: **Bolt, Chain, Flame, Heavy, Las, Launcher, Melta, Plasma, Power, Low-Tech, Shock, Solid Projectile.** RT instead uses split talents `Melee Weapon Training (X)`, `Pistol Weapon Training (X)`, `Basic Weapon Training (X)`, `Heavy Weapon Training (X)` for each group.

### Porting DH2 → RT
- Most talents transfer 1:1 (Air of Authority, Counter Attack, Blademaster, Crushing Blow, Lightning Attack, Quick Draw, Step Aside, Sound Constitution, Two-Weapon Wielder, etc.).
- **Weapon Training** has to be re-expanded: a DH2 character with `Weapon Training (Bolt)` becomes RT `Pistol Training (Bolt) + Basic Weapon Training (Bolt) + Heavy Weapon Training (Bolt)` (you may grant all three or pick by what the character actually wields).
- Add RT-only talents: Renowned Warrant (Rogue Trader career), Air of Authority defaults, Pure Faith/Purge the Unclean/Divine Ministration (Missionary chain), Master & Commander, Foresight, Navigator talent (gating the Navigator power tree).
- Remove DH2 talents that simply do not map (rare — most have RT equivalents).

**VTT impact:** Talent database is ~85–90% reusable. Re-expand Weapon Training; add RT-exclusive talents; preserve the Tier 1/2/3 categorisation since RT also uses tiers in advance tables.

---

## 8. Combat Actions (mostly identical, two notable changes)

The combat round structure is identical:
- **Initiative** = 1d10 + Agility Bonus
- One **Full Action**, or two **Half Actions**, per Turn (cannot take the same Half twice in DH2)
- **Reactions** (Evasion = Dodge or Parry) once per Round
- **Free Actions** for incidentals
- **Extended Actions** for multi-round tasks

### Two notable DH2-specific changes vs. RT

**1. Evasion is a unified Reaction.** In DH2, the Reaction is called **Evasion** and it lets you choose either Dodge (Movement) or Parry (Melee) on a per-instance basis. RT uses two separate Reactions: Dodge and Parry (each named explicitly). The mechanics behind them are identical — Dodge for ranged, either for melee, Challenging (+0) test — but the bookkeeping in a VTT differs.

**2. Standard Attack damage tweak.** DH2 keeps the rule that a successful WS/BS attack with a Standard Attack action inflicts **one hit**, but adds: after rolling damage, the attacker can **replace one damage die's result with the degrees of success** from the attack roll. RT has the conceptually similar "DoS adds to damage" mechanic for some weapons but not as a universal swap rule.

### Side-by-side action table

| Action | DH2 | RT | Notes |
|---|---|---|---|
| Aim (Half/Full) | ✔ +10/+20 | ✔ +10/+20 | Same |
| All Out Attack (Full) | **Easy (+30) WS, one hit, no Evasion** | **+20 WS, one hit, no Dodge/Parry** | DH2 is slightly more generous to-hit |
| Brace Heavy Weapon (Half) | ✔ | ✔ | Same |
| Called Shot (Full) | ✔ Hard (−20) | ✔ Hard (−20) | Same |
| Charge (Full) | ✔ +20 WS | ✔ +10 WS | **DH2's charge bonus is bigger** |
| Defensive Stance (Full) | ✔ Reaction +1, foes −20 WS | ✔ Reaction +1, foes −20 WS | Same |
| Delay | **Full Action** | **Half Action** | **DH2 changed Delay to Full Action!** |
| Disengage (Full) | ✔ | ✔ | Same |
| **Evasion (Reaction)** | **✔ unified Dodge-or-Parry** | ✘ — split into Dodge/Parry | **Naming/UI diff** |
| Feint (Half) | ✔ | ✔ | Same |
| Focus Power | ✔ (varies) | ✔ (varies) | **Now nearly identical mechanics — see §11** |
| Full Auto Burst (Full) | ✔ −10 BS, 1 hit/DoS | ✔ +20 BS, 1 hit/DoS | **DH2 inverts the modifier!** (DH2 makes auto-fire harder; RT makes it easier) |
| Grapple | ✔ varies | ✔ Half/Full split | Same intent |
| Guarded Attack | ✔ Half Action | ✔ Full Action | **DH2 reduces it to Half** |
| Jump/Leap (Full) | ✔ | ✔ | Same |
| Knock-Down (Half) | ✔ | ✔ | Same |
| Lightning Attack (Half) | ✔ −10 WS, 1 hit/DoS | (via Talent) | DH2 lists separately |
| Manoeuvre (Half) | ✔ | ✔ | Same |
| Move (Half/Full) | ✔ | ✔ | Same |
| Multiple Attacks (Full) | ✔ | ✔ | Same |
| Overwatch (Full) | ✔ | ✔ | Same |
| Ready (Half) | ✔ | ✔ | Same |
| Reload (varies) | ✔ | ✔ | Same |
| Run (Full) | ✔ | ✔ | Same |
| Semi-Auto Burst (Half) | ✔ 0 BS, 1 hit per 2 DoS | ✔ +10 BS, 1 hit per 2 DoS | **Modifier differs** |
| Stand/Mount (Half) | ✔ | ✔ | Same |
| Standard Attack (Half) | ✔ one hit (+10) | ✔ one hit (+10) | Same |
| Stun (Full) | ✔ | ✔ | Same |
| Suppressing Fire (Full) | ✔ | ✔ | Same |
| **Tactical Advance (Full)** | **✔** | ✘ | **DH2 keeps this; RT does not** |
| Use a Skill (varies) | ✔ | ✔ | Same |

**Damage workflow is identical** in both games:
1. Roll to hit (BS/WS test) + modifiers
2. Roll location (reversed-digit d100 — identical table)
3. Roll damage, add SB (melee) or weapon profile bonus; **DH2-specific: swap one die for DoS if desired**
4. Target subtracts Armour (after Pen) + TB
5. Excess over Wounds = Critical Damage, consult Critical chart by location + damage type
6. **Righteous Fury** — natural 10 on a damage die triggers, identical in both. DH2 simplification: low-tier "Troop" NPCs are simply killed by Righteous Fury rather than rolling on the Critical table (see §17).

### Dive for Cover (DH2 special Dodge use)
DH2 adds an explicit **Dive for Cover** option for Dodge: if cover is within AgB metres and you're not Prone, you can use the Reaction to make an Ordinary (+10) Dodge test; on success you leap behind cover and gain Prone. You're still hit but get the cover's AP. RT has similar wording but does not formalize it as its own action.

### Conditions (both games match closely)
**Stunned, Prone, Pinned, Unaware, Helpless, Blood Loss, Fatigue, Suffocation, Unconscious, On Fire** — all identical mechanics. DH2 explicitly names **Lost Hand, Lost Arm, Useless Limb, Lost Eye, Lost Foot, Lost Leg** conditions tied to Critical Damage results; RT uses the same set.

### VTT impact
- Combat automation is essentially portable.
- **Rename Evasion (DH2) to two distinct Reactions (Dodge/Parry) in RT.**
- Adjust the Charge bonus (+20 → +10), the Full Auto modifier (−10 → +20), and the Semi-Auto modifier (0 → +10) when porting from DH2 to RT.
- Move Delay from Full Action to Half Action (DH2 → RT).
- Move Guarded Action from Half to Full Action (DH2 → RT).
- Add the DoS-replaces-damage-die toggle for DH2 damage rolls; remove it for RT.
- Add Tactical Advance to DH2 actions list; remove from RT.

---

## 9. Psychic Powers (Now Nearly Identical — Much Easier Port than DH1!)

This is the most striking improvement vs. the DH1→RT port. **DH2 adopted RT's psychic framework wholesale.**

### DH2 psychic mechanic (matches RT 1:1)
- **Psy Rating** 1–10, advanced by spending `200 × new rating xp` (e.g. PR 1 → 2 costs 400 xp, PR 5 → 6 costs 1,200 xp)
- Three **Psychic Strengths** (identical to RT):
  - **Fettered** (≤ ½ PR, rounded up) — **no Psychic Phenomena check**
  - **Unfettered** (full PR) — Phenomena on **doubles**
  - **Push** (PR + 1 to + 2 for Sanctioned; + 1 to + 3 for Unsanctioned) — Phenomena on **any non-doubles roll**, plus −10 per point of Push to the Focus Power test
- **Focus Power Test**: a Willpower percentile test (or Psyniscience, or Opposed Willpower depending on the power)
- Power effects scale by Psy Rating: ranges typically `Xm × PR`, damages `1d10 + PR`, etc.
- **Disciplines**: Biomancy, Divination, Pyromancy, Telekinesis, Telepathy — each laid out as a **discipline tree** with paths
- To purchase a power, the character must trace a path on the tree from the top-most (free) power through previously-purchased powers
- **Psychic Phenomena** triggered by doubles on Focus Power Test (unless Fettered); roll on the Phenomena table; severe results escalate to **Perils of the Warp**
- **Sanctioned vs. Unsanctioned** distinction maps directly to RT's Astropath/Sanctioned vs. Renegade/Sorcerer brackets

### Conversion vs. DH1 → RT
The DH1 → RT conversion required a Threshold↔PR formula (`−1 PR per +4 Threshold`). **DH2 → RT needs no such formula** — Psy Rating is Psy Rating, Focus Power is Focus Power, Fettered/Unfettered/Push framework is identical.

Minor differences:
- DH2 maximum Push for Sanctioned is **+2** (vs. RT's **+3**); for Unsanctioned it's **+3** (vs. RT's **+4**). RT psykers get slightly more headroom.
- DH2 powers and RT techniques have similar layouts (Value, Prerequisites, Action, Focus Power Test, Range, Sustained, Subtype, Effect), and most concept-matches port directly.
- RT introduces **Navigator powers** (a separate discipline tree for the Navigator class). No DH2 equivalent — keep it as a wholly new tree.

### VTT impact
- **The Power Roll widget (DH1) is already gone in DH2.** Use the existing DH2 Focus Power Test widget for RT — it works as-is.
- The Psychic Strength toggle (Fettered/Unfettered/Push) is already in the DH2 sheet; just allow Push to +3 (Sanctioned) and +4 (Unsanctioned) for RT.
- Discipline trees are already a tree-progression UI in DH2; reuse for RT.
- Add Navigator powers tree for RT.
- Psychic Phenomena and Perils of the Warp tables — DH2's tables work in RT with minor wording differences.

---

## 10. Economy: Influence (DH2) vs. Profit Factor (RT)

This is the second-largest single replacement after Aptitudes.

### DH2: Influence + Requisition Tests
- Currency: **There is no Throne tracking** in DH2. Money/wealth/reputation collapse into one stat: **Influence (Ifl)** — a per-character percentile.
- To get something, the player makes a **Requisition Test**: roll 1d100 ≤ (Influence + Availability + Craftsmanship + Location modifiers).
- **Availability scale (DH2)**: Ubiquitous +30, Abundant +20, Plentiful +10, Common +0, Average −10, Scarce −20, Rare −30, Very Rare −40, Extremely Rare −50, Near Unique −60, Unique −70.
- **Craftsmanship**: Poor +10, Common 0, Good −10, Best −20 (modifying the Requisition test, on top of Availability).
- **Trading in items**: a character can offer an item to trade for a Requisition bonus equal to the difference in availabilities (e.g. trading in a Scarce item to acquire an Average item gives +10 bonus).
- **Commerce skill** can give +10 per DoS on an Opposed Commerce test before the Requisition test.
- Influence is **per-character**, not pooled. Each Acolyte rolls separately.
- Influence increases through **gameplay rewards** (typical: +1 to +5 per successful adventure), not XP.

### RT: Profit Factor + Acquisition Tests
- **Profit Factor (PF)** is a single group-wide percentile representing wealth + influence + connections.
- Starting PF: 20–60 depending on starting Ship Points roll.
- **Acquisition Test**: 1d100 ≤ PF, modified by:
  - **Availability** (Ubiquitous +30 → Near Unique −50 — same scale)
  - **Craftsmanship** (Poor +10 → Best −30 — slightly different from DH2)
  - **Scale** (Negligible/Trivial +30 → Vast −50)
- PF is not consumed by acquisitions — it's wealth-stature, not cash.
- PF changes via Awards, **Endeavours**, and **Misfortunes**.
- **Commerce skill** in RT gives ±2 PF per DoS for a single haggle.

### Porting DH2 → RT
- Collapse the 4–5 per-character Influence values into a **single group Profit Factor**. Recommended: take the average and round, or use the maximum minus 10 to account for group-level inertia.
- Remove the per-character Influence tracker; add the group PF tracker.
- Replace Requisition Test macros with Acquisition Test macros (only the modifier scale changes slightly).
- Add the **Scale** modifier dimension to acquisitions (RT-only).
- Remove the "Trading in items" mechanic (RT doesn't use it the same way).
- Migrate the Commerce-bonus logic from "+10/DoS" (DH2) to "±2 PF/DoS" (RT).

### Acquisition Modifier comparison

| Availability | DH2 mod | RT mod |
|---|---|---|
| Ubiquitous | +30 | +30 |
| Abundant | +20 | +20 |
| Plentiful | +10 | +10 |
| Common | +0 | +0 |
| Average | −10 | −10 |
| Scarce | −20 | −20 |
| Rare | −30 | −30 |
| Very Rare | −40 | −40 |
| Extremely Rare | −50 | −50 |
| Near Unique | −60 | −60 |
| Unique | −70 | (n/a — Unique is GM-only in RT) |

(The two scales are equivalent. The differences are in **Craftsmanship** values and the addition of **Scale** in RT.)

### VTT impact
- DH2 builder: Influence field per character; Requisition macro using Influence as the target.
- Migrating to RT: convert all character Influence to one group PF, change macros, add Scale slider, add Craftsmanship −30 for Best (DH2 has −20).

---

## 11. Subtlety (DH2-only) — Drop for RT

DH2 introduces a wholly new narrative resource: **Subtlety**.

### DH2 Subtlety
- A single value (0–100) tracked **for the whole warband**, **secretly by the GM**.
- Starts at **50** at warband formation.
- **Decreases** when the warband acts overtly: combat, intimidation, exercising Inquisitorial authority, heavy weapon usage, large requisitions, public displays of authority.
- **Increases** when the warband acts covertly: deception, stealth, low-profile investigation, disguises.
- Used as a percentile for **Subtlety Tests** (e.g. "do the cultists notice the warband prowling outside?" → opposed Subtlety test).
- High Subtlety = harder for enemies to notice you, harder to use Influence overtly.
- Low Subtlety = your reputation is well-known, easier to intimidate locals but harder to operate undetected.
- Linked to **Influence**: Subtlety tests can modify Influence test difficulty; certain talents (Cover-Up) convert Influence loss into Subtlety gain.

### RT has no Subtlety equivalent
RT's narrative resources are **Profit Factor** (wealth/reputation) and **Renown** (per-character, optional in some supplements but not in the core). Neither maps cleanly to Subtlety.

### Porting strategy
- **Drop Subtlety entirely when porting DH2 → RT.**
- Optionally retain it as a custom "GM Track" if the campaign genuinely benefits from a hidden-stat investigation atmosphere (RT campaigns are typically more overt — Rogue Trader warrants make subtlety less relevant).
- Convert DH2 talents that interact with Subtlety (Cover-Up, Delicate Interrogation, Face in a Crowd) to RT — they lose their Subtlety effects but retain their other benefits (e.g. Face in a Crowd still lets you use Fellowship for Shadowing).

### VTT impact
- DH2 build needs a GM-only secret tracker (0–100) for Subtlety.
- DH2 sheet has icons/talents that can affect Subtlety — wire those to the tracker.
- RT build: remove the Subtlety tracker, hide or repurpose related talents.

---

## 12. Insanity, Corruption, Mutations, Mental Disorders (Identical)

Both games use the same:
- **Insanity Points (IP)** track. Mental disorders trigger at thresholds (10/20/30/...).
- **Corruption Points (CP)** track. Malignancies trigger at thresholds; mutations come from rolling on mutation tables.
- Same disorder lists (Phobia, Obsession/Compulsion, etc.).
- Same Critical-damage and Critical-injury bookkeeping.

**VTT impact:** Insanity/Corruption widgets are fully portable.

---

## 13. Career List Replacement (DH2 Roles + Backgrounds → RT Careers)

### DH2 Roles
1. **Assassin** — stealthy single-target killer (Apt: WS, Fieldcraft)
2. **Chirurgeon** — medic/scientist (Apt: Int, Fieldcraft)
3. **Desperado** — gunslinger/scoundrel (Apt: BS, Finesse)
4. **Hierophant** — preacher/zealot (Apt: WP, Leadership)
5. **Mystic** — psyker (Apt: Psyker, WP)
6. **Sage** — investigator/lore-master (Apt: Int, Knowledge)
7. **Seeker** — tracker/investigator (Apt: Per, Fieldcraft)
8. **Warrior** — fighter (Apt: WS or BS, Offence)

### DH2 Backgrounds
1. **Adeptus Administratum** — bureaucrat/clerk
2. **Adeptus Arbites** — judge/enforcer
3. **Adeptus Astra Telepathica** — psyker
4. **Adeptus Mechanicus** — tech-priest
5. **Adeptus Ministorum** — cleric
6. **Imperial Guard** — soldier
7. **Outcast** — scum/criminal/independent

### Suggested DH2 → RT career mapping
This is a starting guide; players can deviate.

| DH2 Role + Background | RT Career |
|---|---|
| Assassin + Outcast / Imperial Guard | Arch-militant (Void-master if pilot/gunner-focused) |
| Chirurgeon + Adeptus Ministorum / Imperial Guard | Missionary or Seneschal |
| Desperado + Outcast | Void-master or Arch-militant |
| Hierophant + Adeptus Ministorum | Missionary |
| Mystic + Adeptus Astra Telepathica | Astropath Transcendent |
| Mystic + Outcast | Astropath Transcendent (Unsanctioned variant) or NPC-only |
| Sage + Adeptus Administratum | Seneschal |
| Sage + Adeptus Mechanicus | Explorator |
| Seeker + Adeptus Arbites | Seneschal or Arch-militant |
| Warrior + Adeptus Arbites / Imperial Guard | Arch-militant |
| Warrior + Adeptus Mechanicus | Explorator (Skitarii flavour) |
| any combination with Navigator-themed backstory | Navigator |
| Rogue-Trader-styled character | Rogue Trader (the leader career) |

### VTT impact
- DH2 character creation form needs **Role + Background** dropdowns (independent picks).
- RT character creation form needs a **Career** dropdown (single pick, with optional Origin Path layered above).
- Career-conversion utility for migrating characters: ask the player which RT career they want, then re-build the advance tree (since aptitude-based purchases need to be re-priced via the RT career table).

---

## 14. Weapons (Mostly portable)

Weapon profile fields are identical: **Name, Class, Range, RoF (S/Semi/Full), Damage, Damage Type, Penetration, Clip, Reload, Special Qualities, Weight, Availability**. Most DH2 weapons appear in RT with identical or very similar profiles.

Group classifications are the same: Bolt, Chain, Flame, Las, Launcher, Low-Tech, Melta, Plasma, Power, Shock, Solid Projectile. Universal-tier weapon training (RT only) collapses these for cross-group competence.

A few DH2-specific items (Laslock, certain hive-world primitive weapons) lack a direct RT analogue, but most can be ported using closest-match qualities.

**VTT impact:** Weapon database is largely portable. Replace `cost in Thrones` (which DH2 doesn't use anyway) with `Availability + Craftsmanship` as inputs to Acquisition tests. Expand weapon-upgrade subsystem for RT.

---

## 15. Vehicle Combat (DH2 has full rules; RT has lighter ground rules + full Starship rules)

### DH2 Vehicle Combat (new vs. DH1)
DH2 introduces a full vehicle combat subsystem:
- **Facings**: Front (90°), Rear (90°), Left Side (90°), Right Side (90°). Each has its own Armour Points.
- **Integrity** (wounds-equivalent for vehicles). Damage in excess goes to **Vehicle Critical Damage** via location-specific tables.
- **Hit Location** for vehicles (reversed-digit d100):
  - 01–20 Motive Systems
  - 21–60 Hull
  - 61–80 Weapon
  - 81–100 Turret (counts as Front facing)
- **Vehicle Actions** (using the Operate skill specialty):
  - Tactical Manoeuvring (Half/Full): standard move
  - Floor It! (Full): double tactical speed + DoS bonus
  - Evasive Manoeuvring (Full): −10 to be hit per DoS
  - Hit & Run (Full): move + melee + move
  - Jink (Reaction): use vehicle size mod to avoid
  - Ram! (Full): deal AP + 1d10 damage
  - Rearing Strike (Half, mounted): attack with steed
- **Vehicle Critical Effects** per location (Motive Systems / Hull / Weapon / Turret) with severity 1–10+
- **Out of Control / Crashing / Falling Over** rules for damaged vehicles
- **Vehicle Traits**: Amphibious, Daemonic Possession, Damage Control, Enclosed, Enhanced Motive Systems, Environmentally Sealed, Extremely Volatile, Immobile, Living, Open-Topped, Rugged, Tracked, Walker, Wheeled

### RT Vehicle vs. Starship
RT has a similar **ground-vehicle** layer (Speeder, Land Speeder, Chimera profile, etc. — but less detailed than DH2's full chapter) and a **wholly separate Starship combat subsystem** with:
- **Strategic Rounds** (longer than tactical)
- **VU positions** (Void Units, 10,000m each)
- **Manoeuvre / Shooting / Extended Actions**
- **Hull Integrity, Crew Population, Morale damage tracks**
- **Components** (Plasma Drive, Warp Engine, Auger Array, Bridge, Hold, etc., each with Space/Power costs)
- **Ship Critical Hit chart**
- **Boarding Actions** (opposed Command tests)
- **Hit and Run actions**

### Porting strategy
- **DH2 vehicle rules port to RT ground-vehicle combat with minimal changes.** The facing/AP/Integrity model is identical; merely use RT's slightly leaner vehicle action list (or keep DH2's richer list).
- **Starship combat is wholly new content** for a DH2-only VTT and must be built from scratch.
- Operate (Voidship) in DH2 was implicit for limited use; RT promotes it to a frequent skill paired with Navigation (Stellar) and Navigation (Warp).

### VTT impact
- DH2 vehicle subsystem (facings, integrity, vehicle actions, vehicle critical hits) is largely reusable in RT for ground vehicles.
- **Build new** for RT: starship sheet, Strategic Rounds, VU map, starship hit chart, ship components inventory with Space/Power budgets, Hull Integrity/Crew Population/Morale tracks, boarding action flow.

---

## 16. Reinforcement Characters (DH2 only)

DH2 introduces **Reinforcement Characters (RCs)**: powerful NPCs the warband can call upon for a single session by spending Influence.

- Each RC has an **Influence Minimum** (the minimum personal Influence to call them) and an **Influence Cost** (the Influence pool spent to summon them).
- Multiple Acolytes can pool Influence to meet the cost.
- Calling an RC **permanently reduces** the Acolyte's Influence by the cost.
- It also reduces warband **Subtlety** by the same amount (they're impressive figures and draw attention).
- RC examples: Eversor Assassin, Sister of Battle Canoness, Deathwatch Space Marine, etc.

### RT equivalent
RT has no formal Reinforcement system. The closest analogue is **Endeavour rewards** (long-term mission outcomes) or **NPC allies recruited via narrative** (Crew, Companions). Neither uses a numeric cost-mechanism the way RCs do.

### Porting strategy
- When porting DH2 → RT, **drop the RC system** or convert it to one-off NPC allies awarded through Endeavours.
- The Peer (Officio Assassinorum) and similar talents in DH2 (which discount RC costs) lose their cost-discount but can remain as flavour talents.

### VTT impact
- DH2 build needs an RC summon flow: select RC → check Influence minimum → confirm Influence + Subtlety deduction → spawn NPC sheet.
- RT build: omit the system.

---

## 17. NPC Types: DH2's Troop/Elite/Master + Threat Threshold

DH2 introduces three explicit NPC tiers (RT does not formalize these — RT NPCs are all "full-stat-block" by default).

| Tier | Description | Special rules |
|---|---|---|
| **Troop** | Basic enemies (gangers, cultists, low-rank guards). Simplified profiles. | **Slain automatically on Righteous Fury** (no Critical roll). Cannot inflict Righteous Fury on PCs by default. |
| **Elite** | Mid-tier threats (captains, sergeants, dangerous warlocks). Full profiles. | Uses full Righteous Fury rules both ways. |
| **Master** | Campaign-level threats (Daemons, Inquisitors, ancient psykers). Full profiles, often unique. | Full rules; often has multiple actions or other special abilities. |

Each NPC profile lists a **Threat** value used in encounter building.

### Threat Threshold Encounter Building (DH2)
DH2 provides a formula for building combat encounters:
- Compute encounter level from PCs' average spent xp.
- Look up the **threshold multiplier** (4 to 35, depending on the XP bracket).
- Multiply: **Threat Threshold = encounter level multiplier × number of PCs in warband**.
- Build the encounter by selecting NPCs whose Threat values sum to roughly the threshold.

Brackets (DH2 Table 12–1):

| Encounter Level (PC avg xp) | Threshold Multiplier |
|---|---|
| 0–499 xp | 4 × PCs |
| 500–999 xp | 5 × PCs |
| 1,000–1,299 xp | 6 × PCs |
| 1,300–2,299 xp | 7 × PCs |
| 2,300–4,499 xp | 8 × PCs |
| 4,500–6,999 xp | 10 × PCs |
| 7,000–9,999 xp | 12 × PCs |
| 10,000–13,499 xp | 14 × PCs |
| 13,500–17,499 xp | 17 × PCs |
| 17,500–21,999 xp | 20 × PCs |
| 22,000–26,999 xp | 23 × PCs |
| 27,000–30,999 xp | 27 × PCs |
| 31,000–35,999 xp | 31 × PCs |
| 36,000+ xp | 35 × PCs |

Recommended composition: ~1–3 Elites/Masters, the rest Troops.

### RT has no equivalent system
RT relies on the GM's judgement and example encounters in published adventures. There is no Threat-budget table.

### VTT impact
- DH2 NPC tier badge (Troop / Elite / Master) on each NPC sheet; the "Troop killed-on-RF" rule needs an automation rule in combat.
- Encounter builder utility for DH2 (Threat Threshold table). For RT, this utility has no analogue and should be skipped or kept as a generic XP-budget guide.

---

## 18. New RT Systems (Wholly new — must build for RT)

Things in RT that simply have no DH2 equivalent:

### Starships
- See §15 for an overview.
- Needs: ship sheet, components inventory, Space/Power budget, Hull Integrity / Crew Population / Morale tracks, Strategic Round flow, VU map, starship hit-chart, boarding actions.

### Endeavours
- A multi-stage long-term mission system (Expedition / Trade / Military / Criminal endeavours) with **objectives** that grant **Profit Factor** rewards on completion.
- Each Endeavour has multiple Achievements (steps); each Achievement awards PF or other narrative gains.
- VTT needs: an Endeavour Journal where the GM can register active endeavours, mark progress on achievements, and post PF rewards.

### Exploration Challenges
- Specialized obstacles for void exploration (warp storms, gravity wells, hostile xenos worlds).
- VTT needs: a tracker for explored systems, with each system having attached challenges.

### Profit Factor (covered in §10) and Ship Points
- Ship Points are spent at character creation to buy/customise the warband's ship (1:1 conversion to PF for unspent points).

### Renown (optional, supplements)
- A per-character reputation track that gates access to certain talents/items in some RT supplements. Not in the core book but appears in **Edge of the Abyss**, **Battlefleet Koronus**, etc.

---

## 19. Comparison vs. DH1→RT Port (Why DH2 is Easier)

| Subsystem | DH1 → RT difficulty | DH2 → RT difficulty | Reason |
|---|---|---|---|
| Core mechanic | Trivial | Trivial | Identical |
| Characteristics | Trivial | **Moderate** | DH2 added Influence — needs special handling |
| Character creation | Major (full rewire) | Major (full rewire, but DH2 also full-rewires from DH1, so the porter is already used to it) | Both require new flow |
| Aptitudes | n/a in DH1 | **Major (drop entirely)** | New problem unique to DH2 → RT |
| Skills | Minor additions | **Moderate (re-expand consolidated skills)** | DH2 simplified, RT needs to grow them back |
| Talents | Mostly portable | Mostly portable + already Tiered | DH2 already matches RT's Tier organisation |
| Combat actions | Mostly portable | Mostly portable, with edge cases | A handful of action-modifier inversions (Full Auto, Charge, Delay) |
| **Psychic powers** | **Major (Threshold→PR formula)** | **Trivial** | DH2 already uses RT's Fettered/Unfettered/Push framework — **biggest win** |
| Economy | Major (Thrones→PF) | Moderate (Influence→PF) | DH2 already abandoned Thrones; Influence is closer to PF conceptually |
| Insanity/Corruption | Trivial | Trivial | Identical |
| **Subtlety** | n/a in DH1 | **Drop entirely for RT** | New problem unique to DH2 → RT |
| Vehicle combat | DH1 lacks formal rules | DH2 has full rules that port well | DH2 → RT actually easier (reuse DH2 vehicle subsystem) |
| Starships | Major (wholly new) | Major (wholly new) | Same situation |
| Endeavours | Major (wholly new) | Major (wholly new) | Same situation |
| NPC tiers/Threat Threshold | n/a | Drop or keep as DH2-specific | New problem unique to DH2 → RT |
| Reinforcement Characters | n/a | Drop for RT | New problem unique to DH2 → RT |

**Net assessment:** DH2 → RT is **mechanically simpler** than DH1 → RT, primarily because the psychic system, talent organisation, and economy are all conceptually closer to RT. But it introduces **three new subsystems** that must be discarded or dropped for RT: Aptitudes, Subtlety, and Reinforcement Characters.

---

## 20. Summary Checklist for VTT Porter

### Keep (data-portable)
- Core 1d100 ≤ stat resolution
- 9 of 10 characteristics (drop Influence to group PF)
- Wounds, Fatigue, Stunned, Prone, Pinned, Blood Loss, Suffocation
- Critical Damage tables (location × type)
- Righteous Fury rules
- Hit location table
- Insanity / Corruption tracks
- Most talents (~85–90%)
- Weapon database (Class/Range/RoF/Dmg/Pen/Clip/Reload/Special/Weight/Availability)
- Armour database
- Combat actions (with the modifier tweaks in §8)
- Psychic powers (Fettered/Unfettered/Push, Focus Power, Disciplines, Phenomena, Perils)
- DH2 vehicle subsystem (port to RT ground vehicles)

### Modify
- **Skills**: re-expand DH2's consolidated skills back into RT's longer list (Stealth → Concealment+Silent Move+Shadowing; Operate → Pilot+Drive; Navigate → Navigation; etc.)
- **Weapon Training**: re-expand the unified DH2 talent into RT's split Pistol/Basic/Heavy variants
- **Combat actions**: adjust Charge (+20→+10), Full Auto (−10→+20), Semi-Auto (0→+10), Delay (Full→Half), Guarded Action (Half→Full)
- **All Out Attack** bonus: +30 (DH2) → +20 (RT)
- **Evasion** Reaction: split into separate Dodge and Parry Reactions for RT
- **Tactical Advance**: drop the action for RT
- **Influence** characteristic: collapse into group **Profit Factor**
- **Requisition Test**: convert to **Acquisition Test** (add Scale modifier; tweak Craftsmanship)
- **Fate Threshold**: same mechanics, different Home World determination

### Drop (DH2-only)
- **Aptitudes** system entirely (replace with RT career-rank advance tables)
- **Subtlety** tracker (drop or keep as optional GM track)
- **Reinforcement Characters** (drop or convert to Endeavour rewards)
- **NPC Threat Threshold** encounter budget (drop or keep as DH2-specific tool)
- **Troop/Elite/Master** simplified RF rule (RT uses full RF for all NPCs by default)
- Talents that interact with Subtlety (Cover-Up, Delicate Interrogation) — keep the talents but disable the Subtlety side-effects in RT

### Build New (for RT)
- **Profit Factor tracker** (group-level, single value)
- **Ship Points** at character creation
- **Starship sheet** (separate entity) with Hull, Components, Space/Power budget
- **Starship combat** (Strategic Rounds, VU positions, Manoeuvre/Shooting/Extended actions)
- **Ship Critical Hit chart**, Crew Population / Morale / Hull Integrity damage tracks
- **Boarding Action** opposed-Command flow
- **Endeavour Journal**
- **Exploration Challenge** tracker
- **Navigator** career and Navigator powers tree
- **Renown** tracker (optional, for supplements)
- RT-exclusive talents: Renowned Warrant, Air of Authority chain, Pure Faith/Purge the Unclean chain, Master & Commander, Foresight, etc.

### Conversion utilities
- **DH2 → RT character migrator**: ask which RT career, rebuild advance tree (since DH2's aptitude-priced advances must be re-priced via RT career tables). Skill +30 ranks cap at +20 in RT.
- **Influence → PF aggregator**: take the warband's Influence values and combine into one group PF (suggested: average, then add 10 for group-level inertia).
- **Skill re-expander**: DH2 `Stealth +X` → RT `Concealment +X, Silent Move +X, Shadowing +X` (or pick best).
- **Weapon Training re-splitter**: DH2 `Weapon Training (Bolt)` → RT `Pistol Training (Bolt), Basic Weapon Training (Bolt), Heavy Weapon Training (Bolt)`.
- **Role + Background → Career mapper** (see §13 table).

---

## 21. References

- **Dark Heresy Second Edition Core Rulebook**, Fantasy Flight Games / Games Workshop, 2014. Character Creation pp. 28–93; Skills pp. 94–118; Talents pp. 119–138; Armoury pp. 140–192; Psychic Powers pp. 193–214; Combat pp. 215–258; Insanity/Corruption pp. 282–292; Narrative Tools (Subtlety, Influence, Reinforcement Characters) pp. 270–295; NPCs pp. 380–417.
- **Rogue Trader Core Rulebook**, Fantasy Flight Games. Character Creation pp. 11–34; Career Paths pp. 35–73; Skills pp. 73–88; Talents pp. 89–108; Armoury pp. 109–155; Psychic Powers pp. 156–181; Starships pp. 182–229; Playing the Game pp. 230–284; Game Master pp. 285–299.
- **Cross-edition conversion guidance**: RT Core p. 34 (Dark Heresy Characters and Rogue Trader) and p. 181 sidebar (Psychic Powers in Rogue Trader and Dark Heresy). Note: these were written for DH1; for DH2 the psychic conversion is now near-1:1 and the threshold-to-PR formula is **no longer needed**.

---

*Document version: 2.0 — VTT-porter focused mechanical delta between Dark Heresy 2nd Edition and Rogue Trader.*
