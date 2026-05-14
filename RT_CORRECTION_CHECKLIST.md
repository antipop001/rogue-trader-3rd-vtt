# Rogue Trader 3rd VTT — Correction Checklist

Prioritized punch list to bring the system in line with **FFG Rogue Trader 1e** (corebook + Into the Storm + Living Errata v1.4). Generated 2026-05-13 from a read-only audit; see `CLAUDE.md` § "2026-05-13 — System audit findings" for the supporting analysis.

Priorities:
- **P0** — wrong at the table (mechanically incorrect for RT 1e). Fix first.
- **P1** — large content/feature gaps that block actual play (no ships to fly, no psychic powers to cast). Fix next.
- **P2** — cleanup, polish, schema work, optional purity goals.

Tick a box once done. Notes in italics belong inline.

---

## P0 — Mechanical correctness

Combat-action modifiers carry DH2 numbers and will produce wrong outcomes at the table.

### `src/module/rules/combat-actions.mjs`

- [ ] **All Out Attack** — change `attack.modifier` from `30` to `20` (RT corebook p.241)
- [ ] **Charge** — change `attack.modifier` from `20` to `10`
- [ ] **Full Auto Burst** — change `attack.modifier` from `-10` to `20`
- [ ] **Semi-Auto Burst** — change `attack.modifier` from `0` to `10`
- [ ] **Delay** — change `type` from `['Full']` to `['Half']`
- [ ] **Guarded Action** — change `type` from `['Half']` to `['Full']`
- [ ] **Tactical Advance** — remove entirely (DH2-only action, has no RT analogue)
- [ ] Verify **Standard Attack** `+10`, **Called Shot** `-20`, **Stun** `-20`, **Aim** Half `+10` / Full `+20`, **Suppressing Fire** `-20` against RT corebook pp.241–247 (currently look correct)

### `src/module/rules/combat-actions.mjs` — Evasion split

- [ ] Replace the single **Evasion** Reaction with two distinct Reactions: **Dodge** (Ag-based, ranged + melee) and **Parry** (WS-based, melee only — no skill rank). Update any prompts/macros that consume the unified action.

### Skill list — Parry is a Reaction in RT, not a skill

- [ ] Decide policy: keep `parry` as a skill (DH2 convention, allows +10/+20/+30 progression on the sheet) **or** remove from `src/template.json` (line 483) and rewire UI to roll Parry as a WS test under the Reactions panel. Document the decision in CLAUDE.md.

### Damage roll — DH2-specific DoS-replaces-die

- [ ] Audit `src/module/rolls/damage-data.mjs` and weapon-prompt for the DH2 rule "swap one damage die for DoS." If implemented, gate it behind an RT toggle or remove. (Pending verification — not yet inspected.)

---

## P1 — Content gaps that block play

### Psychic powers — entire pack is wrong-source

`src/packs/psychic-powers/psychic-powers.yml` is **all DH2 / DH2-supplement** content (DH2, EBY, EWI, TNP, ToF prefixes). Zero RT-sourced powers.

- [ ] Rebuild from RT Core Rulebook pp.156–181: Biomancy, Divination, Pyromancy, Telekinesis, Telepathy (full discipline trees)
- [ ] Add **Navigator powers** (Lidless Stare, Locus Control, etc. — corebook Ch.VI Navigator section)
- [ ] Add **Astropathic Choirs** powers (Astropath Transcendent's signature powers)
- [ ] Drop or relabel: **Sanctic Daemonology**, **Malefic Daemonology**, **Chrono**, **Void Frost**, **Minor** (DH2/supplement-only)
- [ ] Cross-check `discipline:` field values against RT canonical spelling
- [ ] Use the same NotebookLM source pipeline that built talents/weapons/armour (notebook `cd87d917-4cea-45b3-b27c-a149070b1826`)

### Voidship content — code exists but compendia are empty

The voidship sheet, critical damage table, hit locations, prompts, and crew-roll flow all exist in `src/module/`. But there are **zero ship components, ship weapons, or ship traits** in any compendium pack.

- [ ] Build a `ship-components` pack (or split: `ship-components`, `ship-essential-components`, `ship-supplemental-components`) covering RT corebook Ch.VII pp.182–229 + ItS Ch.IV (~80 components: Plasma Drives, Warp Engines, Geller Fields, Void Shields, Bridges, Life Sustainers, Crew Quarters, Augur Arrays, holds, supplementals)
- [ ] Build a `ship-weapons` pack covering Macrocannons, Lances, Torpedoes, Bombardment Cannons, Nova Cannons + ItS additions (~30 weapons)
- [ ] Build a `ship-traits` pack covering Hull traits, Past Histories, Machine Spirit Oddities, Drive Aphorisms, Warp Engine Caprices (corebook pp.196–202)
- [ ] Add hull-class presets (Transport, Raider, Frigate, Light Cruiser, Cruiser, Grand Cruiser, Battleship + ItS classes) — could be either pre-built voidship actors in a compendium or a "hull pattern" item type
- [ ] Verify the existing `voidship-critical-damage.mjs` and `voidship-hit-locations.mjs` match the corebook tables (pp.222–223)
- [ ] Apply errata for Excess Void Armour / Overload Shield Generators / Null Bay where relevant

### Other un-rebuilt packs (same pattern: DH2 fork, no RT sourcing)

For each, rebuild from RT corebook + Into the Storm via the NotebookLM pipeline used for talents/weapons/armour:

- [ ] `cybernetics` → **Bionic Replacements** (RT corebook p.131; much shorter list than DH2)
- [ ] `ammo` → RT specialty ammunition (RT corebook pp.136–137; apply errata for Backpack Ammo Pack p.135)
- [ ] `consumables` → drugs/stimms/recaf etc. (RT corebook Ch.V Gear section)
- [ ] `tools` → general gear (RT corebook Ch.V, pp.149–155)
- [ ] `weapon-mods` → weapon upgrades (RT corebook pp.133–135 + ItS Ch.III)
- [ ] `attack-specials` → universal qualities (RT corebook pp.142–145). Verify presence/spec of: Tearing, Storm, Spray, Snare, Tangle, Volley, Boarding Action, Felling, Twin-linked, Smoke, Toxic, Force (parameter rules differ from DH2)
- [ ] `traits` → creature/character traits (RT corebook traits chapter). Spot-check Brute, Daemonic, From Beyond, Phase, Quadruped, Sanctioned, Stuff of Nightmares, Touched by the Fates
- [ ] `tables` → add RT GM tables (Stars of Inequity systems, Endeavour tables, mutation tables, Twist of Fate) — corebook is sparse but Stars of Inequity supplement has many

### Errata sweep (Living Errata v1.4)

- [ ] Apply ammo errata (p.135 of errata)
- [ ] Apply career advance table errata (talents added/removed per career schedule) — relevant once career data is modeled
- [ ] Apply starship-component errata (Excess Void Armour, Overload Shield Generators, Null Bay) when ship packs are built
- [ ] Re-run a comprehensive errata pass against talents (CLAUDE.md notes some entries had OCR fill-ins) and verify Psy Rating, Rite of Fear, Frenzy, Catfall (tail), Luminen Shock (middle), Unarmed Warrior (middle), Swift Attack (tail) against the printed book

### Three uncommitted YAML files

- [ ] Commit `src/packs/armour/armour.yml`, `src/packs/talents/talents.yml`, `src/packs/weapons/weapons.yml` once verified
- [ ] Run `npm run packs` to confirm YAML round-trips to NeDB cleanly (CLAUDE.md flags this validation as not yet performed)
- [ ] Load the system in Foundry and confirm sheets render correctly with the rebuilt data

---

## P2 — Engine, schema, and the big DH2-vs-RT call

These are larger changes; they decide whether this system is "RT 1e content on a DH2 engine" (current state) or "pure RT 1e engine."

### Decision point: keep or drop the DH2 character-creation pipeline?

Currently the engine carries the full DH2 creation flow (Home World × Background × Role × Aptitudes × 1,000 xp). RT 1e replaces this with Origin Path (Home World → Birthright → Lure of the Void → Trials and Travails → Motivation → Career) and 5,000 xp baked in. Two paths:

**Path A — Keep DH2 creation pipeline (minimum-effort):**
- [ ] Replace the DH2 homeworld entries in `src/module/rules/homeworlds.mjs` with RT homeworlds (Death World, Forge World, Frontier World, Highborn, Hive World, Imperial World, Schola Progenium, Shrine World, Void Born)
- [ ] Reuse the "Background" slot for RT's Birthright (or repurpose for Career)
- [ ] Reuse the "Role" slot for RT's Career (Arch-militant, Astropath Transcendent, Explorator, Missionary, Navigator, Rogue Trader, Seneschal, Void-master)
- [ ] Replace `src/module/rules/divinations.mjs` content with RT's Motivation or remove entirely
- [ ] Keep Aptitudes as a documentation-only field or remove

**Path B — Switch to RT-faithful Origin Path + Career advance tables (large effort):**
- [ ] Schema additions to `acolyte.bio`: `birthright`, `lureOfTheVoid`, `trialsAndTravails`, `motivation`, `career`
- [ ] Replace `acolyte.aptitudes` with `career.rank` and a per-career advance-table data model
- [ ] Build advance-table data files for each of the 8 Careers (corebook Ch.II pp.35–73)
- [ ] Build a character-creation wizard that walks Origin Path → spend 4,500 xp through career table → 500 discretionary
- [ ] Migration path for existing DH2-built characters

### Economy — implement Profit Factor + Acquisition Test

The repo has *neither* a working DH2 Requisition system *nor* an RT Acquisition system.

- [ ] Add `profitFactor` field (group-wide). Options: a setting on a Party/Warband actor, a world-level setting, or a synchronized field across player actors.
- [ ] Build an Acquisition Test macro: `1d100 ≤ PF + Availability + Craftsmanship + Scale + DoS-from-Commerce`
- [ ] Add availability/craftsmanship/scale dropdowns on item sheets (availability already exists; craftsmanship exists; scale is new)
- [ ] Optional: Endeavours tracker for PF awards
- [ ] Remove `characteristics.influence` from `src/template.json` (lines 99–107) — replaced by group PF

### Aptitudes system — drop or formalize as flavor

`src/module/documents/acolyte.mjs:57` + `src/module/rules/homeworlds.mjs`/`roles.mjs`/`backgrounds.mjs` + `src/packs/aptitudes/aptitudes.yml` all reference aptitudes.

- [ ] Decide: drop entirely (Path B above), or keep as flavor (Path A — leave the field, ignore for advancement-cost logic). Document the choice in CLAUDE.md.
- [ ] If dropping: remove `aptitudes` field from talent schema (currently `aptitudes: ''` is convention) and the `aptitudes` compendium pack.

### Psychic mechanic — formalize Fettered/Unfettered/Push

`src/module/rolls/roll-data.mjs:374-458` has rough mechanics but no explicit toggle.

- [ ] Add `psy.strength` enum field: `fettered` | `unfettered` | `push`
- [ ] On Fettered: skip Phenomena check; cast at ⌈PR/2⌉
- [ ] On Unfettered: Phenomena on doubles
- [ ] On Push: Phenomena on **any** non-doubles roll; per-point penalty −10 to Focus Power; cap Sanctioned +3, Unsanctioned +4 (RT values, not DH2 +2/+3)
- [ ] Add `psy.class` enum: `bound` | `unbound` | `sanctioned` | `unsanctioned` (currently free text)
- [ ] Wire up `src/packs/tables/tables.yml` Psychic Phenomena and Perils of the Warp tables to the cast flow

### Skill list — DH1/RT split vs DH2 consolidations

Current skill list is hybrid. For RT 1e fidelity (vs. DH2 consolidations):

- [ ] Decide policy: keep DH2-consolidated `athletics` and `stealth`, or split into RT's Climb/Swim and Concealment/Silent Move/Shadowing
- [ ] `operate` and `navigate` already use RT-style sub-specialties — leave as is
- [ ] Verify specialty lists on `commonLore`, `forbiddenLore`, `scholasticLore`, `linguistics`, `trade` against RT corebook (current entries look RT-correct already, but verify Common Lore: Tactics vs Strategy, Forbidden Lore: Archaeotech wording, etc.)

### Cleanup / polish

- [ ] Decide on `DarkHeresy*` class names — rename to `RogueTrader*` for clarity, or leave as-is (purely cosmetic)
- [ ] Add page numbers to talent `source:` fields (NotebookLM omits them; do a targeted re-query)
- [ ] Extend `weapon.special` schema to capture parameter values for parameterized qualities (Blast `(X)`, Snare `(X)`, Felling `(X)`, Force, etc.) — currently `special: { blast: true }` loses the `(X)`
- [ ] Add `forceField.protectionRating` schema or fold into `armour.protectionRating` (currently embedded in description text only)
- [ ] Add a `npc.threatLevel` encounter-budget tool — or remove the field (DH2-only concept; RT relies on GM judgment)
- [ ] Document deviations explicitly in CLAUDE.md (e.g. "Parry kept as skill", "consolidated Stealth retained")
- [ ] Add a system migration script (`src/module/rogue-trader-migrations.mjs` exists — extend it) for any breaking schema changes above

### Optional new-content build

- [ ] `endeavours` system (corebook pp.288–294) — Expedition/Trade/Military/Criminal types, achievement tracking, PF awards
- [ ] `exploration-challenges` (Stars of Inequity supplement) — warp travel, system generation
- [ ] `renown` per-character track (Battlefleet Koronus, Edge of the Abyss supplements)
- [ ] Pre-built sample NPCs (Imperial citizens, void-born, Eldar Corsairs, Ork pirates) as a `bestiary` pack

---

## Quick-win bundle (1 commit, ~30 min of work)

If you want a single high-impact PR that doesn't require new content:

1. Fix the 6 combat-action modifier values in `src/module/rules/combat-actions.mjs` (P0 first bullet group)
2. Remove the Tactical Advance entry
3. Split Evasion → Dodge + Parry (or at minimum, document the split in comments)
4. Commit the three pending YAML files (`armour`, `talents`, `weapons`)
5. Run `npm run packs` and `npm run build`, smoke-test in Foundry

This alone moves the system from "DH2 with RT labels" to "DH2 with RT combat math + RT-canon content for talents/weapons/armour."
