# Rogue Trader 3rd Edition (Foundry VTT)

Unofficial Foundry VTT system for **FFG's Rogue Trader 1e** content using **Dark Heresy 2nd Edition mechanics** as its rules base, progressively migrated to RT 1e canon mechanics. The "3rd Edition" in the name refers to the system iteration, not a game edition — there is only one printed RT edition.

Forked from mrkeathley's Dark Heresy 2 system. Authored by MortarionUA. Compatible with Foundry VTT v13–v14.

**Current version: 0.5.0** (released 2026-05-14). See https://github.com/antipop001/rogue-trader-3rd-vtt/releases/tag/0.5.0 for release notes. 0.5.0 closes the "everything before the A/B character-creation decision" punch list: damage-roll audit (Accurate now rolls 1d10 per 2 DoS instead of a flat modifier), ship-weapon damage now properly rolls 1d10 + listed Damage per hit (RT corebook p.215), 17 psychic-power attack-power damage fields now carry rollable formulas, ammo and Arms Coffer errata applied (v1.4 p.135/p.143), four corebook-OCR talent fill-ins corrected (Frenzy, Rite of Fear, Catfall, Unarmed Warrior), and the canonical RT Table 8-12 Critical Hits chart was added to the `tables` pack.

## Test environment (foundrySB)

Proxmox LXC for live-testing this system in Foundry.

| Property | Value |
|---|---|
| CTID | 211 (foundrySB) |
| IP | 192.168.11.36 |
| Foundry | v14.361 |
| Node.js | v24.15.0 |
| App path | /opt/foundry |
| Data path | /var/lib/foundrydata |
| Log | /var/log/foundry.log |
| URL | http://192.168.11.36:30000 |
| SSH | `ssh -i ~/.ssh/foundry_test project@192.168.11.36` |

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

## Compendium canon (as of 2026-05-14, version 0.4.0)

All 14 packs are sourced exclusively from:

1. FFG **Rogue Trader Core Rulebook** (2009)
2. **Into the Storm** supplement
3. **Rogue Trader Living Errata v1.4**

Errata corrections are baked into the data; affected entries note the change in their description/source field. Items from other supplements (Hostile Acquisitions, Faith and Coin, Edge of the Abyss, etc.) and any DH-2e-only items have been removed.

Data extraction now prefers local RT-DOCS markdown (see "Content extraction pipeline" below). NotebookLM (notebook `cd87d917-4cea-45b3-b27c-a149070b1826`) is the fallback for synthesis or image OCR.

Extraction scripts live in `/tmp/rt_ship/` during a working session (not committed). To regenerate a pack, re-run the corresponding script and rebuild.

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
- `special` flags now support parameter levels — e.g. `special.blast: 3` carries the Blast radius. Backfilled for the 33 Blast weapons from their descriptions. Other parameterized qualities (Snare/Concussive/Toxic/etc.) still need a targeted re-extraction pass; their flags are currently `true` with no level.
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

## Content extraction pipeline

Two sources for RT content; prefer the local one:

1. **`/mnt/project_data/RT/RT-DOCS/`** (local, fast — moved out of repo 2026-05-14) — pre-extracted markdown of CoreBook (split as `CoreBook-1-200.pdf/markdown.md` + `CoreBook-201-401.pdf/markdown.md`), Into the Storm, and Errata v1.4. Each PDF also has a `pages/page-N/` directory for per-page lookups. `grep` and direct `Read` work here, no API latency. Use this first for any new content pass.
2. **NotebookLM** (notebook `cd87d917-4cea-45b3-b27c-a149070b1826`) — only when you need synthesis across sources or the markdown OCR is too noisy for a specific extract. Auth via `nlm login --manual --file /home/ahermon/cookies.txt`; if `cookies.json` ends up corrupt, see `notebooklm_mcp_setup.md` memory for the flat-dict-rewrite fix.

### RT-DOCS quirks (learned the hard way)

- **CoreBook-1-200.pdf has descriptions only.** Tabular stat blocks were dropped by the PDF→markdown converter on pp.1–200. Hulls came through fine because their stats are in prose form, not tables.
- **CoreBook-201-401.pdf has the actual stat tables** as proper markdown tables (`| col | col |`). TABLE 8-3 (essential components), supplemental, weapons, archeotech, xenotech — all parseable. Same goes for ItS part 2.
- **Component stats live in part 2, descriptions in part 1** for early Ch.VIII components (drives, engines, shields, bridges). Any parser must search across both files.
- **Some section headers lose their `#` prefix** in conversion (e.g. macrobattery entries on p.202 appear as plain text). Plain-line fallback (name on its own line with blank lines around) works.
- **British/American spelling drift** appears between table cells and descriptive headers (Gellar/Geller, compartmentalised/compartmentalized). Build a spelling-variant matcher when name matching fails.

---

## 2026-05-13 — System audit findings ("what needs correction for a workable RT")

A read-only audit of the code + schema + packs against the DH2→RT mechanical-delta reference (`DH2_to_RT_Mechanical_Changes.md`). The repo's *content* in talents/weapons/armour was rebuilt for RT, but the *engine* is largely an unmodified DH2 fork. Below are concrete drift points to fix.

### A. Combat-action modifiers — DONE 2026-05-13 (commit c67c9ca) + 2026-05-14

All combat-action modifiers and types match RT 1e corebook Table 9-1 (pp.147-148):

- All Out Attack: +20 WS ✓
- Charge: +10 WS ✓
- Full Auto Burst: +20 BS, type Full ✓
- Semi-Auto Burst: +10 BS, type Full (fixed 2026-05-14 — the audit missed the type)
- Stun: -20 WS, type Full (fixed 2026-05-14 — the audit missed the type)
- Delay: type Half ✓
- Guarded Action: type Full ✓ (note: RT calls this "Guarded Attack" — name kept as "Guarded Action" for now to avoid breaking saved character data)
- Tactical Advance: removed (DH2-only) ✓
- Evasion split into Dodge (Ag) and Parry (WS) Reactions ✓

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
| `psychic-powers` | 79 | RT Core (39) + ItS (40) | **Clean as of 2026-05-13.** Rebuilt from RT corebook Ch.VI + Into the Storm + Errata v1.4. See "Psychic-powers rebuild" section below for breakdown and caveats. |
| `ship-components` | 73 | RT Core (48) + ItS (25) | **Clean as of 2026-05-14.** Essential, supplemental, archeotech, xenotech. |
| `ship-weapons` | 18 | RT Core (10) + ItS (8) | **Clean as of 2026-05-14.** Macrobatteries, lances, archeotech weaponry. |
| `ship-traits` | 34 | RT Core (28) + ItS (6) | **Clean as of 2026-05-14.** 14 hull patterns + 10 Machine Spirit Oddities + 10 Past Histories. Hulls embed full stat block in description (no `shipHull` item type). |
| `attack-specials` | 26 | RT Core (25) + ItS (1) | **Clean as of 2026-05-14.** All 25 corebook weapon qualities + ItS `Force`. |
| `weapon-mods` | 36 | RT Core (33) + ItS (3) | **Refreshed 2026-05-14.** Corebook weapon upgrades + ItS Ch.III additions (Calamity Vents, Exterminator Cartridge, Tox Dispenser). Some entries are craftsmanship sub-rules nested under parents — worth a manual review pass. |
| `ammo` | 12 | RT Core (3) + ItS (9) | **Refreshed 2026-05-14.** RT specialty rounds + ItS Ch.III Unusual Ammunition (Acid Shells, Airtorch Canister, Microburst Flask, Nephium Fuel Tank, Organgrinder Rounds, Snare Shells, Toxic Shot, Tracer Shells, Void Rounds). |
| `tools` | 77 | RT Core (47) + ItS (30) | **Refreshed 2026-05-14.** Clothing, void suits, gear, tools, equipment from corebook Ch.V + ItS Ch.III Gear/Tools (Aquila Magnificus, Targeting Monocle, Glidewing, Stasis Pod, Promethium, Psycrystal, etc.). |
| `consumables` | 29 | RT Core (21) + ItS (8) | **Refreshed 2026-05-14.** Drugs, stimms, recaf, sacred unguents + ItS additions (Blush, Ploin Juice, Raenka, Attention Spanner, Cold Fire, Spur, White Void, Wideawake). |
| `cybernetics` | 25 | RT Core | **Refreshed 2026-05-14.** Bionic Replacement Limbs + Implant Systems + Mechadendrites from corebook p.131+. |
| `traits` | 33 | RT Core | **Refreshed 2026-05-14.** Creature/character traits from corebook Ch.XIV — Auto-Stabilised, Bestial, Daemonic, From Beyond, Phase, Warp Instability, Mechanicus Implants, etc. Replaces the DH2 fork content. |
| `aptitudes` | — | DROPPED | **Removed 2026-05-14.** DH2-only concept; no RT 1e equivalent. Pack unregistered from system.json. |
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

### G. Economy / acquisition — DONE 2026-05-14

RT's group-wide Profit Factor + Acquisition Test (corebook p.270) is now implemented:

- **`profitFactor` world setting** (default 30) registered via `RogueTraderSettings`. GM-editable in the Configure Settings dialog. Use `RogueTraderSettings.getProfitFactor()` / `setProfitFactor()` to read or write programmatically.
- **`game.rt.acquisition()`** opens an Acquisition Test dialog with dropdowns for Availability / Craftsmanship / Scale (with per-tier modifiers baked in from `src/module/rules/acquisition.mjs`), an optional Commerce DoS bonus, and an extra modifier field. Rolls 1d100 vs `PF + mods` and posts a chat card with DoS/DoF.
- Modifier tables: AVAILABILITY_MODS (+30 Ubiquitous … −70 Unique), CRAFTSMANSHIP_MODS (Poor +10 … Best −30), SCALE_MODS (Trivial +30 … Vast −30) — verbatim from RT corebook p.270.

DH2 Influence + Requisition remains unimplemented (correct — RT uses PF instead).

**Sheet integration:** any item with an `availability` or `craftsmanship` field (weapons, armour, ammo, tools, etc.) now shows an "Acquire" button in its sheet header. Clicking it opens the Acquisition Test dialog with the item's name, availability, and craftsmanship pre-filled.

### H. Psychic mechanic — DONE 2026-05-14

`PsychicRollData` (src/module/rolls/roll-data.mjs:374) and `checkForPerils` (src/module/rolls/action-data.mjs:25) now implement RT 1e Fettered/Unfettered/Push behaviour:

- **`psy.strength` enum** on the actor sheet (`fettered` / `unfettered` / `push`) sets the default PR for the roll prompt — Fettered = ⌈rating/2⌉, Unfettered = rating, Push = rating + pushCap.
- **`psy.class` is a select** on the actor sheet (`sanctioned` / `unsanctioned` / `bound` / `unbound`). DH2 bound/unbound are kept as legacy aliases so existing actors don't break.
- **Push cap** (`PsychicRollData.pushCap` getter) — Sanctioned +3, Unsanctioned +4 per RT corebook.
- **Phenomena trigger:** Fettered (`pr < rating`) skips Phenomena entirely; Unfettered (`pr === rating`) triggers on doubles; Push (`pr > rating`) triggers on any non-doubles.
- The existing `+10 per step below max PR` bonus and `-10 per step above max PR` penalty are preserved (they were already correct).

Future work: auto-roll the Psychic Phenomena and Perils of the Warp tables (in `src/packs/tables/`) when phenomena trigger, instead of just flagging in chat.

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

### Psychic-powers rebuild (2026-05-13)

79 powers across 7 discipline tags:

| Discipline | Count | Source |
|---|---|---|
| Telepathy | 22 | Core 18 + ItS 4 |
| Telekinesis | 12 | Core 8 + ItS 4 |
| Divination | 12 | Core 9 + ItS 3 |
| Navigator | 18 | Core 9 + ItS 9 |
| Theosophamy | 7 | ItS only (sanctioned-psyker faith discipline) |
| Astropath Starship Action | 5 | ItS — ship combat actions, not strictly psychic powers |
| Navigator Starship Action | 3 | ItS — ditto |

**Important corrections to the earlier audit notes:**
- **RT corebook has only 3 player psyker disciplines** (Telepathy, Divination, Telekinesis), NOT 5. Biomancy and Pyromancy are DH2/supplement-only and were correctly absent from RT 1e — the prior CLAUDE.md/RT_CORRECTION_CHECKLIST.md text saying "5 core disciplines" was wrong.
- **Astropathic Choirs is a relay-assistance rule** (corebook p.162; Errata v1.4 raised max bonus from +5 to +10), not a purchasable power — not extracted as a compendium entry. The only Astropath-exclusive power is **Astral Telepathy** which is in the Telepathy discipline.

**Schema caveats (updated 0.5.0):**
- 17 attack powers now carry RT-canon Roll formulas in `damage` (e.g. `1d10+@pr`, `1d10+3*@pr`). The remaining 62 powers don't deal direct damage and keep `damage: 0`. WP-scaling powers (Lidless Stare, Scourge of the Red Tide) carry a base `1d10` and explain the WB/DoS scaling in description text.
- Navigator XP costs are `0` placeholders — RT Navigator powers are tied to Lineage talents/career advances, not flat XP. Worth a targeted re-query.
- `penetration: 99` is a sentinel for "Ignores Armour" (Psychic Scream).
- Errata corrections from v1.4 are baked into the descriptions (with `Errata:` prefix when an entry was modified).

## Documented deviations from RT 1e (preserved into 0.5.0)

These are deliberate carry-overs from the DH2 fork that are NOT being changed in 0.5.0. They're either tightly coupled to the A/B character-creation decision or low-priority cosmetic. Listed so future passes don't "rediscover" them as bugs.

1. **Parry is a skill, not just a Reaction.** `src/template.json:475` defines `parry` as a WS-based skill. RT 1e treats Parry as a Reaction (a WS test, no separate skill ranks). Keeping the skill lets characters spend XP advances on +10/+20/+30 Parry — useful as a house-rule extension, but unfaithful to RT.
2. **`athletics` and `stealth` are consolidated skills.** DH2 collapsed Climb/Swim into Athletics and Concealment/Silent Move/Shadowing into Stealth. RT 1e keeps them split. The current skills work; the names just don't line up with the corebook.
3. **DarkHeresy* sheet class names** (`DarkHeresyPsychicPowerSheet`, `DarkHeresyItemContainerSheet`, etc.). Purely cosmetic; renaming would touch many template files for zero functional gain. Defer.
4. **`npc.threatLevel` field exists but no encounter-budget tool consumes it.** DH2-only concept; RT relies on GM judgment. Field is harmless flavor data; will be removed if the A/B pass cleans `template.json`.
5. **Skill specialty lists drift from RT canon.** Audit (0.5.0): Common Lore 8 vs 14, Forbidden Lore 6 vs 11, Scholastic Lore 9 vs 16, Linguistics is a DH2 consolidation (RT splits into Speak Language + Literacy + Secret Tongue), Trade 10 vs 13. Changing these is a breaking schema migration (specialty keys are referenced by existing actors); deferred to the A/B pass so it can be done as one coordinated migration.
6. **Voidship critical-damage subsystem is homebrew.** `voidship-critical-damage.mjs` uses a Nonpenetrating/Penetrating/Critical × Component × 1d10 matrix that doesn't match RT 1e Table 8-12. The canonical RT table is now in the `tables` pack as two RollTables (`Critical Hits to Starships`, `Catastrophic Damage`) for manual GM use. The engine still uses the homebrew tables; replacing them would require rewriting `assign-damage-data.mjs` callers and is out of scope for 0.5.0.
7. **`getCriticalDamage` and voidship hit-location data** (Main/Prow/Bridge/Rear) describe which arc was hit *from* but are not the RT 1e Critical Hit table targets. See #6 above; documented for clarity.

### Bottom line (as of 0.5.0)

The repo is now a **DH2-derived engine with RT 1e mechanics + RT-canon content across all 14 compendia + canonical critical-hit RollTable + corrected damage rolling**. Three layers, two done:

1. **Combat math fixes** ✓ 2026-05-14. All 6 audit fixes plus 2 the audit missed (Semi-Auto Burst type, Stun type). Evasion split into Dodge/Parry. 0.5.0 added the Accurate fix (1d10 per 2 DoS, not flat).
2. **Content rebuild** ✓ 2026-05-14. ~890 entries across 15 packs. 0.5.0 added the canonical RT Critical Hits and Catastrophic Damage tables; the rest of the `tables` pack remains sparse (Stars of Inequity / Edge of the Abyss not local — would need re-extraction).
3. **Character creation Path A vs B** — **OPEN, next major decision**. The DH2 creation pipeline (Home World × Background × Role × Aptitudes) still ships in `src/module/rules/{homeworlds,backgrounds,roles,divinations}.mjs` and `acolyte.aptitudes` is still in `template.json`. Decide whether to (A) replace the data in those modules with RT equivalents but keep the 3-axis UI, or (B) rip the lot out and build an Origin Path + Career advance-table model with a creation wizard. The skill-specialty drift (deviation #5 above) should be addressed in the same pass.

See `RT_CORRECTION_CHECKLIST.md` for the punch list with completed items checked off.
