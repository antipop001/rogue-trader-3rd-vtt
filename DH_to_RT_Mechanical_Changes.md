# Dark Heresy → Rogue Trader: Mechanical Changes for VTT Adaptation

A reference for porting a Virtual Tabletop module/system from **Dark Heresy (1st Edition)** to **Rogue Trader**. Both games use the same d100 percentile core engine (the "Warhammer 40K Roleplay" engine), so the foundation is portable. This document focuses on what must be **added, replaced, or re-wired** in a VTT when migrating from DH to RT.

> **Bottom line for a VTT porter:** ~80% of character-sheet math (characteristics, skill tests, combat actions, wounds, damage, criticals, insanity, corruption) is mechanically identical. The big lifts are:
> 1. **Character creation flow** (Origin Path vs. Homeworld+Career)
> 2. **Economy model** (Profit Factor + Acquisition Tests vs. Thrones + monthly income)
> 3. **Psychic powers** (Psy Rating / Focus Power Tests vs. Threshold / Power Rolls)
> 4. **New systems**: Starships, Endeavours, Renown / Profit Factor advancement
> 5. **Career list** is entirely replaced
> 6. **Rank XP thresholds** are unified in RT

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

## 2. Characteristics (Unchanged)

All **nine characteristics** are the same and named identically:

| Characteristic | Abbreviation |
|---|---|
| Weapon Skill | WS |
| Ballistic Skill | BS |
| Strength | S/Str |
| Toughness | T |
| Agility | Ag |
| Intelligence | Int |
| Perception | Per |
| Willpower | WP |
| Fellowship | Fel |

Characteristic Bonus = tens digit. **2d10 + Home/Origin modifier** for generation in both games.

**VTT impact:** Stat block data model is identical. No structural changes.

---

## 3. Character Creation Flow (Major Rewire)

### Dark Heresy Creation Stages
1. Homeworld (d100 roll or chosen — Feral, Hive, Imperial, Void Born, Forge, Schola Progenium, etc.)
2. Generate Characteristics
3. Determine Career Path (often constrained by Homeworld)
4. Spend starting XP (**400 xp** to start) + buy equipment
5. Bring character to life (name, build, quirks, divination)
6. Play

### Rogue Trader Creation Stages
1. Generate Characteristics
2. **Origin Path** (a multi-step chain — see below)
3. Spend Experience Points (**5,000 xp total**, of which **500 xp** is unspent/discretionary; the first 4,500 represent baked-in starting Skills/Talents/Characteristics from Origin Path)
4. Giving Characters Life
5. **Profit Factor and Ship Points** (group-level)
6. Select Equipment (one Acquisition each at +0 modifier)
7. Play

### The Origin Path (RT only)
A chained set of selections, each contributing modifiers/Skills/Talents:
- **Home World** (Death World, Forge World, Hive World, Imperial World, Noble Born, Void Born)
- **Birthright** (Scavenger, Stubjack, Vaunted, Child of the Creed, Savant, Void Born, etc.)
- **Lure of the Void** (Tainted, Criminal, Renegade, Press-ganged, Chosen by Destiny, etc.)
- **Trials and Travails** (significant past events that shape the character)
- **Motivation** (Pride, Profit, Prestige, Renown, etc. — granted Talents)
- **Career** (final career selection)

**Starting power level:** RT Rank 1 = DH character with ~5,000 xp spent. RT characters are noticeably more capable at session zero.

**VTT impact:**
- Replace the simple Homeworld → Career picker with a multi-stage Origin Path wizard.
- Origin Path entries each grant modifiers (Characteristic ±, Skills, Talents, Wounds formula, Fate Point roll) — these must be applied **cumulatively** during character build.
- Starting XP variable changes from `400` (DH) to `4500 + 500 discretionary` (RT).

---

## 4. Wounds (Same formula, different source modifiers)

Both games use:

```
Starting Wounds = (2 × Toughness Bonus) + 1dX (X varies by Homeworld/Origin)
```

Dark Heresy uses a **fixed table by career**; Rogue Trader uses a formula based on **Home World** that explicitly states `double starting TB + 1d5(+modifier)`. For example:
- Death World: `2×TB + 1d5+2`
- Noble Born / Void Born / Hive World: `2×TB + 1d5`
- Forge World: `2×TB + 1d5+1`

**VTT impact:** Replace Wounds-by-career lookup table with Wounds-by-HomeWorld formula.

---

## 5. Fate Points (Same uses, different distribution)

**Identical uses** in both games:
- Re-roll a failed test
- Count Initiative as 10
- Add a Degree of Success
- Recover 1d5 Wounds
- Recover from being Stunned
- **Burn** for plot-armor survival

**Distribution** is by Home World in RT instead of Career in DH. Most RT Home Worlds use `1d10: 1–5 → 2 FP; 6–10 → 3 FP` (or 3/4 for Void Born, etc.).

Void Born get the **Charmed** trait: on spending a Fate Point (not burning), roll 1d10 — on a natural 9, the Fate Point is not lost.

**VTT impact:** Fate Point pool tracker is identical; only the determination roll changes.

---

## 6. Skills (Largely identical, minor additions)

The base **Skill list is nearly identical** between the two games. The same Basic/Advanced distinction applies (Basic = test at half-stat untrained; Advanced = cannot test untrained). Same Skill Mastery progression (+0 / +10 / +20). Same Skill Descriptors (Crafting, Exploration, Interaction, Investigation, Movement, Operator).

### Skills in both DH and RT:
Acrobatics, Awareness, Barter, Blather, Carouse, Charm, Chem-Use, Ciphers†, Climb, Command, Commerce, Common Lore†, Concealment, Contortionist, Deceive, Demolition, Disguise, Dodge, Drive†, Evaluate, Forbidden Lore†, Gamble, Inquiry, Interrogation, Intimidate, Invocation, Literacy, Logic, Medicae, Navigation†, Performer†, Pilot†, Psyniscience, Scholastic Lore†, Scrutiny, Search, Secret Tongue†, Security, Shadowing, Silent Move, Sleight of Hand, Speak Language†, Survival, Swim, Tech-Use, Tracking, Trade†, Wrangling. († = skill group with subspecialties)

### Notable RT additions / changes:
- **Pilot (Space Craft)** — a near-mandatory subspecialty for void-faring crews.
- **Trade (Voidfarer, Astrographer, Linguist, Armourer, Scrimshawer, etc.)** — more sub-trades emphasized.
- **Navigation (Stellar)** and **(Warp)** are critical for shipboard play and tied to Navigator characters specifically.
- **Common Lore (Koronus Expanse)** and **(Rogue Traders)** are setting-specific.
- **Forbidden Lore (Xenos, Warp, Heresy, Pirates)** sees expanded use.
- **Ciphers (Rogue Trader)** and **Secret Tongue (Rogue Trader)** — for the trade-fleet faction.

**VTT impact:** Skill list data is ~95% reusable. Add the new specialties to dropdowns; setting-specific Common Lores and Secret Tongues are the main additions.

---

## 7. Talents (Largely identical, with RT additions)

Most Dark Heresy Talents appear verbatim in Rogue Trader (Air of Authority, Ambidextrous, Arms Master, Berserk Charge, Blademaster, Bulging Biceps, Catfall, Combat Master, Counter-attack, Crack Shot, Crippling Strike, Crushing Blow, Dark Soul, Deadeye Shot, Decadence, Die Hard, Disarm, Double Team, Furious Assault, Hardy, Hatred, Hip Shooting, Iron Discipline, Jaded, Leap Up, Lightning Attack, Light Sleeper, Marksman, Master Orator, Nerves of Steel, Quick Draw, Rapid Reaction, Rapid Reload, Resistance, Sound Constitution, Step Aside, Sure Strike, Swift Attack, Takedown, Talented, True Grit, Two-Weapon Wielder, Unshakeable Faith, Wall of Steel, etc.).

### Weapon Training Talent groups
Both games use Weapon Training Talents (Melee / Pistol / Basic / Heavy / Thrown) **but RT adds the "Universal" tier** as a common shorthand:
- DH groups: Bolt, Flame, Las, Launcher, Melta, Plasma, Primitive, SP
- RT often grants `Melee Weapon Training (Universal)`, `Pistol Weapon Training (Universal)`, `Basic Weapon Training (Universal)` — these collapse multiple groups.

### RT-specific Talents
- **Renowned Warrant** (Rogue Trader career)
- **Air of Authority** is far more common as a starting Talent
- **Foresight, Master & Commander, Into the Jaws of Hell, Infused Knowledge, Peer (multiple variants), Pure Faith / Purge the Unclean / Divine Ministration / The Emperor Protects** (Missionary tree)
- **Void Tactician**, **Mastery of Space / Gunnery / Augurs / Small Craft** (Void-master specials)
- **Navigator** (talent, granting access to the Navigator power tree)
- Many Exotic Weapon Training options
- **Discipline Focus** (psyker, RT version) — converts to +5 on Focus Power Tests per +1 of the old DH Power Roll bonus

**VTT impact:** Talent database is ~85% reusable. Add the Universal-tier weapon trainings and the RT-exclusive Talents (especially Renowned Warrant, Air of Authority defaults, Pure Faith chain, Navigator).

---

## 8. Combat (Same engine, minor action changes)

The combat round structure is identical:
- **Initiative** = 1d10 + Agility Bonus
- One **Full Action**, or two **Half Actions**, per Turn
- **Reactions** (Dodge, Parry) once per Round
- **Free Actions** for incidentals
- **Extended Actions** for multi-round tasks

### Combat Actions: side-by-side

| Action | DH | RT | Notes |
|---|---|---|---|
| Aim (Half/Full) | ✔ | ✔ | Same +10/+20 |
| All Out Attack (Full) | ✔ | ✔ | +20 WS, no Dodge/Parry |
| Brace Heavy Weapon (Half) | (implicit) | ✔ explicit | RT lists as own action |
| Called Shot | (implicit) | ✔ (Full, −20) | RT formalizes as full action |
| Charge (Full) | ✔ | ✔ | Same |
| Defensive Stance (Full) | ✔ (enemies −20 WS, no attack) | ✔ (extra Reaction; enemies −20 WS) | **RT version slightly stronger** |
| Delay (Half) | ✔ | ✔ | Same |
| Disengage (Full) | ✔ | ✔ | Same |
| Dodge (Reaction) | ✔ | ✔ | Same |
| Feint (Half) | ✔ | ✔ | Same |
| Focus Power | ✔ | ✔ | **Mechanics differ** — see Psychic Powers |
| Full Auto Burst (Full) | ✔ | ✔ | Same |
| Grapple | ✔ (Full) | ✔ (Half/Full split) | RT lets you act on a grapple as a Half |
| Guarded Attack (Full) | ✔ | ✔ | Same |
| Jump/Leap (Full) | ✔ | ✔ | Same |
| Knock-Down (Half) | ✔ | ✔ | Same |
| Manoeuvre (Half) | ✔ | ✔ | Same |
| Move (Half/Full) | ✔ | ✔ | Same |
| Multiple Attacks (Full) | ✔ | ✔ | Same |
| Overwatch (Full) | ✔ | ✔ | Same |
| Parry (Reaction) | ✔ | ✔ | Same |
| Ready (Half) | ✔ | ✔ | Same |
| Reload (varies) | ✔ | ✔ | Same |
| Run (Full) | ✔ | ✔ | Same |
| Semi-Auto Burst (Full) | ✔ | ✔ | Same |
| Stand/Mount (Half) | ✔ | ✔ | Same |
| Standard Attack (Half) | ✔ | ✔ | Same |
| Stun (Full) | ✔ | ✔ | Same |
| Suppressing Fire (Full) | ✔ | ✔ | Same |
| **Tactical Advance (Full)** | **✔** | ✘ | **DH only** — RT dropped this from the standard action list |
| Use a Skill | ✔ | ✔ | Same |

**Damage workflow is identical** in both games:
1. Roll to hit (BS/WS test) + modifiers
2. Roll location (reversed-digit d100 in DH, look-up table in RT — same hit location table)
3. Roll damage, add SB (melee) or weapon profile
4. Target subtracts Armour (after Pen) + TB
5. Excess over Wounds = Critical Damage, consult Critical chart by location + damage type
6. **Righteous Fury** (10 on damage die triggers a second to-hit roll for critical effect) — identical in both

**VTT impact:** Combat automation is essentially portable. Strip the Tactical Advance action; add explicit Brace Heavy Weapon and Called Shot as standalone actions; relax Grapple from Full-only to Half/Full.

---

## 9. Weapons (Mostly portable)

Weapon profile fields are identical: **Name, Class, Range, RoF (S/Semi/Full), Damage, Damage Type, Penetration, Clip, Reload, Special Qualities**. Most DH weapons appear in RT with identical or very similar profiles.

### Weapon Qualities — identical set in both
Accurate, Balanced, Blast(X), Defensive, Flame, Flexible, Inaccurate, Overheats, Power Field, Primitive, Recharge, Reliable, Scatter, Shocking, Smoke, Snare, Tearing, Toxic, Unbalanced, Unreliable, Unstable, Unwieldy.

### RT additions
- **Customised** quality (½ reload time)
- More Exotic weapons (xenos tech, archeotech)
- Some weapons get cleaner availability ratings tied to Profit Factor rather than Throne cost
- **Weapon Upgrades** list expanded with **Mono, Motion Predictor, Photo-scope, Preysense-scope, Omni-scope, Overcharge Pack, Red-Dot Laser Sight, Silencer, Suspensors, Telescopic Sight, Vox Operated, Compact, Fire Selector, Forearm Weapon Mounting, Melee Attachment**

### Craftsmanship (identical)
| Tier | Cost Mult. | Availability Shift |
|---|---|---|
| Poor | ×½ | +1 step easier |
| Common | ×1 | — |
| Good | ×3 | −1 step (harder) |
| Best | ×10 | −2 steps |

**VTT impact:** Weapon database is highly portable. Replace `cost in Thrones` with `Availability + Craftsmanship` (the input to Acquisition tests). Expand the weapon-upgrade subsystem.

---

## 10. Economy: The Biggest Single Replacement

This is arguably the **largest rules swap** when porting a campaign.

### Dark Heresy: Thrones & Monthly Income
- Currency: **Throne Gelt** (Thrones)
- Each character has a **monthly income** by social class (Outcasts 20T → Nobility 500T)
- Rank up → income bumps
- **Buying equipment** = pay Throne cost; **Availability** modifies an Inquiry Test to find the item
- Per-item cost tables (lasgun, bolter, etc.)

### Rogue Trader: Profit Factor & Acquisition
- The **group** has a single **Profit Factor** (PF) representing wealth + influence + connections
- Starting PF: typically **20–60** depending on starting Ship Points roll
- To get something, make an **Acquisition Test**: 1d100 ≤ PF, modified by:
  - **Availability** (Ubiquitous +30 → Near Unique −50)
  - **Craftsmanship** (Poor +10 → Best −30)
  - **Scale** (Negligible/Trivial +30 → Vast −50)
- Profit Factor is **not consumed** by acquisitions — it's wealth-stature, not cash
- PF changes via **Awards** (+1, GM), **Endeavours** (the major engine), and **Misfortunes** (losses)
- **Commerce skill** can give a temporary ±2 PF per Degree of Success for a single haggle

### Acquisition Modifier table (RT, summary)

| Availability | Modifier |
|---|---|
| Ubiquitous | +30 |
| Abundant | +20 |
| Plentiful | +10 |
| Common | +0 |
| Average | −10 |
| Scarce | −20 |
| Rare | −30 |
| Very Rare | −40 |
| Extremely Rare | −50 |
| Near Unique | −60 |
| Unique | −70 |

(Craftsmanship and Scale modifiers stack with the above.)

**VTT impact:**
- Remove per-character Thrones tracker (or repurpose as a flavor field for small-coin RP).
- Add a **group-level Profit Factor** field with audit log (Awards/Endeavours/Misfortunes).
- Convert all item shop interfaces: drop price-in-Thrones, surface **Availability + Craftsmanship** as the Acquisition modifier inputs.
- Build an **Acquisition Test macro** that takes Availability/Craftsmanship/Scale and rolls vs. PF.
- Add **Commerce-Skill haggle** modifier flow.

---

## 11. Psychic Powers: Engine Replaced (DH→RT)

This is the **second-largest porting effort**. The mechanic is genuinely different.

### Dark Heresy psychic mechanic
- Psy Rating in DH was a measure of XP-earned power level; not used as a multiplier the way RT uses it.
- Each power has:
  - **Threshold (PT)**: the score the Psyker must reach to manifest
  - **Focus Time** (Half/Full)
  - **Sustained** (yes/no)
  - **Range**
  - **Overbleed** (bonus effects for exceeding the Threshold)
- **Manifest a power**: roll **Focus Power** action = 1d10 + Willpower Bonus + Power-Roll bonuses (Discipline Focus, talents, etc.) — must meet/exceed Threshold
- **Doubles on the roll = Psychic Phenomena**; severe = Perils of the Warp
- **Discipline Mastery**: learn 10 powers of a Discipline → reduce all that Discipline's PTs by 5
- Disciplines: Biomancy, Divination, Pyromancy, Telekinetics, Telepathy
- Plus **Minor Psychic Powers** (tricks)

### Rogue Trader psychic mechanic
- Each psyker has a **Psy Rating (PR)**, ranging typically 1–8+
- Three **Psychic Strengths**:
  - **Fettered** (½ PR, rounded up — but **no Psychic Phenomena**)
  - **Unfettered** (full PR — Phenomena on doubles)
  - **Push** (PR +1 to +3 — Phenomena on **any** roll, Perils more likely)
- **Focus Power Test**: a Willpower (or Psyniscience, or Opposed Willpower) percentile test — pass to manifest the power
- Power effects **scale by Psy Rating**: ranges are typically `Xm × PR` or `Xkm × PR`, damages are `1d10 + PR`, etc.
- **Disciplines**: Biomancy, Divination, Telekinesis, Telepathy (+ Pyromancy and others)
- Each Discipline has a **Basic Technique** plus a **Technique Tree** of advanced techniques bought with XP
- **Discipline Mastery**: 8 techniques in one Discipline → +1 PR for all Fettered uses of that Discipline
- **Psychic Phenomena** and **Perils of the Warp** tables still exist; Phenomena rolls add penalties at higher techniques (e.g., +10 for using Divining the Future)

### Official conversion notes (printed in the RT core book)
- Psychic Techniques and Psychic Powers are treated as the same for talents like **Resistance (Psychic Powers/Techniques)**
- **Psy Rating is Psy Rating** — crosses over exactly
- **For every +4 Threshold in DH, lower Psy Rating by 1 in RT** when converting a specific power
- Bonuses to **Power Rolls** in DH become **+5 to Focus Power Tests** in RT per +1 of bonus
- DH Psyker Type (Sanctioned/Renegade) maps directly to RT Fettered/Unfettered/Push framework

**VTT impact:**
- Replace the Power Roll widget (1d10 + WP Bonus vs. Threshold) with a Focus Power Test widget (percentile vs. WP or Psyniscience).
- Add the Psychic Strength toggle (Fettered/Unfettered/Push) per cast.
- Re-implement power scaling formulas keyed off the character's PR.
- Maintain the Psychic Phenomena and Perils of the Warp tables (still relevant) but update trigger conditions.
- Disciplines and technique trees need a tree-progression UI in RT that DH didn't require.

---

## 12. Insanity & Corruption (Identical)

The Insanity Track and Corruption Track work the same way in both games:
- **Insanity Points** (IP) accrue from Fear, witnessing horrors, certain psychic effects
- Every 10 IP → **Mental Trauma Test** (Willpower, mods by total IP)
- Failed → roll on Mental Traumas table
- Crossing IP thresholds → permanent **Mental Disorder** (Minor → Severe)
- 100 IP = character removed (irrevocably mad)

- **Corruption Points** (CP) accrue from warp exposure, sorcery, daemons, blasphemous lore
- Corruption Track: Tainted (0 modifier) → Soiled (−10) → Debased (−20) → Profane (−30) → **Damned at 100** (character removed)
- Every 10 CP → **Malignancy Test** (Willpower with track modifier); on failure roll Malignancy
- Mutation tests trigger at Soiled, Debased, Profane

**Removing IP**: 100 xp per IP removed, with GM-narrated in-game justification (prayer, palliative care, etc.).

**VTT impact:** No changes — the IP/CP trackers and tables port over verbatim.

---

## 13. Fear & The Shock Table (Identical)

Same Fear Test mechanic (Willpower test modified by Fear Rating; failure → roll on Shock Table). Fear Ratings 1 (Disturbing) through 4 (Terrifying). DH and RT use the **same Shock Table**.

**Sanity-immunity by IP**: a character with **double or more** the first digit of his IP score relative to a thing's Fear Rating is unaffected. (e.g., 21 IP → immune to Fear 1 sources.) Identical in both.

---

## 14. Career Paths: Wholesale Replacement

### Dark Heresy careers (8)
Adept, Arbitrator, Assassin, Cleric, Guardsman, Imperial Psyker, Scum, Tech-Priest

### Rogue Trader careers (8)
Arch-militant, Astropath Transcendent, Explorator, Missionary, Navigator, Rogue Trader, Seneschal, Void-master

### Differences in advancement
- **DH**: Each career has its **own unique XP thresholds for Ranks** (Cleric: Novice 0–499 → Hierophant 10,000–14,999, etc.); rank names are flavorful (Novice, Initiate, Priest, Preacher, etc.).
- **RT**: All careers use a **single unified Rank table**:

| Rank | XP Range |
|---|---|
| 1 | 5,000–6,999 |
| 2 | 7,000–9,999 |
| 3 | 10,000–12,999 |
| 4 | 13,000–16,999 |
| 5 | 17,000–20,999 |
| 6 | 21,000–24,999 |
| 7 | 25,000–29,999 |
| 8 | 30,000–34,999 |

- **Both** use the **Simple/Intermediate/Trained/Expert** characteristic advance progression (`100/250/500/750/1000/2500` xp depending on the career's affinity for that stat). Buying advances is cumulative.

**VTT impact:**
- Career list is fully replaced.
- Replace per-career rank tables with one unified RT rank table.
- Rebuild each career's Skill/Talent advance tree (the per-rank acquisition menu) for the 8 RT careers.

---

## 15. Special Career Abilities (RT)

Unlike DH careers (where role flavor was mainly Skills/Talents), RT careers each have **named special abilities** that activate without spending XP:

| Career | Signature Ability |
|---|---|
| Arch-militant | Combat reroll specializations |
| Astropath Transcendent | Soul-Bound: WP bonus vs. daemonic Willpower, +d10 roll-and-discard on Perils |
| Explorator | Mechanical mastery and Tech-Use specialties |
| Missionary | Pure Faith / Unshakeable Faith |
| Navigator | Lineage Boons, Mutations, Warp Eye powers |
| Rogue Trader | **Renowned Warrant** Talent, Air of Authority |
| Seneschal | **Seeker of Lore** — spend Fate Point for auto-success on Ciphers/Lore/Logic; bonus DoS on Commerce/Inquiry/Evaluate |
| Void-master | Mastery of Space / Gunnery / Augurs / Small Craft (pick one — re-roll failed tests with that subsystem) |

**VTT impact:** Add a per-character "Special Ability" field on the sheet. Provide macros/buttons for the auto-success/reroll abilities.

---

## 16. NEW SYSTEM: Starships (entirely new in RT)

DH has **no starship rules**. RT introduces a full subsystem:

### Ship as a character
- **Hull** (Transport, Raider, Frigate, Light Cruiser, Cruiser) — provides Space capacity
- **Plasma Drives** — provide Power
- **Components**:
  - Essential: Hull, Plasma Drives, Warp Drive, Void Shields, Geller Field, Life-Sustainer, Crew Compartments, Bridge, Sensors
  - Supplemental: Macrobatteries, Lances, Cargo Holds, Passenger Compartments, Augmented Retro-thrusters, Reinforced Bulkheads, Armour Plating, Armoured Prow, Tenebro-Maze, Extended Supply Vaults, Munitorium, Temple-shrine, Librarium Vault, Trophy Room, Observation Dome, Murder-Servitors, etc.
- **Ship Stats**: Speed, Manoeuvrability, Detection, Hull Integrity, Armour, Turret Rating, Void Shields, Crew Population, Morale, Weapon Capacity

### Acquiring a ship
- Ships are bought with **Ship Points** at character creation (rolled with starting Profit Factor)
- After play, additional Components or whole new ships acquired via PF Acquisition Tests with specialized **Hull Modifier** penalties (Component cost in SP becomes Acquisition penalty)

### Starship combat
- **Strategic Rounds** (~30 minutes of in-fiction time)
- **Void Units (VU)** for spatial measurement (~10,000 km each)
- Each ship's Turn: one **Manoeuvre Action** + one **Shooting Action**, plus any number of **Extended Actions** by other crewmembers
- **Manoeuvre Actions** (Adjust Bearing, Adjust Speed, Adjust Speed & Bearing, Come to New Heading, Disengage, Evasive Manoeuvres) — all are **Pilot (Space Craft) + Manoeuvrability** combined tests
- **Shooting Actions** — Macrobatteries (volume of hits) and Lances (cleaner armor-piercing) work differently; macrobattery hits are reduced by Void Shields and Armour
- **Extended Actions**: Active Augury, Aid the Machine Spirit, Disinformation, Emergency Repairs, Flank Speed, Focused Augury, Hail the Enemy, Hit and Run, Hold Fast!, Jam Communications, Lock on Target, Prepare to Repel Boarders!, Put Your Backs Into It!, Triage
- **Ramming and Boarding** rules
- **Critical Hits chart** (Holed, Internal Damage, Sensors Damaged, Thrusters Damaged, Fire!, Engines Crippled, Surly Techsprites, etc.)
- **Crippled ships** (0 Hull Integrity) take Crits whenever damage exceeds Armour
- **Crew Population**, **Morale**, **Hull Integrity** all tracked as separate damage tracks

### Component installation
- Spacedock or forge-world stardock required for installation; takes 3 weeks at a basic world, half that at a Hive World shipyard
- Components require both **Space** and **Power**; Plasma Drives provide Power, Hull provides Space

**VTT impact:** This is the largest **new subsystem** to build. Required additions:
- Group-owned **Ship Sheet** (separate entity from PC sheets)
- Space/Power budget tracker
- Component database with Space/Power/SP cost
- Hull Integrity, Morale, Crew Population tracks
- VU-based positional tracker (or abstracted distance bands)
- Starship action automation (Pilot + Manoeuvrability combined skill, Lance vs. Macrobattery damage flows)
- Crit chart for the ship
- Boarding Action subsystem (opposed Command Tests scaled by Crew Population / Hull Integrity / Turret Rating)

---

## 17. NEW SYSTEM: Endeavours (RT-only)

Endeavours are the **primary way Profit Factor grows**. They're structured multi-session goals:
- Types include **Exploration, Trade, Military, Criminal, and Creed** endeavours
- An Endeavour breaks into Objectives → individual missions
- Completion awards **Profit Factor** (typically +1 to +5 per completed Endeavour, scaled by ambition)
- **Misfortunes** can subtract PF

DH has nothing comparable; Acolytes earn Throne stipends and ad-hoc XP but no group-wealth meta-track.

**VTT impact:** Optionally implement an Endeavour Journal interface (text fields, objective checkboxes, PF award buttons). At minimum, surface the **Profit Factor audit log**.

---

## 18. NEW SYSTEM: Exploration Challenges (RT-only)

Group-test framework where multiple Skill Tests across the party accumulate (or lose) **Degrees of Success** toward a shared target. Each success makes the next test easier (or failure makes it harder). Used for things like tracking a signal across a planet, navigating a hazardous warp route, etc.

**VTT impact:** Optional. Can be tracked manually on a shared note; or built as a small "challenge tracker" widget with degree-of-success counters and a difficulty pip.

---

## 19. Fear, Insanity & Corruption Sources (Setting Differences)

The mechanics are identical, but **Rogue Trader places more emphasis on**:
- **Warp travel exposure** (long stretches in the immaterium accrue both IP and CP risk)
- **Xenos encounters** as a regular source of Fear/Corruption
- **Heirloom items** (artefacts of dynasty, can carry Corruption)
- **Daemonic engagements at scale** (boarding actions and starship-scale daemonic incursions)

DH skews more toward **investigation horror** (cults, mutants, heresies, hive nightmares).

**VTT impact:** Reskinning of source tables only; mechanics unchanged.

---

## 20. Renown / Reputation

- **DH**: handled informally via Inquisitor relationships and the **Peer / Good Reputation** Talents.
- **RT**: Profit Factor itself doubles as **reputation/influence** — used in **Influence Tests** (Opposed PF rolls vs. other Imperial powers) for things like winning the favour of a Noble House.

**VTT impact:** Add an **Influence Test** macro (Opposed Profit Factor 1d100 vs. target's PF, degrees of success grant +5 per to follow-up Interaction tests).

---

## 21. Starting Equipment Model

### DH
- Career grants a fixed starting kit at no cost
- Additional gear purchased with starting Thrones (career-determined)

### RT
- Career grants a fixed starting kit (often with `best-/good-/common-Craftsmanship` choice nodes)
- Each Explorer makes **one Acquisition Test at +0** during Stage 6 to grab one extra item
- Plus all the **Heirloom Items** rolled on the Pride Motivation chart, etc.

**VTT impact:** Replace "starting Thrones" wallet with a "one free Acquisition" button at character finalization.

---

## 22. Movement, Falling, Carrying, Environmental Hazards (Identical)

All carry-weight, fall-damage, suffocation, fire, blood-loss, and treacherous terrain rules are the same. The same falling damage table, suffocation/drowning rounds, fire-extinguishing rules, vacuum exposure tables apply. Even narrative-movement scales (Half / Full / Charge / Run + Run Mods) are identical.

**VTT impact:** No changes.

---

## 23. NPC / Adversary Stat Blocks (Identical Structure)

Both games use the same NPC stat block format: WS / BS / S / T / Ag / Int / Per / WP / Fel; Movement; Wounds; Skills; Talents; Traits; Armour; Weapons; Gear. **Traits** (Daemonic, Fear, Natural Armour, Natural Weapons, Unnatural [Characteristic], Toxic, Warp Instability, etc.) are the same.

**VTT impact:** NPC import format is portable. Some RT-specific Traits (Hoverer, Burrower, Phase, etc.) may need to be added if not already present.

---

## 24. Summary Checklist for the VTT Porter

### Reusable as-is (~80%)
- d100 resolution, degrees of success, opposed tests
- Nine Characteristics + bonuses
- Skill list (with minor additions)
- Talent list (with minor additions)
- Wounds + Critical Damage by location + type
- Weapon profile format + qualities
- Armour + Craftsmanship
- Combat actions (with minor edits)
- Insanity & Corruption tracks
- Fear & Shock Table
- Falling, suffocation, environmental hazards
- NPC stat block format

### Edit / Add
- **Character creation wizard** → multi-stage Origin Path
- **Starting XP** → 5,000 (4,500 pre-spent + 500 discretionary)
- **Wounds formula** → switch from career table to HomeWorld formula
- **Fate Points distribution** → HomeWorld-based
- **Career list** → replace 8 DH careers with 8 RT careers
- **Rank XP thresholds** → unified table
- **Career special abilities** → new field
- **Skill specialties** → add Pilot (Space Craft), Trade (Voidfarer/etc.), Common Lore (Koronus Expanse/Rogue Traders)
- **Weapon Training** → add Universal-tier groups
- **Combat actions** → drop Tactical Advance, formalize Brace/Called Shot, relax Grapple
- **Economy** → replace Thrones/income with Profit Factor + Acquisition Tests
- **Psychic system** → replace Power Roll mechanic with Psy Rating + Focus Power Test + Fettered/Unfettered/Push

### Build New
- **Profit Factor tracker** (group-level)
- **Acquisition Test macro** (Avail. + Crafts. + Scale → roll vs. PF)
- **Commerce haggle modifier flow**
- **Starship sheet** (separate entity) with Hull, Components, Space/Power budget
- **Starship combat** (Strategic Rounds, VU positions, Manoeuvre/Shooting/Extended actions)
- **Ship Critical Hit chart**, Crew Population / Morale / Hull Integrity damage tracks
- **Boarding Action** opposed-Command flow
- **Influence Test** (Opposed PF) macro
- **Psychic Strength toggle** (Fettered/Unfettered/Push) and updated Phenomena/Perils trigger logic
- **Endeavour Journal** (optional)
- **Exploration Challenge** tracker (optional)

### Conversion utilities to consider
- DH → RT Psy Rating converter: `RT_PR ≈ DH_PsyRating; for each Threshold, RT_PR ≈ ceil((max_Threshold - 4) / 4)` (rough heuristic from the RT designer's note: −1 PR per +4 Threshold)
- DH Power Roll bonuses → RT Focus Power Test: `+1 bonus = +5%`
- DH career → roughly equivalent RT career suggestions (for migrating PCs): Imperial Psyker → Astropath Transcendent; Tech-Priest → Explorator; Cleric → Missionary; Adept → Seneschal; Guardsman → Arch-militant; Scum → Void-master or Arch-militant; Assassin → Arch-militant (Void-master if pilot/gunner-focused); Arbitrator → Seneschal or Rogue Trader

---

## 25. References

- **Dark Heresy Core Rulebook** (1st Edition), Fantasy Flight Games / Black Industries — Character creation pp. 12–37; Skills pp. 95–108; Talents pp. 109–122; Armoury pp. 123–155; Psychic Powers pp. 156–180; Playing the Game pp. 181–216; Insanity/Corruption pp. 232–241.
- **Rogue Trader Core Rulebook**, Fantasy Flight Games — Character Creation pp. 11–34; Career Paths pp. 35–73; Skills pp. 73–88; Talents pp. 89–108; Armoury pp. 109–155; Psychic Powers pp. 156–181; Starships pp. 182–229; Playing the Game pp. 230–284; Game Master pp. 285–299.
- **DH→RT Conversion Notes**: RT Core, p. 34 (Dark Heresy Characters and Rogue Trader) and p. 181 sidebar (Psychic Powers in Rogue Trader and Dark Heresy).

---

*Document version: 1.0 — VTT-porter focused mechanical delta between Dark Heresy 1E and Rogue Trader.*
