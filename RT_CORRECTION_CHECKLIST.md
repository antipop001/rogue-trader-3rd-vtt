# Rogue Trader 3rd VTT — Correction Checklist

Prioritized punch list to bring the system in line with **FFG Rogue Trader 1e** (corebook + Into the Storm + Living Errata v1.4). Generated 2026-05-13 from a read-only audit; see `CLAUDE.md` § "2026-05-13 — System audit findings" for the supporting analysis.

Priorities:
- **P0** — wrong at the table (mechanically incorrect for RT 1e). Fix first.
- **P1** — large content/feature gaps that block actual play (no ships to fly, no psychic powers to cast). Fix next.
- **P2** — cleanup, polish, schema work, optional purity goals.

Tick a box once done. Notes in italics belong inline.

---

## P0 — Mechanical correctness — DONE

### `src/module/rules/combat-actions.mjs`

- [x] **All Out Attack** — `attack.modifier` 30 → 20 (RT corebook p.241)
- [x] **Charge** — `attack.modifier` 20 → 10
- [x] **Full Auto Burst** — `attack.modifier` -10 → 20
- [x] **Semi-Auto Burst** — `attack.modifier` 0 → 10; also `type` Half → Full (caught 2026-05-14, audit missed it)
- [x] **Stun** — `type` Half → Full (caught 2026-05-14, audit missed it)
- [x] **Delay** — `type` Full → Half
- [x] **Guarded Action** — `type` Half → Full (RT corebook calls this "Guarded Attack"; name kept for back-compat)
- [x] **Tactical Advance** — removed (DH2-only)
- [x] Verified Standard Attack +10, Called Shot -20, Aim Half +10 / Full +20, Suppressing Fire -20 against RT corebook pp.147-148

### `src/module/rules/combat-actions.mjs` — Evasion split — DONE

- [x] Single Evasion Reaction replaced with separate **Dodge** (Ag-based, ranged + melee) and **Parry** (WS-based, melee only) Reactions.

### Skill list — Parry is a Reaction in RT, not a skill

- [x] Policy decision (0.5.0): **keep `parry` as a skill** for now — documented as deliberate DH2-style extension in CLAUDE.md "Documented deviations" section. Revisit during the A/B character-creation pass.

### Damage roll — DH2-specific DoS-replaces-die

- [x] Audited (0.5.0): no DoS-replaces-die rule found in `damage-data.mjs` or `weapon-prompt.mjs`. Incidental fix: Accurate now rolls 1d10 per 2 DoS (max 2d10) instead of a flat `+(dos-1)` modifier, matching RT corebook p.143.

---

## P1 — Content gaps that block play

### Psychic powers — DONE 2026-05-13

`src/packs/psychic-powers/psychic-powers.yml` rebuilt from RT Core Rulebook Ch.VI + Into the Storm + Errata v1.4. 79 entries.

- [x] Rebuild from RT Core Rulebook Ch.VI: **Telepathy, Divination, Telekinesis** (the corebook only has these 3 disciplines, NOT 5 — the earlier "Biomancy, Pyromancy" entries in this checklist were wrong; those are DH2-supplement only)
- [x] Add **Navigator powers** (corebook pp.223–234 + ItS p.189)
- [x] **Astropathic Choirs** is NOT a power — it's a relay-assistance rule (corebook p.162; Errata v1.4 raised max bonus +5→+10). The only Astropath-exclusive technique is Astral Telepathy (in Telepathy discipline).
- [x] No daemonology/chrono/void-frost imported (they're not in RT corebook or ItS)
- [x] Theosophamy discipline added (ItS p.197 — 7 sanctioned-psyker faith powers)
- [x] Errata v1.4 corrections baked into descriptions

**Remaining caveats** (see CLAUDE.md "Psychic-powers rebuild" section for full list):
- [x] Damage formulas (0.5.0): 17 attack-power entries now carry rollable formulas (`1d10+@pr`, `1d10+3*@pr`, etc.); the rest are non-damaging powers. WP-scaling powers use a `1d10` base with the WB/DoS scaling documented in description.
- [ ] Targeted re-query for Navigator XP costs (currently all `0` — RT Navigator powers tie to Lineage talents)
- [ ] Decide whether Astropath/Navigator Starship Actions belong in `psychic-powers` (current home) or a separate `ship-actions` pack

### Voidship content — DONE 2026-05-14

3 new packs built from RT-DOCS markdown (no NotebookLM needed — tabular stats live in CoreBook part 2 and ItS part 2 as proper markdown tables):

- [x] `ship-components` — 73 entries (36 essential + 18 supplemental + 14 archeotech + 5 xenotech), registered in `system.json`
- [x] `ship-weapons` — 18 entries (macrobatteries, lances, archeotech weaponry from corebook + ItS)
- [x] `ship-traits` — 34 entries (14 hull patterns + 10 Machine Spirit Oddities + 10 Past Histories)
- [x] Hull patterns embedded in `ship-traits` (no `shipHull` item type) with full stat block in description

**Caveats:**
- [ ] Multi-variant components (21 of them — e.g. Combat Bridge differs across hull sizes) have first variant's stats in fields and a "Hull-size variants:" appendix in the description. Could split into per-variant entries later for cleaner drag-and-drop installation.
- [x] Ship-weapon damage rolling (0.5.0): `damage-data.mjs` now treats shipWeapon `damage` as a modifier and rolls `1d10 + damage` per hit, matching RT corebook p.215. Schema unchanged (kept int so `calculatePenetration` still works as a numeric comparison).
- [x] Voidship critical-damage audit (0.5.0): existing `voidship-critical-damage.mjs` is a homebrew matrix, not RT 1e Table 8-12. Canonical Table 8-12 (Critical Hits + Catastrophic Damage) added to `tables` pack as two RollTables for manual GM use. Engine still uses the homebrew tables; full replacement would require rewriting `assign-damage-data.mjs` callers — deferred.
- [ ] Errata for Excess Void Armour / Overload Shield Generators / Null Bay — these named components are not present in `ship-components.yml` (they're from supplements not extracted to `RT-DOCS`). No-op for 0.5.0.

### Other un-rebuilt packs — DONE 2026-05-14

All rebuilt from RT corebook via RT-DOCS markdown:

- [x] `cybernetics` → **Bionic Replacements** + Implant Systems (25 entries from corebook p.131+)
- [x] `ammo` → 3 specialty rounds (Inferno Shells, Man-Stopper, Tempest Bolt). RT doesn't catalogue ammo as a separate category — pack is intentionally minimal.
- [x] `consumables` → drugs/stimms/recaf (21 entries from corebook Ch.V)
- [x] `tools` → general gear + clothing (47 entries from corebook Ch.V)
- [x] `weapon-mods` → weapon upgrades (33 entries; includes craftsmanship sub-entries that warrant a manual review)
- [x] `attack-specials` → 25 universal qualities from corebook + Force from ItS (26 total)
- [x] `traits` → 33 creature/character traits from corebook Ch.XIV (replaces DH2 fork content)
- [x] `aptitudes` → DROPPED (DH2-only concept, no RT 1e equivalent)
- [ ] `tables` → only 3 RollTables present; corebook is sparse but Stars of Inequity supplement has many (not available locally; would need re-extraction)

**Caveats:**
- [x] `weapon-mods` review (0.5.0): no craftsmanship sub-entries (Best/Good/Poor) found; the earlier audit concern is stale. Ammo categories (Arrows/Quarrels, Shot, Bullets, etc.) and one section header (Unusual Ammo) live in the pack — left as-is, not breaking.
- [x] ItS additions for `weapon-mods` already added (Calamity Vents, Exterminator Cartridge, Tox Dispenser per 0.4.0 commits).

### Errata sweep (Living Errata v1.4)

- [x] Ammo errata (0.5.0): Backpack Ammo Pack/Power Pack description updated per v1.4 p.135 (Las capacities split into Hellgun/Hellpistol 80 vs other Las 300; Heavy Weapon support restricted). Arms Coffer description updated per v1.4 p.143 (capacity clarified to two Basic weapons / four Pistols).
- [ ] Apply career advance table errata (talents added/removed per career schedule) — bound to A/B character-creation work.
- [x] Starship-component errata: components named in the errata (Excess Void Armour, Overload Shield Generators, Null Bay) are not present in `ship-components.yml` — they're from supplements not extracted to `RT-DOCS`. Will need a re-extraction pass before errata applies.
- [x] Talent OCR fill-in verification (0.5.0): Frenzy, Rite of Fear, Catfall, Unarmed Warrior corrected against corebook. Psy Rating, Luminen Shock, Swift Attack verified as correct. (Note: Psy Rating retains a "must purchase in sequence" line not in corebook — left as deliberate house-rule extension.)

### Three uncommitted YAML files

- [x] Committed in 0.4.0.
- [x] `npm run packs` validated round-trip cleanly (verified 0.5.0).
- [ ] Load the system in Foundry and confirm sheets render correctly with the rebuilt data — manual step, see foundrySB test environment in CLAUDE.md.

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

### Economy — Profit Factor + Acquisition Test — DONE 2026-05-14

- [x] `profitFactor` as a world setting (default 30), GM-editable in Configure Settings
- [x] `game.rt.acquisition()` opens an Acquisition Test dialog (`src/module/rules/acquisition.mjs`)
- [x] Modifier tables: Availability, Craftsmanship, Scale — RT corebook p.270
- [x] Pre-populate dialog from an item — "Acquire" button on every item sheet with availability/craftsmanship fields
- [ ] Endeavours tracker for PF awards
- [x] Removed `characteristics.influence` from `src/template.json` and the `'influence': 'Inf'` entry from `config.mjs`. Existing actors retain the field as data-flag carryover but it's no longer schema-defined.

### Aptitudes system — drop or formalize as flavor

`src/module/documents/acolyte.mjs:57` + `src/module/rules/homeworlds.mjs`/`roles.mjs`/`backgrounds.mjs` + `src/packs/aptitudes/aptitudes.yml` all reference aptitudes.

- [ ] Decide: drop entirely (Path B above), or keep as flavor (Path A — leave the field, ignore for advancement-cost logic). Document the choice in CLAUDE.md.
- [ ] If dropping: remove `aptitudes` field from talent schema (currently `aptitudes: ''` is convention) and the `aptitudes` compendium pack.

### Psychic mechanic — DONE 2026-05-14

- [x] Added `psy.strength` enum: `fettered` | `unfettered` | `push` (defaults to unfettered)
- [x] Fettered (`pr < rating`): skips Phenomena check; default PR = ⌈rating/2⌉
- [x] Unfettered (`pr === rating`): Phenomena on doubles
- [x] Push (`pr > rating`): Phenomena on any non-doubles; -10 per push point (via existing modifier formula); default PR = rating + pushCap
- [x] Push cap: Sanctioned +3, Unsanctioned +4 (PsychicRollData.pushCap getter; bound/unbound aliased)
- [x] `psy.class` converted from free-text input to select (sanctioned/unsanctioned/bound/unbound)
- [ ] Wire up `src/packs/tables/tables.yml` Psychic Phenomena and Perils of the Warp tables to auto-roll on trigger (currently just flagged in chat)

### Skill list — DH1/RT split vs DH2 consolidations

Current skill list is hybrid. For RT 1e fidelity (vs. DH2 consolidations):

- [ ] Decide policy: keep DH2-consolidated `athletics` and `stealth`, or split into RT's Climb/Swim and Concealment/Silent Move/Shadowing
- [ ] `operate` and `navigate` already use RT-style sub-specialties — leave as is
- [ ] Verify specialty lists on `commonLore`, `forbiddenLore`, `scholasticLore`, `linguistics`, `trade` against RT corebook (current entries look RT-correct already, but verify Common Lore: Tactics vs Strategy, Forbidden Lore: Archaeotech wording, etc.)

### Cleanup / polish

- [ ] Decide on `DarkHeresy*` class names — rename to `RogueTrader*` for clarity, or leave as-is (purely cosmetic)
- [ ] Add page numbers to talent `source:` fields (NotebookLM omits them; do a targeted re-query)
- [x] `weapon.special` now supports parameter values: `special.blast` etc. is `boolean | number`, where a number `>= 1` carries the quality level. 33 Blast weapons backfilled with their `(X)` radii. Existing automation reading `if (special.tearing)` still works (both `true` and any number are truthy); new automation can read the integer for parameterized qualities like Blast/Snare/Felling/Concussive/Hallucinogenic/Haywire/Toxic.
- [x] Added `protectionRating` and `overloadOn` int fields to the `armour` item type. 8 force fields in `armour.yml` backfilled with PR values from descriptions.
- [ ] Backfill non-Blast parameterized qualities (Snare, Smoke, Concussive, Toxic, etc.) — current descriptions don't carry the `(X)` values reliably; needs targeted re-extraction from RT-DOCS.
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
