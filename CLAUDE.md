# Rogue Trader 3rd Edition (Foundry VTT)

Unofficial Foundry VTT system for **FFG's Rogue Trader 1e** content using **Dark Heresy 2nd Edition mechanics** as its rules base, progressively migrated to RT 1e canon mechanics. The "3rd Edition" in the name refers to the system iteration, not a game edition — there is only one printed RT edition.

Forked from mrkeathley's Dark Heresy 2 system. Authored by MortarionUA. Compatible with Foundry VTT v13–v14.

**Current version: 0.7.22** (released 2026-05-29). Combat-action audit against RT Core Table 9-4 (Multiple Attacks added, Guarded Action → Guarded Attack rename, Swift/Lightning hidden as legacy DH2 talents) + critical modifier-sum bug fix (Best Craftsmanship and other spaced/hyphenated modifier keys now actually apply to the target).

## 0.7.x series — ApplicationV2 actor sheets + content pipeline
- **0.7.0** — `AcolyteSheetV2` extending `HandlebarsApplicationMixin(ActorSheetV2)`. Pop-out windows on v13/v14. Templates migrated to V2 `data-action` event-dispatch syntax.
- **0.7.1** — characteristic table 10→9 columns (Influence removed), advance-select font shrunk to 8.5pt so Intermediate/Proficient fit.
- **0.7.2** — vehicle + voidship V2 sheets. Extracted shared `ActorContainerSheetV2` base (item/effect CRUD, drag/drop, toggle-visibility); voidship has a `_processSubmitData` override that routes `items.<id>.<path>` form keys through `updateEmbeddedDocuments`. `TYPES.Actor.{npc,vehicle,voidship}` localization added so window titles resolve. **Key SCSS fix:** moved `@import 'sheets/actor'` out of `.rt-wrapper` scope in `rogue-trader-3rd.scss` — in V2 both classes land on the same `<section class="window-content rt-actor rt-wrapper">` element, so the descendant combinator `.rt-wrapper .rt-actor` never matched and the grid was silently never applied (voidship panels stacked full-width instead of 3-up).
- **0.7.3** — NPC V2 sheet as a thin subclass of `AcolyteSheetV2` (only redeclares `npc` frame class and template path).
- **0.7.22** — **Combat-action audit + modifier-sum bug fix.** (1) `RollData.calculateTotalModifiers()` was routing through a Foundry `Roll('0 + @attack + @Best Craftsmanship')` formula; spaces and hyphens in `@key` identifiers caused the formula to throw, the catch block silently zeroed out the entire modifier total, and ALL modifiers (including clean ones like `attack`) were dropped. Rewrote to sum integers directly with ±60 clamp. Affected `Best Craftsmanship`, `target-size`, `Red-Dot`, `Custom-Grip`, `Modified-Stock`, `Motion-Predictor`, `Poor/Good Craftsmanship`, `explosive arrows`, `Cannot Parry`, `Weapon Parry Bonus`. (2) `Standard Attack` no longer grants +10 (was DH2 carryover; RT Core p.246 specifies no bonus). (3) RT Core Table 9-4 audit: added **Multiple Attacks** (Full, Attack, Melee or Ranged), renamed **Guarded Action → Guarded Attack** (+ added `Concentration` subtype), marked **Swift Attack** and **Lightning Attack** as `legacy: true` (RT lists them as Talents not actions; hidden from attack dropdown but retained for backwards compat). Parry subtype gained `Defence`. Smoke-tested on `rt-smoke` world via Playwright — melee dropdown now shows 10 actions (was 12) with no DH2-only entries.
- **0.7.21** — **Armour display fix + Parry corrections.** (1) Removed TB from `armour.location.total` — was `toughness.bonus + traitBonus`, now just `traitBonus`. The display panel shows raw AP per location; TB shown separately. Damage code (`assign-damage-data.mjs`) already used `value`+`toughnessBonus` independently — unaffected. Stun attack code updated to explicitly add TB (`headArmour.total + headArmour.toughnessBonus`). (2) Parry at advance 0 now uses full WS (RT 1e Reaction), not half WS (was treated as untrained Basic). (3) Removed craftsmanship bonuses (Poor -10/Good +5/Best +10) from Parry rolls — RT Core specifies these apply to attack tests only, not defensive reactions. Parry modifiers now: Balanced +10, Defensive +15, Unwieldy/Unbalanced blocks, weapon `parryBonus`.
- **0.7.20** — **Skill sheet split into three panels + "Treat as Basic" + data fixes.** Replaced Bonuses panel with separate Basic Skills / Advanced Skills / Specialist Skills panels (both acolyte and NPC sheets). Basic panel shows only Basic skills; Advanced panel shows non-specialist Advanced skills with an "As Basic" dropdown option (advance=-1) for Origin Path traits that let you treat an Advanced Skill as Basic (tests at half-char, not blocked). `skill.treatAsBasic` flag in `_computeSkills()` + `rollSkill()` allows rolling. Specialist panel also has "As Basic" option. **Data fixes:** Security default characteristic corrected to Ag (was Int). Performance specialties added: Dancer, Musician, Singer, Storyteller. New template `skills-advanced-panel.hbs` registered in Handlebars preload.
- **0.7.19** — **Skill sheet shows Basic vs Advanced distinction.** Each skill row displays a superscript `B` or `A` tag next to the name. Untrained Basic skills show their half-characteristic value in italic at 60% opacity. Untrained Advanced skills show `—` at 35% opacity with the entire row dimmed to 55% opacity (`skill-locked` class). Trained skills display normally regardless of type. `skill.isBasic` flag added to `_computeSkills()` for template access. Specialist skill panel also dims untrained specialties with `—`. SCSS in `_actor.scss`: `.skill-type-tag`, `.skill-half`, `.skill-locked-val`, `.skill-locked`.
- **0.7.18** — **Complete RT 1e skill list (49 skills).** Added 10 missing standalone skills: `barter` (Fel/Basic), `blather` (Fel/Advanced), `chemUse` (Int/Advanced), `contortionist` (Ag/Basic), `disguise` (Fel/Basic), `evaluate` (Int/Basic), `gamble` (Int/Basic), `invocation` (WP/Advanced), `search` (Per/Basic), `tracking` (Int/Advanced). Split `operate` → `drive` (Ag/specialist: Ground Vehicle, Skimmer/Hover, Walker) + `pilot` (Ag/specialist: Flyer, Personal, Space Craft). Skill count 38→49. BASIC_SKILLS now 21, Advanced 28. All updated in template.json, SKILL_LABELS, Talented options, NPC pipeline SKILL_MAP. No code referenced `operate` programmatically — ship rolls use crew skills not pilot/drive.
- **0.7.17** — **Split DH2 consolidated skills back to RT 1e canon.** Removed `athletics` (→ `climb` S/Basic + `swim` S/Basic), `stealth` (→ `concealment` Ag/Basic + `silentMove` Ag/Basic + `shadowing` Ag/Advanced), `linguistics` (→ `speakLanguage` Int/specialist with 7 languages + `secretTongue` Int/specialist with 7 tongues + `ciphers` Int/specialist with 5 ciphers + `literacy` Int/non-specialist). Skill count 32→38. All updated in `template.json`, `BASIC_SKILLS`, `SKILL_LABELS`, Talented pickable options, NPC pipeline `SKILL_MAP`. Existing actors gain new skills at advance 0 via template merge; old consolidated keys become orphan data (harmless).
- **0.7.16** — **RT 1e skill advance system.** Replaced DH2's 5-level system (Unknown/Known/Trained/Experienced/Veteran with -20/0/+10/+20/+30) with RT 1e's 4-level system (Untrained/Trained/+10/+20 — hard cap at +20, max 3 acquisitions per RT Core p.76). Untrained Basic skills test at half governing characteristic (floor); untrained Advanced skills cannot be attempted at all (blocked with UI notification). `BASIC_SKILLS` set in `acolyte.mjs`: athletics, awareness, carouse, charm, command, deceive, dodge, inquiry, intimidate, logic, parry, scrutiny, stealth (13 skills). All other skills (19) are Advanced. `_computeSkills()` sets `skill.untrained` flag and computes `skill.current` accordingly. `rollSkill()` blocks untrained Advanced with `ui.notifications.warn()`. NPCs inherit identically (zero overrides in `npc.mjs`). Old advance=4 values on existing actors safely clamp to +20.
- **0.7.15** — **Add missing Carouse and Wrangling skills.** Carouse (Toughness, basic — RT Core p.78) and Wrangling (Intelligence, basic — RT Core p.100) were never added to the data model despite being canonical RT 1e skills. Added to `template.json` skill definitions, `SKILL_LABELS` in talent-choice picker, Talented talent's pickable options, and NPC pipeline `SKILL_MAP`. Both auto-render on character sheets (skills panel iterates dynamically). Existing actors gain both skills at default (advance 0) on next template merge. Skill count: 30→32.
- **0.7.14** — **Fix NPC Natural Armour/Machine trait levels.** `_computeArmour()` switch only matched American spelling "Natural Armor" — added fallthrough `case 'Natural Armour':` for British spelling used by all 9 NPC trait items. Set correct `level`/`hasLevel` on 9 NPC traits across 5 supplement packs from source book stat blocks (Monster In The Maze NA 8, Dweller In The Heights NA 5, Clawed Fiend×2 NA 4, Killian's Bane NA 5, Terrorax NA 6, Thornmaw NA 2, Vaporian Glasshawk Machine 3, Razorwing NA 2). Full NPC mechanics audit confirmed: NPCs inherit all Acolyte computation identically, all 11 Talented talents have correct ActiveEffects, unnatural characteristics correctly populated on 60+ NPCs.
- **0.7.13** — **Fix Deathdealer double-application on Righteous Fury.** The RF-specific Deathdealer block inside the Righteous Fury trigger (lines 136-144 of `damage-data.mjs`) granted full Perception bonus as `modifiers['deathdealer']`, while the unconditional Deathdealer code (lines 176-180 melee, 229-233 ranged) already applied the correct `Math.ceil(perBonus / 2)` as `modifiers['deathdealer melee']`/`modifiers['deathdealer ranged']`. Both used different modifier keys so they stacked — on RF hits the character got ~1.5x their Perception bonus. Fix: removed the RF-specific block. Comprehensive personal combat math audit confirmed all other formulas correct: hit/DoS calculation, additional hits (Semi/Full/Swift/Lightning), fire rate capping, jam/overheat thresholds, all damage specials (Tearing/Accurate/Scatter/Primitive/Proven/Maximal/las modes), talent bonuses (Crushing Blow/Mighty Shot/Deathdealer), penetration modifiers (Lance/Razor Sharp/Melta/Hammer Blow/Eye of Vengeance/Maximal/Overload), damage assignment (armour-pen-TB reduction, wound overflow, True Grit), hit locations (reversed d100), combat action modifiers (Table 9-1), ammo consumption.
- **0.7.12** — **Psychic power math fixes (RT 1e alignment).** Removed DH2 PR modifier from Focus Power Test — the ±10 per PR point difference between base rating and effective PR (`modifiers['bonus'] = 10 * Math.floor(rating - pr)`) was a DH2 mechanic not present in RT 1e. In RT Core p.157-158, Fettered/Unfettered/Push changes effective PR and phenomena/perils triggers but does NOT modify the Focus Power Test target. Previously a Fettered psyker with PR 4 got +20 to their test. "Rating Bonus" display row removed from psychic prompt template. Fixed Telekinetic Weapon and Force Shards penetration from 0 to `"@pr"` — both should equal effective Psy Rating per RT Core errata. The `@pr` formula evaluates dynamically via Foundry's Roll class against `rollData.pr`. All 79 psychic powers audited: damage formulas, phenomena/perils triggers, Focus Power bonus, range handling all verified correct.
- **0.7.11** — **Starship combat overhaul + component bonus system.**
  - **Ship combat math**: Lance weapons now bypass armour entirely — all lance hits auto-penetrate per RT Core p.216. Void shields implemented — macrobattery hits absorbed before armour check, lances bypass shields, shield count decremented on target actor. Fixed `calculateResultVoidship()` broken if/else chain (turrets also triggered spurious crew check). Ship weapon range bands computed dynamically from max range (Short ≤Range/3, Medium ≤Range*2/3, Long ≤Range) — was always resolving to Long Range -20 because `rangeSmall`/`rangeMedium` were 0 in all weapons. Component armour bonuses now included in penetration calculation.
  - **Ship compendium data**: All ship weapon/component `hitPoints` 0→2 (critical damage system was broken — `assign-damage-data.mjs` filters by `hitPoints > 0`, so no components were ever targetable for critical effects). Star-flare Lance reclassified from Turret/Macrocannon to Lance/Lance with Heavy size. 9 bridges corrected from componentType "Void Shield" to "Bridge", 4 void shields to "Void Shields" (plural), 4 warp engines from "Warp Drive" to "Warp Engine" — all now match critical damage table keys. Crit table key renamed from "Ship\`s Bridge" to "Bridge". Plasma Drive Explosion removed (all-zero placeholder). 6 weapon descriptions fixed (3 concatenated OCR artifacts, 3 index-page garbage from ItS).
  - **Component bonus system (NEW)**: `bonuses` schema added to `shipComponent` template in `template.json` (maneuverability, hullIntegrity, morale, armour, armourProw, turrets, detection, speed, bsShipWeapons). `_computeComponentBonuses()` in `voidship.mjs` sums bonuses from installed components (skips Destroyed/Unpowered). Maneuver/Detection rolls include bonuses. Turret count includes bonus. Ship weapon attacks include bridge BS modifier. Penetration check includes armour bonuses. Sheet panels display `(+N)` indicators. 18 components wired: Command/Armoured Command Bridge (+5 BS), Ship Master's Bridge (+10 BS), Logis-targeter (+5 BS), Augmented Retro-thrusters/Gravity Sails/Gyro-stabilisation Matrix (+5 manoeuvrability), Armour Plating (+1 armour/-2 manoeuvrability), Armoured Prow (+4 prow), Reinforced Interior Bulkheads (+3 hull), Micro Laser Defence Grid (+1 turrets), Exploration Bridge (+5 detection), Temple-shrine (+3 morale), Ancient Life Sustainer (+2), Supply Vaults/Observation Dome (+1), Pressed-crew Quarters (-2), Luxury Quarters (-3).
- **0.7.10** — **Combat action modifier fixes.** Guarded Action was missing `attack: { modifier: -10 }` and `Attack` subtype — never appeared in the weapon attack prompt and applied no penalty. Now correctly applies -10 WS/BS and appears for both melee and ranged. Overwatch was missing `attack: { modifier: -20 }` — now applies -20 BS per RT Core combat action table.
- **0.7.9** — **Craftsmanship mechanics + Parry wiring + missing weapons.**
  - **Craftsmanship mechanics** (RT Core pp.116, 138): Weapon craftsmanship now affects combat rolls. **Ranged**: Poor adds Unreliable (cancels Reliable if present), Good adds Reliable (cancels Unreliable), Best never jams or overheats (jam threshold set to 101 in `action-data.mjs`, overheat suppressed). **Melee**: Poor -10 / Good +5 / Best +10 attack via `specialModifiers` in `attack-specials.mjs`; Best +1 damage via `modifiers['best craftsmanship']` in `damage-data.mjs`. **Armour**: Best +1 AP per location (tracked per winning piece in `_computeArmour` via `maxArmourCraft`), Best half weight via `totalWeight` getter in `item.mjs`. Good armour (+1 AP first attack/round) not automated — requires per-round state tracking. Poor armour (-10 Ag) not automated.
  - **Parry roll wiring**: `rollSkill('parry')` in `acolyte.mjs` now looks up the first equipped melee weapon and applies: Balanced +10, Defensive +15, Unwieldy/Unbalanced -999 (blocks parry), craftsmanship bonuses (Poor -10, Good +5, Best +10), and `system.parryBonus` for weapon-specific pattern bonuses. Falls back to `system.special` flags if embedded attack-special items haven't migrated yet.
  - **New weapons (5)**: Power Sword (Mordian) with `parryBonus: 5`, Bolas (Primitive/Snare/Inaccurate thrown, was missing from corebook), Force Axe/Staff/Sword (Naduesh) from Into the Storm. `parryBonus: 5` also added to Ghost Sword and Parrying Dagger.
  - **OCR name fixes**: Macusta→Lacusta Hammer, Hoi→Loi Pattern Power Axe.
- **0.7.8** — **Compendium data audit — weapons, cybernetics, armour.**
  - **Weapons (40 fixes)**: Systematic build-script bug where the special-quality substring matcher mapped `Inaccurate` → `accurate: true`, `Unreliable` → `reliable: true`, `Unbalanced` → `balanced: true`. 34 flag fixes across 23 weapons (Ork Shoota/Slugga, Flintlock Pistol, Musket, Blunderbuss, Big Shoota, Burna, Rokkit Launcha, Deffgun, Grenade Launcher Voss, Razorweb Launcher, Mole Mortar, both Mortars, Naval Shotcannon, Plasma Cannon, Power Axe, Omnissian Axe, Ork Choppa, Great Weapon, Improvised Weapon, Big Choppa, Hoi Pattern Power Axe, Disposable Handgun). Storm Bolter rebuilt from stub data to correct corebook p.119 stats (S/2/4, 1d10+5 X, Pen 4, Clip 60, Storm+Tearing, Extremely Rare). Individual stat fixes: Autogun reload Full→2 Full, Meltagun (Mars) weight 7.5→40, Meltagun (Mezoa) weight 8.5→46, Multi-Melta burst RoF 0→3, Graviton Gun clip 2→3 + pen 3→0 (values were swapped). Full Auto Burst description corrected from "one hit plus one additional hit per DoS" to "one hit per DoS" to match the code and RT Core rules.
  - **Cybernetics**: All 30 availability values corrected from schema-default `common` to corebook Table 5-16 / ItS values. Armour-point wiring added: Bionic Heart `hasArmourPoints: true` + body AP 1, Cranial Armour `hasArmourPoints: true` + head AP 1, Subskin Armour `hasArmourPoints: true` + arms/body/legs AP 2 — all three now mechanically stack with worn armour via `_computeArmour()`. Three missing corebook cybernetics added: Voidskin (Scarce), Volitor Implant (Rare), Vox Implant (Scarce). Utility Mechadendrite truncated description completed.
  - **Armour**: Squighide AP 1→3 (all locations), weight 3→4 kg, availability Common→Scarce, type Other→Primitive with note. Eldar Forceshield weight 0.2→2.0 kg. Archeotech Blurshield description corrected (was mangled with Mirror Shield reflect mechanic), type Field→Other (not a force field), weight 2.0→3.0 kg.
- **0.7.7** — **Weapon specials audit + traits expansion + NPC talent wiring.**
  - **Weapon special fixes**: Storm now doubles all hits (initial + additional) on every fire mode — was only doubling `additionalHits` inside burst/auto branches, so single-shot Storm weapons scored 1 hit instead of 2. Ammo doubled universally via `ammoPerShot *= 2`. Lance penetration fixed from `pen*(1+DoS)` to `pen*DoS` (modifier was `pen*dos`, should be `pen*(dos-1)` since base pen is already included). Razor Sharp pen doubling on 3+ DoS moved out of the melee-only block so it works for ranged weapons too. Unreliable jam threshold implemented at 91+ (was silently using normal 96+). Normal jam threshold fixed from `> 96` to `>= 96` so rolling exactly 96 correctly jams per RT Core p.238.
  - **Traits compendium** expanded from 33 → 45: 12 new Into the Storm traits (Kroot: Eaters of the Dead, Fieldcraft, Kroot Beak, Kroot Physiology, Instinctual Understanding, Shamanic Powers; Ork: 'Ard, Made Fer Fightin', Make It Work, Might Makes Right, Mob Rule; General: Improved Natural Weapons). Fixed truncated OCR descriptions for Incorporeal, Machine, Mechanicus Implants.
  - **NPC talent wiring**: `to_item_stub()` in `build_npc_yaml.py` now deep-copies `effects` and `flags` from compendium talents (was sharing dict references — first NPC's `_apply_npc_talent_choice` deleted `pickable` from the shared dict, silently breaking all subsequent NPCs). New `_apply_npc_talent_choice()` extracts parenthetical choices from NPC stat-block names, stamps `system.choice`, builds ActiveEffects for `kind=skill` (Talented → +10 to skill modifier), updates conditional bonus labels with specific targets, and strips `pickable` flag.
- **0.7.6** — **Talent mechanics overhaul.** Three new patterns landed on top of the existing pack:
  - **Always-on Active Effects**: Machinator Array, Master Chirurgeon, Hotshot Pilot, Infused Knowledge carry transferable AEs that auto-bump characteristic/skill modifiers. Schema gained `skill.modifier` field + `_computeSkills` runs twice (before and after `super.prepareData()`) so AEs feed into `skill.current`.
  - **Pickable talents**: 10 talents (`Talented`, `Hatred`, `Peer`, `Good Reputation`, `Enemy`, `Rival`, `Weapon Master`, `Exotic Weapon Training`, `Psychic Technique`, `Warp Eye`) tagged with `flags.rt.pickable: {kind, options}` and prompt a DialogV2 on `createItem` (registered in `hooks-manager.mjs`). Choice stored on `system.choice` + appended to item name. Only `kind=skill` (Talented) builds a dynamic ActiveEffect targeting the chosen skill's modifier — the other 9 are conditional.
  - **Optional-per-roll bonuses**: 23 conditional talents tagged with `flags.rt.conditionalBonuses[]` describing (`applies.skills`, `applies.characteristics`, `value`, `label`). `BaseActor.collectOptionalBonuses({skill, characteristic})` returns matches; `simple-roll-prompt.hbs` renders each as a checkbox; the roll callback sums checked values into `rollData.modifiers.modifier`. Covers Hatred, Peer, Rival, Resistance variants, Berserk Charge, Frenzy (multi-entry: +10 WS/S/T/WP AND -20 BS/Int), Disturbing Voice, Iron Discipline, Void Tactician, etc.
- **0.7.5** — **Career Special Abilities** added to the talents pack. 13 new entries covering each Career's signature ability per RT corebook Ch.III: Exceptional Leader (Rogue Trader), Weapon Master (Arch-militant), Soul-Bound to the Emperor + See Without Eyes (Astropath Transcendent), Explorator Implants (Explorator), Warp Eye + The Boons of Lineage + Navigator Mutations (Navigator), Seeker of Lore (Seneschal), and the four Void-master Masteries (Space / Gunnery / Augurs / Small Craft). Each entry tagged with `flags.rt.category: "Career Special Ability"` and `flags.rt.career` for filtering. Pure Faith (Missionary) was already in the pack pre-0.7.5.
- **0.7.4** — **NPC compendium fleet.** 19 new packs (`<book>-npcs`) registered in `system.json` with GM-only `ownership: {PLAYER: "NONE", ASSISTANT: "OWNER"}` so players can't browse them. 334 NPCs total, extracted by `tools/npc_pipeline/extract_all_npcs.py` from Mistral-OCR'd RT supplement markdown. Token sizes derive from each NPC's `Size (X)` trait per `size.md` (Miniscule/Puny 0.5×0.5, Average/Hulking 1×1 with Hulking art-scaled 1.2×, Enormous 2×2 up to Titanic 8×8). 176 portraits live: 145 colorized via low-denoise (0.18) ComfyUI img2img against canonical FFG references, 31 hand-curated overrides from `/mnt/project_data/RT/RT-NPC/` for NPCs flagged BAD by the strict-check sweep. 158 NPCs ship without a portrait — Foundry falls back to its default `mystery-man.svg`.

V2 conversion gotchas codified in `~/.claude/projects/-home-ahermon/memory/reference_foundry_v2_sheet_gotchas.md`.

## 0.6.0 — Origin Path (Path A lite)
0.6.0 shipped **Path A (lite)** of the character-creation decision: a six-stage Origin Path panel (Home World / Birthright / Lure of the Void / Trials and Travails / Motivation / Career) with canonical RT Core + Into the Storm dropdowns and free-text notes per stage, plus a coordinated skill-specialty list migration to RT canon (Common Lore 14, Forbidden Lore 11, Scholastic Lore 16, Linguistics 12, Trade 13). The DH2-fork bio fields (homeWorld/background/role/elite/divination) remain in `template.json` for data continuity but are no longer rendered on the sheet. No advance-table model or wizard — players write their effects into the per-stage notes field.

## 0.5.x — pre-character-creation punch list
0.5.0 closed the "everything before the A/B character-creation decision" punch list — Accurate damage fix (1d10 per 2 DoS), ship-weapon damage rolling (1d10 + listed Damage per hit, RT corebook p.215), 17 psychic-power damage formulas, ammo + Arms Coffer errata (v1.4), four talent OCR fill-in corrections (Frenzy / Rite of Fear / Catfall / Unarmed Warrior), and the canonical RT Table 8-12 Critical Hits + Catastrophic Damage RollTables. 0.5.1 refreshed inventory icons with 98 Flux-dev-generated bucket icons (520 entries rewired). 0.5.2 fixed the psychic-power damage-roll gate (`subtype: 'Concentration Attack'`), the tables-icon path, and the chainsword bucket art.

## Test environment (foundrySB)

Proxmox LXC for live-testing this system in Foundry.

| Property | Value |
|---|---|
| CTID | 211 (foundrySB) |
| IP | 192.168.11.36 |
| Foundry | v14.361 |
| World | rt-smoke |
| Node.js | v24.15.0 |
| App path | /opt/foundry |
| Data path | /var/lib/foundrydata |
| Log | /var/log/foundry.log |
| URL | http://192.168.11.36:30000 |
| SSH | `ssh -i ~/.ssh/foundry_test project@192.168.11.36` |

### Deploy loop

After `npm run build`, rsync each subdirectory of `build/rogue-trader-3rd/` to the matching subdirectory under `/var/lib/foundrydata/Data/systems/rogue-trader-3rd/`. **Rsync gotcha:** never pass two source dirs into one destination — they collide. Sync each subdir to its own dest.

Then restart: `sudo systemctl restart foundry.service`.

### Compendium changes need a cache-clear (Foundry V14 gotcha)

Foundry V14 auto-migrates each system NeDB `.db` compendium into a **LevelDB cache** as a subdirectory next to the .db file on first read:

```
<data>/systems/<system>/packs/<pack>.db       ← source (NeDB, what we deploy)
<data>/systems/<system>/packs/<pack>/         ← LevelDB cache (000005.ldb, CURRENT, MANIFEST-*, LOG)
```

After the cache exists, Foundry **ignores `.db` file changes** even across `systemctl restart`. It only re-migrates if the LevelDB subdirectory is absent. No error, no warning — the server quietly serves stale data, and `pack.clear()` + `pack.getDocuments()` returns the cached version.

After any compendium change, the deploy step MUST also drop the caches:

```bash
sudo systemctl stop foundry.service && \
sudo rm -rf /var/lib/foundrydata/Data/systems/rogue-trader-3rd/packs/*/ && \
sudo systemctl start foundry.service
```

The `*/` glob removes only LevelDB subdirectories (which are root-owned because Foundry creates them), leaving the `.db` files (project-owned) intact. Codified in `~/.claude/projects/-home-ahermon/memory/reference_foundry_v14_leveldb_cache.md`.

### Headless debugging (Playwright)

Playwright is installed in `~/.venvs/playwright/`. Use it for direct page-context inspection of Foundry. Template script: `/tmp/inspect_compendium.py` — navigates to `/join`, logs in as Gamemaster (empty password while debugging — user clears + resets), runs JS in the page context, dumps the result to stdout. The test world's GM seat is single-occupancy, so the user must log out of their browser tab before a Playwright session can claim it.

## Adjacent infrastructure — whisperx (ComfyUI image gen)

The `whisperx` Proxmox LXC at `192.168.11.22` hosts the SDXL image-generation pipeline used for NPC portraits (see "NPC compendium pipeline" / "Image generation" sections). Connection details:

| Property | Value |
|---|---|
| SSH | `ssh ahermon@192.168.11.22` (ed25519 key auth, passwordless from dev LXC) |
| Alt access | `ssh project@192.168.11.22` (password `project`, has sudo) for system admin / model installs |
| ComfyUI API | `http://192.168.11.22:8188` (LAN-only — iptables INPUT restricts to `192.168.11.0/24` + `127.0.0.0/8`) |
| Install | `/home/ahermon/comfyui/ComfyUI/`, venv at `/home/ahermon/comfyui-venv/` (Python 3.10, torch 2.12) |
| Service log | `/var/log/comfyui/comfyui.log` |
| GPU | RTX 3060 12GB |
| Workflows | `tools/npc_pipeline/comfy_npc_img2img.py` (in this repo) is the production entry point |

**Security note (2026-05-18):** the LXC was compromised before this date with a crypto-miner + supply-chain RCE attack — a fake `comuifyConfig` custom node that fetched `45.130.22.219/comfyUI<MMDD>.elf` on every ComfyUI start and dropped systemd-user-timer backdoors with innocent names (`gnome-X11`, `mail-sync`, `nano`, `ssh.config`, `ssh-proxy`). Cleaned up, payloads quarantined to `/root/forensic/`. **ComfyUI-Manager has been removed (had remote install endpoints — the RCE vector) — don't reinstall it.** The C2 IP `45.130.22.219` is permanently blocked at iptables OUTPUT. If a compendium-style supply-chain attack pattern reappears (suspicious URLs in custom_node `__init__.py`, unfamiliar `~/.config/systemd/user/*.service` with `ExecStart=/home/ahermon/.somewhere/...`), repeat the audit pattern from `~/.claude/projects/-home-ahermon/memory/reference_comfyui_whisperx.md`.

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

## NPC compendium pipeline (in flight, 2026-05-19)

Building the first **Actor**-type compendium for this system: `src/packs/npcs/npcs.yml` → `npcs.db`. Registered in `system.json` as `{ "name": "npcs", "type": "Actor", "label": "NPCs" }`. PoC currently has the four xenos NPCs from corebook Ch.XIV (Eldar Corsair, Ork Freebooter, Kroot Mercenary, Warp Predator/Ebon Geist).

**Extraction:** `/tmp/build_npcs.py` parses NPC stat blocks from `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md`. Handles:
- Both table formats: dual-header (`| Profile | | …` + separator + `| WS BS S T …` + data row, like Eldar) and single-header (just `| WS BS S T …` + separator + data row, like Ebon Geist).
- Multi-line cells where the markdown converter split `(N)\nvalue` (Unnatural Characteristic notation) across two lines.
- Paragraph splits caused by inline image markdown breaking up a single skill/talent/trait list — merged back into one section.
- Footnote bleed: lines like `". †..."` or `". Daemonic Presence:..."` after a list are cut at the period.
- Stat-block skill name → `template.json` skill key mapping (consolidated: Barter→commerce, Climb→athletics, Silent Move/Concealment→stealth, Speak Language→linguistics, etc.).

**Assembly:** `/tmp/build_npc_yaml.py` builds the Foundry actor YAML, resolving talent/trait names against `src/packs/{talents,traits}/*.yml` to embed full benefit/description data. Inline weapons/armour parsing:
- Weapon spec like `(60m; S/3/10; 1d10+4 R; Pen 6; Clip 100; Reload 2Full; Reliable)` → structured `system.{range,rateOfFire,damage,damageType,penetration,clip,reload,special:{reliable:true}}`.
- Armour `(Body 5, Head 4, Arms 2, Legs 2)` → `system.armourPoints` with Arms/Legs split into left/right.
- Compendium-weapon lookup with qualifier-stripping (`xeno-crafted laspistol` → also tries `laspistol`) and hard aliases (`shoots`→`ork shoota`).

**Foundry V14 embedded-item gotchas** (learned the hard way; cost ~half a day):
- Embedded weapon/armour items need ALL schema-required template fields populated (`physicalItem`: `inBackpack`; `attack`: `attackType`, `attackBonus`; `action`: `target`, `effect`; `backpack: {inBackpack}`). Missing fields cause silent doc rejection during compendium load — no error log, items just disappear. Standalone Item compendiums get a relaxation pass; embedded items don't.
- `range` and `penetration` are declared as strings (`""`) in `template.json` and must be strings on embedded items even though they hold numeric values.
- `_id` must be 16-char mixed-case alphanumeric (`[A-Za-z0-9]{16}`), Foundry-style randomID. Lowercase hex works for the .db row itself but is risky.
- And THE big one: deploying a new `.db` file doesn't update Foundry until you `rm -rf packs/<name>/` LevelDB cache. See "Deploy loop" / `reference_foundry_v14_leveldb_cache.md`.

**Image generation (current path — ComfyUI img2img against canonical refs):**

`flux/dev` via fal-ai was the first pass and was *not 40K-accurate enough* — SDXL/flux bases have weak priors for niche xenos (Kroot, Ebon Geist) and drift into generic fantasy. As of 2026-05-18 the pipeline runs locally on the `whisperx` LXC:

| Property | Value |
|---|---|
| ComfyUI API | `http://192.168.11.22:8188` (firewalled to `192.168.11.0/24`) |
| Base model | **JuggernautXL_v9** — photorealistic painted SDXL. *Avoid Illustrious-XL for these portraits — its anime bias fights the oil-paint aesthetic.* |
| Style LoRA | **`Oldhammer.safetensors` @ 0.45–0.60** — stacked on every portrait. The vintage GW oil-paint style anchor. ⭐ |
| Faction LoRAs | `Aeldari` (Eldar), `Ork-Boyz` (Ork), `Tau` (Tau-allied — avoid for pure Kroot), `Astartes` (Space Marines). All from nDimensional/HuggingFace. |
| Reference art | RT corebook NPC illustrations live at `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/pages/page-NNN/img-NN.jpeg`. Upload to whisperx's `~/comfyui/ComfyUI/input/rt_npc_refs/` first. |
| Workflow | **img2img**: `LoadImage → ImageScale 832×1216 → VAEEncode → KSampler(denoise=0.50–0.65, dpmpp_2m, karras, cfg=6, 30 steps) → VAEDecode → SaveImage`. The reference's painted body + species anatomy anchors the result; the prompt + LoRAs repaint the detail. |
| Denoise rule of thumb | `0.50` preserves canon anatomy almost verbatim (use when species drift is the failure); `0.65` lets the prompt dominate (use when reference composition is fine but you want a fresh repaint) |
| Script | `tools/npc_pipeline/comfy_npc_img2img.py` (callable as `python3 comfy_npc_img2img.py [eldar|ork|kroot|geist]`) |

**Strict-check discipline (REQUIRED for canon-anchored generation):**

Every generated portrait must be visually compared against the canonical published reference before being committed. Do not ship the first plausible result — for niche species the base model has no real prior and will drift to nearest-neighbor (Kroot → orc-faced humanoid, Aztec tribal warrior, Saurian Space Marine, literal cartoon crow — all observed during the 2026-05-18 pass). Name each drift mode explicitly and counter with a targeted negative prompt before re-rolling. Codified in `~/.claude/projects/-home-ahermon/memory/feedback_canon_strict_check.md`.

Typical negative-prompt counters seen during the Kroot iteration:
- Wrong species → `human face, orc, ork, goblin, snarl, tusks, troll, ogre`
- Wrong faction → `yellow power armor, imperial fists, space marine, ceramite shoulder pad`
- Wrong anatomy → `(extra arms:1.5), three arms, four arms, multiple weapons, feathered body, full bird, mascot, cartoon`
- Wrong style → `anime style, cell shaded, chibi, photograph, modern, contemporary`
- Costume drift → `skull mask, bone mask, tribal mask, headdress, native american, aztec`

**Style consistency across a batch:** the Oldhammer LoRA does the heavy lifting. Fixed seed (42 default) gives composition reproducibility but is less load-bearing than the style LoRA.

**flux/dev historical pass:** the four initial portraits were generated with flux/dev (style-front prompts + NotebookLM canonical descriptions + fixed seed 42 + square_hd). Result was 3/4 stylistically OK, 1/4 (Kroot) off-canon. Documented for posterity in case we revisit fal-ai pipelines.

**Known stubs:** creature-unique talents/traits not in the compendium (Mob Rule, Consume Life, Daemonic Presence, Hard Target, the `Common Lore (Ork)`/`Speak Language (X)` meta-talents) embed as name-only items — they render with their name but no benefit text until authored.

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
- Special-quality keyword matcher in `/tmp/build_weapons.py` was fuzzy (substring match) — 0.7.8 fixed the Inaccurate/Unreliable/Unbalanced inversion bug across 23 weapons, but rare qualities like Spray, Snare, Sanctified, Force, Volatile may still not be recognized and silently dropped from the `special` object. Re-check against descriptions if writing automation.
- "Bomb Squig" / "'Sploding Squig" stats are weird-by-design; sanity-check.
- ItS page numbers for some entries (Bolter Cane p.100, Wrath Plasma Pistol p.101) may be off — ItS Extended Armoury runs roughly pp.108–146.

**Armour:**
- Force fields encode Protection Rating in a `protectionRating` field (added during the 0.7.x series) plus in `description`. Field overload chances reference "Table 3-10" in description but the table itself isn't in the pack.

**Cybernetics:**
- 16 cybernetics have mechanical bonuses described in text but no Active Effects or system wiring (Bionic Arm +10 Ag/Str, Bionic Locomotion Sprint talent, Calculus Logi +10 Literacy/Logic/Scholastic Lore, Synthetic Muscle Grafts +1 SB, etc.). The three armour-granting cybernetics (Bionic Heart, Cranial Armour, Subskin Armour) were wired in 0.7.8; the rest remain description-only.
- "Implant Systems" entry is a section header from the corebook, not an acquirable item. Harmless but could confuse users.

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
| `cybernetics` | 28 | RT Core + ItS | **Audited 2026-05-24.** Bionic Replacement Limbs + Implant Systems + Mechadendrites from corebook p.131+ and 6 ItS entries. All availability values corrected. Bionic Heart, Cranial Armour, Subskin Armour wired with `hasArmourPoints`. 3 missing corebook items added (Voidskin, Volitor Implant, Vox Implant). |
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

1. **Parry is a skill, not just a Reaction.** `src/template.json` defines `parry` as a WS-based skill. RT 1e treats Parry as a Reaction (a WS test, no separate skill ranks). Keeping the skill lets characters spend XP advances on +10/+20 Parry — useful as a house-rule extension, but unfaithful to RT. As of 0.7.9, the Parry roll reads the equipped melee weapon for Balanced/Defensive/Unwieldy/Unbalanced modifiers, craftsmanship bonuses, and weapon-specific `parryBonus`. As of 0.7.16, Parry is classified as a Basic skill (can attempt untrained at half WS).
2. ~~**`athletics` and `stealth` are consolidated skills.**~~ **RESOLVED in 0.7.17.** DH2 consolidations split back to RT 1e canon: Athletics→Climb+Swim, Stealth→Concealment+Silent Move+Shadowing, Linguistics→Speak Language+Secret Tongue+Ciphers+Literacy.
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
