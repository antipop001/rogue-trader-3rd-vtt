# Rogue Trader 3rd Edition (Foundry VTT)

Unofficial Foundry VTT system for **FFG's Rogue Trader 1e** content using **Dark Heresy 2nd Edition mechanics** as its rules base. The "3rd Edition" in the name refers to the system iteration, not a game edition — there is only one printed RT edition.

Forked from mrkeathley's Dark Heresy 2 system. Authored by MortarionUA. Compatible with Foundry VTT v12–v14.

## Build

- `npm run build` — full build into `build/rogue-trader-3rd/`
- `npm run packs` — rebuild compendium `.db` files from `src/packs/*/[name].yml`
- `npm run watch` — gulp watch
- `npm run scss` — SCSS only

Compendium source-of-truth is the YAML files under `src/packs/<pack>/<pack>.yml`. The `.db` files (NeDB) are generated artifacts.

## Schema notes

Talent items use a DH-2e-inspired schema (`aptitudes`, `tier`, `prerequisites`, `benefit`, `cost`, plus `description`/`source`) — but the *content* now reflects RT 1e talents, which don't natively have aptitudes/tiers. Convention in this repo: `aptitudes: ''` and `tier: '1'` for RT-sourced talents. The `tier` field is currently not consumed by any sheet code.

Weapon items: `class` (Pistol/Basic/Heavy/Melee/Thrown), `type` (Bolt/Las/SP/Melta/Plasma/Flame/Chain/Power/Shock/Primitive/Exotic/Launcher), `damage`, `damageType` (Energy/Explosive/Impact/Rending), `penetration`, `range` (m), `rateOfFire: {single, burst, full}`, `clip: {max, value}`, `reload`, `special: {accurate, balanced, blast, ...}`, `weight`, `availability`, `craftsmanship`.

Armour items: `armourPoints: {head, leftArm, rightArm, body, leftLeg, rightLeg}`, `maxAgility`, `type` (Primitive/Basic/Carapace/Power/Field/Other), `weight`, `availability`.

Item type registry is in `src/template.json`.

## Compendium canon (as of 2026-05-13)

The `talents`, `weapons`, and `armour` packs were rebuilt to contain **only** content from:

1. FFG **Rogue Trader Core Rulebook** (2009)
2. **Into the Storm** supplement
3. **Rogue Trader Living Errata v1.4**

Errata corrections are baked into the data; affected entries note the change in their description/source field. Items from other supplements (Hostile Acquisitions, Faith and Coin, Edge of the Abyss, etc.) and any DH-2e-only items have been removed from these three packs.

Data was extracted from the user's NotebookLM RT notebook (`cd87d917-4cea-45b3-b27c-a149070b1826`). Stats came from OCR'd PDFs via NotebookLM JSON-formatted queries — expect occasional minor transcription errors and spot-check before relying for play.

Counts:
- `talents.yml` — 195 (170 corebook + 25 Into the Storm)
- `weapons.yml` — 202 (104 corebook + 98 Into the Storm)
- `armour.yml` — 42 (22 corebook + 20 Into the Storm, includes force fields)

Build scripts that generated each YAML live at `/tmp/build_talents.py`, `/tmp/build_weapons.py`, `/tmp/build_armor.py` (with intermediate JSON in `/tmp/rt_data/`). These are not committed — if the data needs to be regenerated, re-query NotebookLM and rebuild.

## Not yet done

### Other packs still mixed-source
The following packs were **not** touched in the talents/weapons/armour rebuild and still contain a mix of DH-2e, other supplements, and possibly stale entries:

- `ammo` — special ammunition variants
- `aptitudes` — DH-2e-only concept; whole pack may be removable if going pure RT 1e
- `cybernetics` — RT calls these "Bionic Replacements"
- `psychic-powers` — RT has its own psychic discipline structure (Telepathy/Telekinesis/Divination/Biomancy/Pyromancy) plus Navigator powers and Astropathic Choirs
- `tools` — general gear; needs cross-referencing with RT Chapter V "Gear"
- `traits` — creature/character traits; should align with RT corebook traits chapter
- `weapon-mods` — RT weapon upgrades on pp. 133–135 of corebook + Into the Storm Ch.III
- `consumables` — drugs, stimms, medical supplies, food, etc.
- `attack-specials` — special weapon qualities (Tearing, Flame, etc.); the canonical list lives in RT corebook pp.142–145
- `tables` — lookup tables; depends on the system code's usage

### Known gaps in the rebuilt packs

**Talents:**
- Page numbers all collapse to `Rogue Trader Core Rulebook` without page (NotebookLM didn't extract per-talent pages reliably). Could be filled in with a targeted re-query.
- Three Into-the-Storm Traits were excluded (Lostok Augmentation, Instinctual Understanding, Shamanic Powers, Sanctioned Xenos) — they belong in `traits`, not `talents`.
- A handful of corebook benefit texts were filled in from general knowledge where the OCR was truncated: Psy Rating, Rite of Fear, Frenzy (partial), Catfall (tail), Luminen Shock (middle), Unarmed Warrior (middle), Swift Attack (tail). Verify against the printed book.

**Weapons:**
- `special` is stored as boolean flags only — quality parameters are dropped (e.g. `Blast (3)` becomes `blast: true` with no radius). The description field preserves the original text. If automation needs the parameter, the schema needs extending.
- Special-quality keyword matcher in `/tmp/build_weapons.py` is fuzzy (substring match) — rare qualities like Spray, Snare, Sanctified, Force, Volatile may not be recognized and silently dropped from the `special` object. Re-check against descriptions if writing automation.
- "Bomb Squig" / "'Sploding Squig" stats are weird-by-design; sanity-check.
- ItS page numbers for some entries (Bolter Cane p.100, Wrath Plasma Pistol p.101) may be off — ItS Extended Armoury runs roughly pp.108–146.

**Armour:**
- Force fields encode Protection Rating only in `description` — the schema has no dedicated field. If the sheet/automation needs PR, add a `protectionRating` field to the `armour` template.
- Field overload chances reference "Table 3-10" in description but the table itself isn't in the pack.

### Errata not yet applied
The errata document was queried for talent and armor changes. **Weapon errata was queried inline during stat extraction**, but the comprehensive errata sweep should also be applied to:
- Ammo (e.g. Backpack Ammo Pack/Power Pack clarification on p.135 of errata)
- Career advance tables (errata adds/removes talents from career schedules — not relevant to compendium content but matters for character creation rules)
- Starship components (Excess Void Armour, Overload Shield Generators, Null Bay — if/when ship-component packs are built)

### Validation not performed
- The generated YAML has not been built into `.db` form via `gulp packs` — verify it round-trips without errors.
- The system has not been loaded in Foundry to confirm sheets render correctly with the new data.
- No diffing was done against the prior compendium to verify which items players in active games might lose access to (i.e. characters referencing removed items).

## Source-of-truth conventions

- For RT corebook entries: `source: "Rogue Trader Core Rulebook, p.XX"` (or no page if not extracted).
- For Into the Storm entries: `source: "Into the Storm, p.XX"`.
- Page numbers come from NotebookLM; some are approximate where the OCR was poor.

---

## 2026-05-13 — System audit findings ("what needs correction for a workable RT")

A read-only audit of the code + schema + packs against the DH2→RT mechanical-delta reference (`DH2_to_RT_Mechanical_Changes.md`). The repo's *content* in talents/weapons/armour was rebuilt for RT, but the *engine* is largely an unmodified DH2 fork. Below are concrete drift points to fix.

### A. Combat-action modifiers (drift from DH2) — `src/module/rules/combat-actions.mjs`

The hardcoded action table still carries DH2 numbers. Six values need flipping to RT 1e:

| Action | Current (DH2) | RT 1e | Line |
|---|---|---|---|
| All Out Attack | +30 WS | **+20 WS** | 92 |
| Charge | +20 WS | **+10 WS** | 116 |
| Full Auto Burst | −10 BS | **+20 BS** | 156 |
| Semi-Auto Burst | 0 BS | **+10 BS** | 226 |
| Delay | type `['Full']` | type **`['Half']`** | 127 |
| Guarded Action | type `['Half']` | type **`['Full']`** | 167 |

Also: `Tactical Advance` (lines 268–273) is DH2-only — RT has no such action; remove it. `Evasion` (line 137) is the unified DH2 Reaction — RT splits this into separate Dodge and Parry Reactions (Parry is **not** a skill in RT, it uses WS directly).

### B. Characteristic + skill schema (`src/template.json`)

- **`characteristics.influence`** (lines 99–107) is the DH2 10th characteristic. RT has 9 characteristics and uses a **group-wide Profit Factor** instead. Action: remove `influence` from `base.characteristics`, add a `system.profitFactor` field at the warband/group level (a Party actor, a world setting, or an `acolyte` field that the GM treats as shared).
- **Skill list is hybrid DH2/RT**: it keeps DH2's consolidated `athletics`, `stealth`, but uses RT-style sub-specialties on `operate` (Surface/Walkers/Aeronautica/Voidship) and `navigate` (Surface/Stellar/Warp). For pure RT 1e, the canonical skill list is the DH1/RT split (Pilot, Drive, Search separate from Awareness, Concealment + Silent Move + Shadowing instead of Stealth, etc.). Current state is workable but unfaithful to RT; document the deviation or rewire.
- **`parry`** is defined as a skill (line 483). In RT 1e, Parry is a Reaction (WS test, no separate skill ranks). Either drop the skill or document it as a deliberate DH2-style extension.
- **`acolyte.aptitudes`** (line 808) — DH2-only concept. RT uses Career advance tables. The whole aptitude system is dead weight here.
- **`acolyte.bio`** has `homeWorld`/`background`/`role`/`elite`/`divination` — DH2's 3-axis creation. RT uses Origin Path (Home World → Birthright → Lure of the Void → Trials and Travails → Motivation → Career). No Origin Path fields exist.
- **Specialties drift**: skill specialty lists like `commonLore` (Faith/Fleet/Imperium/Koronus Expanse/Military/Tactics/Tech/Underworld) are partially RT-flavored already — good direction, but cross-check against the corebook's exact specialty list.

### C. Aptitudes system is baked into character data path

- `src/module/documents/acolyte.mjs:57` exposes `get aptitudes()`.
- `src/module/rules/homeworlds.mjs`, `roles.mjs`, `backgrounds.mjs` all carry DH2 aptitude pairs (Offence/Finesse/Defence/Psyker/Tech/Knowledge/Leadership/Fieldcraft/Social) for every entry.
- `src/packs/aptitudes/aptitudes.yml` contains 19 aptitude entries.
- For RT this entire pipeline should either be removed or replaced with Career-rank advance tables (Arch-militant, Astropath Transcendent, Explorator, Missionary, Navigator, Rogue Trader, Seneschal, Void-master).

### D. Character creation rules (DH2 lists, not RT)

- `src/module/rules/homeworlds.mjs` — entries are DH2 (Feral, Forge, Highborn, Hive, Shrine, Voidborn). RT 1e uses: Death World, Forge World, Frontier World, Highborn, Hive World, Imperial World, Schola Progenium, Shrine World, Void Born. No RT homeworlds are present.
- `src/module/rules/backgrounds.mjs` — DH2 Backgrounds (Adeptus Administratum, Arbites, Astra Telepathica, Mechanicus, Ministorum, Imperial Guard, Outcast). RT has no "Background" concept; closest equivalent is the Birthright/Lure/Trials/Motivation chain.
- `src/module/rules/roles.mjs` — DH2 Roles (Assassin, Chirurgeon, Desperado, Hierophant, Mystic, Sage, Seeker, Warrior). RT replaces these with Careers (see above).
- `src/module/rules/divinations.mjs` — DH2 Emperor's Tarot divinations. RT does not use this mechanic.
- `src/module/rules/elite-advances.mjs` — DH2 elite advances. RT uses a different advance system.

### E. Compendium pack state (audit of all 13 packs)

| Pack | Items | Sourcing | State |
|---|---|---|---|
| `talents` | 195 | 170 RT Core + 25 ItS | **Clean** (per CLAUDE.md) |
| `weapons` | 202 | 104 RT Core + 98 ItS | **Clean** |
| `armour` | 42 | 22 RT Core + 20 ItS | **Clean** |
| `psychic-powers` | ~108 | **All DH2/DH2-supplement** (DH2, EBY=Enemies Beyond, EWI=Enemies Within, TNP, ToF) — zero RT-sourced | **Not converted.** Disciplines present: Telekinesis, Divination, Minor, Biomancy, Telepathy, Pyromancy, Chrono, Sanctic Daemonology, Malefic Daemonology, Void Frost, Astropath. Need: rebuild from RT corebook pp.156–181 (the 5 core disciplines), add Navigator powers, Astropathic Choirs. Daemonology/Chrono/Void Frost are DH2-supplement-only and should be dropped or relabeled. |
| `aptitudes` | 19 | DH2 | **Drop entirely** if going pure RT 1e (or leave as documentation-only). |
| `traits` | 41 | No `source:` field — unmodified DH2 fork | Most traits port to RT, but no RT-specific entries (Auto-Stabilised gun mount, Brute, Daemonic, From Beyond, Phase, Quadruped, Sanctioned, Stuff of Nightmares, Touched by the Fates — all present but unverified). Spot-check against RT corebook traits chapter. |
| `tools` | ~50 | No `source:` field | Mix of DH2 tools (Combi-tool, Auspex, Multi Compass, Glow-globe). Most overlap with RT gear (Ch.V) but not verified. |
| `weapon-mods` | ~35 | No `source:` | DH2 fork; RT weapon upgrades on pp.133–135 + ItS Ch.III need cross-check. |
| `consumables` | 13 | No `source:` | DH2 fork (Frenzon, Obscura, Recaf, Slaught, Spook, Stimm, Tranq) — most exist in RT but profiles may differ. |
| `cybernetics` | ~27 | No `source:` | DH2 fork. RT calls these **Bionic Replacements** and the corebook list is much shorter. Needs full rebuild from RT corebook. |
| `ammo` | ~30 | No `source:` | DH2-flavored. RT corebook has its own specialty ammo list. |
| `attack-specials` | ~35 | No `source:` | DH2-style weapon qualities. Most qualities are shared (Accurate, Balanced, Blast, Flame, Power Field, Tearing — though I don't see Tearing in the list) but `Force`, `Sanctified` profiles and parameter handling differ. RT-specific qualities like **Storm**, **Spray**, **Snare**, **Tangle**, **Volley**, **Boarding Action**, **Tearing** need verification. |
| `tables` | 3 (Psychic Phenomena, Perils of the Warp, Fear) | DH2 RollTables | Sparse. RT has many GM tables (Stars of Inequity systems, Endeavours, etc.) — none present. |

### F. Voidship subsystem — code exists, content missing

- Code: `src/module/documents/voidship.mjs` (161 lines), `src/module/sheets/actor/voidship-sheet.mjs` (88 lines), `src/module/rules/voidship-critical-damage.mjs` (346 lines), `src/module/rules/voidship-hit-locations.mjs`, `src/module/rules/ship-facings.mjs`, plus voidship panels in `src/templates/actor/panel/voidship-*.hbs`. Schema in `template.json` covers hull/armour/shields/crew/morale/troops/boarding/operator/weaponSlots.
- **No compendium content**: zero ship components, zero ship weapons, zero ship traits, zero hull profiles in any pack. Users must build every Plasma Drive, Warp Engine, Macrocannon, Lance, void shield, hull pattern by hand. The RT corebook Ch.VII (pp.182–229) defines ~80 components and ~30 weapons — needs a full content pass.
- Strategic Round / VU map / boarding action flow: prompts exist (`crew-prompt.mjs`, `ship-weapon-prompt.mjs`) but there's no explicit Strategic Round turn structure or VU positional tracking visible.

### G. Economy / acquisition

- No `profitFactor` field anywhere. No `acquisition` action/macro. RT uses a group-wide Profit Factor + Acquisition Test as its sole economy; this is unimplemented.
- The DH2 Influence + Requisition mechanic is *also* not coded — `influence` is just a characteristic with no associated test machinery. So in practice neither game's economy works automatically.

### H. Psychic mechanic — partial

- `src/module/rolls/roll-data.mjs:374-458` (PsychicRollData) supports a current-PR vs. max-PR delta with a +10/step bonus (loosely covers Fettered casting). There is **no explicit Fettered/Unfettered/Push toggle** and **no Phenomena/Perils trigger** (doubles on Push, etc.).
- Push caps differ: RT allows +3 (Sanctioned) and +4 (Unsanctioned) over PR; DH2 caps at +2 / +3. Neither is enforced.
- `psy.class` is a free-text string on the sheet rather than an enum (`bound`/`unbound`/`sanctioned`/`unsanctioned`).
- `pr` and `currentRating` are tracked, plus `sustained` count. Adequate for manual play; not a full automation.

### I. Other observations

- **Subtlety**: not present anywhere. Correct — it's DH2-only.
- **Reinforcement Characters**: not present. Correct.
- **NPC Threat Threshold**: `npc.threatLevel` field exists in template.json, but no encounter builder. Drop or leave as a flavor stat.
- **Endeavours / Exploration Challenges / Renown**: nothing in the codebase. These are RT systems with no current support.
- **Fate vs. Fate Threshold**: schema uses `fate.max` + `fate.value`, which works for both editions.
- **Aim** values (+10 Half / +20 Full) match RT.
- **Standard Attack** +10 matches RT.
- **Called Shot** −20 matches RT.

### J. Stale/branding things

- `system.json` describes the system as "Rogue Trader 3rd Edition system for Foundry VTT" — accurate, given the iteration-of-this-system naming convention.
- Many sheet class names still say `DarkHeresy*` (e.g. `DarkHeresyPsychicPowerSheet`, `DarkHeresyItemContainerSheet`) — purely cosmetic but reflects fork origin.
- Three uncommitted modifications: `src/packs/armour/armour.yml`, `src/packs/talents/talents.yml`, `src/packs/weapons/weapons.yml` — the canon-rebuilt content not yet committed.

### Bottom line

The repo is a **DH2 engine + RT-rebuilt talent/weapon/armour content**. To become a "good workable RT" system, three layers need attention, roughly in order:

1. **Combat math fixes** (action modifiers in `combat-actions.mjs`) — small file edits, high gameplay impact.
2. **Content gaps** in the un-rebuilt packs — most impactful: `psychic-powers` (entirely wrong source) and missing **ship components/weapons** for void combat.
3. **Schema/engine** — decide whether to keep the DH2 character-creation pipeline (Home World/Background/Role/Aptitudes) as a flavored layer, or rip it out for an RT Origin Path + Career advance-table model. This is the biggest call and the largest amount of work.

See `RT_CORRECTION_CHECKLIST.md` for a prioritized punch list.
